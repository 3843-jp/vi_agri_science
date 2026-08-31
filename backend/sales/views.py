import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import HasPermissionCode
from audit.utils import log_action
from inventory.models import InventoryMovement
from products.models import Product
from core.csv_export import csv_response
from .models import Sale, SaleItem
from .serializers import SaleSerializer
from .filters import SaleFilter


def _generate_sale_number():
    today = timezone.now().strftime("%Y%m%d")
    return f"INV-{today}-{uuid.uuid4().hex[:6].upper()}"


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related("customer", "created_by").prefetch_related("items__product").all()
    serializer_class = SaleSerializer
    permission_classes = [HasPermissionCode]
    required_permission_map = {
        "GET": "VIEW_SALE", "POST": "ADD_SALE",
        "PUT": "UPDATE_SALE", "PATCH": "UPDATE_SALE",
    }
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = SaleFilter
    ordering_fields = ["sale_date", "total_amount"]
    ordering = ["-sale_date"]
    http_method_names = ["get", "post", "patch", "head", "options"]  # no raw PUT/DELETE on financial records

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "items_input" not in serializer.validated_data:
            raise ValidationError({"items_input": "This field is required to create a sale."})
        sale = self._create_sale_atomic(serializer.validated_data, request.user)
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def _create_sale_atomic(self, validated_data, user):
        """
        Sale + SaleItems + Inventory deduction + AuditLog are written
        together, atomically. The backend computes every total itself —
        it NEVER trusts a total sent from the frontend (Section 15).

        Concurrency: every Product involved is locked with
        select_for_update() (ordered by pk to avoid deadlocks) BEFORE
        current_stock() is read, so two staff selling the last 5 bags at
        the same time can no longer both pass the stock check — the second
        transaction blocks until the first commits, then re-reads the
        now-current stock level.
        """
        items_data = validated_data.pop("items_input")

        sale = Sale.objects.create(
            sale_number=_generate_sale_number(),
            customer=validated_data["customer"],
            notes=validated_data.get("notes", ""),
            created_by=user,
        )

        product_ids = sorted({item["product"].id for item in items_data})
        locked_products = {
            p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids).order_by("id")
        }

        subtotal = Decimal("0")
        for item in items_data:
            product = locked_products[item["product"].id]
            quantity = item["quantity"]
            # unit_price defaults to the product's current selling price unless
            # explicitly overridden — but is still a server-validated decimal either way
            unit_price = item.get("unit_price") or product.selling_price
            discount = item.get("discount") or Decimal("0")
            line_total = (quantity * unit_price) - discount
            subtotal += line_total

            current_stock = product.current_stock()
            if current_stock - quantity < 0:
                raise ValidationError(
                    f"Insufficient stock for {product.name}: {current_stock} available, {quantity} requested."
                )

            SaleItem.objects.create(
                sale=sale, product=product, quantity=quantity,
                unit_price=unit_price, discount=discount,
            )
            InventoryMovement.objects.create(
                product=product, movement_type="SALE", quantity=-quantity,
                reference_type="Sale", reference_id=sale.id, recorded_by=user,
            )

        sale.subtotal = subtotal
        sale.total_amount = subtotal  # order-level discount, if any, applied via update
        sale.save(update_fields=["subtotal", "total_amount"])

        log_action(
            "CREATE_SALE", "Sale", sale.id,
            new_value={"customer": sale.customer_id, "total_amount": str(sale.total_amount)},
            user=user,
        )
        return sale

    def partial_update(self, request, *args, **kwargs):
        sale = self.get_object()
        if sale.status == "cancelled":
            return Response(
                {"error": True, "detail": "Cannot edit a cancelled sale. Create a new sale instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(sale, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        reason = request.data.get("reason", "")
        updated = self._update_sale_atomic(sale, serializer.validated_data, request.user, reason)
        return Response(SaleSerializer(updated).data)

    @transaction.atomic
    def _update_sale_atomic(self, sale, validated_data, user, reason):
        """
        Handles Section 14's exact scenario: "10 Urea -> 15 Urea".

        A sale is not one row — editing it means diffing OLD item quantities
        against NEW item quantities per product, and writing an explicit
        ADJUSTMENT InventoryMovement for exactly the difference (never
        silently overwriting SaleItem.quantity without a matching stock
        movement). The whole thing is one transaction: if the stock check
        fails partway through, everything rolls back — no inconsistent
        half-updated sale is ever left behind.

        Concurrency: the Sale row and every Product touched (union of old
        and new item products) are locked with select_for_update(), ordered
        by pk, before any stock comparison happens.
        """
        items_data = validated_data.pop("items_input", None)

        # Simple non-item field updates (e.g. notes) always apply.
        if "notes" in validated_data:
            sale.notes = validated_data["notes"]

        if items_data is None:
            sale.save()
            log_action("UPDATE_SALE", "Sale", sale.id, new_value={"notes": sale.notes}, reason=reason, user=user)
            return sale

        # Lock the sale row itself so two simultaneous edits to the SAME
        # sale can't interleave.
        sale = Sale.objects.select_for_update().get(pk=sale.pk)

        old_items = list(sale.items.select_related("product").all())
        old_qty_by_product: dict[int, Decimal] = {}
        for it in old_items:
            old_qty_by_product[it.product_id] = old_qty_by_product.get(it.product_id, Decimal("0")) + it.quantity

        new_qty_by_product: dict[int, Decimal] = {}
        new_lines = []
        for item in items_data:
            product = item["product"]
            qty = item["quantity"]
            unit_price = item.get("unit_price") or product.selling_price
            discount = item.get("discount") or Decimal("0")
            new_qty_by_product[product.id] = new_qty_by_product.get(product.id, Decimal("0")) + qty
            new_lines.append((product, qty, unit_price, discount))

        all_product_ids = sorted(set(old_qty_by_product) | set(new_qty_by_product))
        locked_products = {
            p.id: p for p in Product.objects.select_for_update().filter(id__in=all_product_ids).order_by("id")
        }

        # Validate stock BEFORE writing anything — if any product needs more
        # stock than is available, the whole edit is rejected (atomic).
        for pid in all_product_ids:
            diff = new_qty_by_product.get(pid, Decimal("0")) - old_qty_by_product.get(pid, Decimal("0"))
            if diff > 0:
                product = locked_products[pid]
                available = product.current_stock()
                if available < diff:
                    raise ValidationError(
                        f"Insufficient stock for {product.name}: {available} available, "
                        f"{diff} additional required for this edit."
                    )

        old_total = sale.total_amount

        sale.items.all().delete()
        subtotal = Decimal("0")
        for product, qty, unit_price, discount in new_lines:
            SaleItem.objects.create(sale=sale, product=product, quantity=qty, unit_price=unit_price, discount=discount)
            subtotal += (qty * unit_price) - discount

        for pid in all_product_ids:
            diff = new_qty_by_product.get(pid, Decimal("0")) - old_qty_by_product.get(pid, Decimal("0"))
            if diff != 0:
                # diff > 0 means more was sold -> stock decreases further (negative movement)
                # diff < 0 means less was sold -> stock is returned (positive movement)
                InventoryMovement.objects.create(
                    product_id=pid, movement_type="ADJUSTMENT", quantity=-diff,
                    reference_type="Sale", reference_id=sale.id, recorded_by=user,
                    notes=f"Correction to sale {sale.sale_number}" + (f": {reason}" if reason else ""),
                )

        sale.subtotal = subtotal
        sale.total_amount = subtotal
        sale.save()
        sale.recompute_payment_status()

        log_action(
            "UPDATE_SALE", "Sale", sale.id,
            old_value={"total_amount": str(old_total)},
            new_value={"total_amount": str(subtotal)},
            reason=reason, user=user,
        )
        return sale

    @action(detail=False, methods=["get"], url_path="export")
    def export_csv(self, request):
        """
        GET /api/sales/export/?<same filters as list> — requires
        EXPORT_REPORT. Honors whatever filters/search are currently
        applied (via filter_queryset), and exports EVERY matching row,
        not just the current page.
        """
        if not request.user.has_perm_code("EXPORT_REPORT"):
            return Response({"error": True, "detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        qs = self.filter_queryset(self.get_queryset())
        rows = qs.values_list(
            "sale_number", "sale_date", "customer__name", "subtotal", "discount",
            "total_amount", "payment_status", "status", "created_by__username",
        )
        return csv_response(
            "sales.csv",
            ["Sale Number", "Date", "Customer", "Subtotal", "Discount", "Total", "Payment Status", "Status", "Created By"],
            rows,
        )

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """
        POST /api/sales/{id}/cancel/  — requires CANCEL_SALE.
        Never deletes the sale. Marks it cancelled, reverses inventory with
        an explicit CANCELLATION movement, and logs the reason.
        """
        if not request.user.has_perm_code("CANCEL_SALE"):
            return Response({"error": True, "detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        sale = self.get_object()
        reason = request.data.get("reason", "")
        if sale.status == "cancelled":
            return Response({"error": True, "detail": "Sale is already cancelled."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            sale = Sale.objects.select_for_update().get(pk=sale.pk)
            for item in sale.items.all():
                InventoryMovement.objects.create(
                    product=item.product, movement_type="CANCELLATION", quantity=item.quantity,
                    reference_type="Sale", reference_id=sale.id, recorded_by=request.user,
                    notes=f"Reversal for cancelled sale {sale.sale_number}",
                )
            old_status = sale.status
            sale.status = "cancelled"
            sale.save(update_fields=["status"])
            log_action(
                "CANCEL_SALE", "Sale", sale.id,
                old_value={"status": old_status}, new_value={"status": "cancelled"}, reason=reason,
                user=request.user,
            )
        return Response(SaleSerializer(sale).data)
