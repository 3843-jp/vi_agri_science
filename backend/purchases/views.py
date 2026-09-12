from decimal import Decimal
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import HasPermissionCode
from audit.utils import log_action
from inventory.models import InventoryMovement
from core.csv_export import csv_response
from .models import Supplier, Purchase, PurchaseItem
from .serializers import SupplierSerializer, PurchaseSerializer
from .filters import PurchaseFilter


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [HasPermissionCode]
    required_permission_map = {
        "GET": "VIEW_SUPPLIER", "POST": "ADD_SUPPLIER",
        "PUT": "UPDATE_SUPPLIER", "PATCH": "UPDATE_SUPPLIER", "DELETE": "UPDATE_SUPPLIER",
    }
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "phone", "gst_number"]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action("CREATE_SUPPLIER", "Supplier", instance.id, new_value=SupplierSerializer(instance).data, user=self.request.user)

    def perform_update(self, serializer):
        old = SupplierSerializer(serializer.instance).data
        instance = serializer.save()
        log_action("UPDATE_SUPPLIER", "Supplier", instance.id, old_value=old, new_value=SupplierSerializer(instance).data, user=self.request.user)

    def perform_destroy(self, instance):
        # Same soft-delete pattern as Customer/Product — never hard-delete
        # master data that historical Purchase/Product records still
        # reference. A prior version of this ViewSet had no override here,
        # meaning DELETE fell through to the default hard delete; fixed.
        instance.is_active = False
        instance.save()
        log_action("DEACTIVATE_SUPPLIER", "Supplier", instance.id, user=self.request.user)


class PurchaseViewSet(viewsets.ModelViewSet):
    """
    Creating a purchase is an all-or-nothing transaction:
    Purchase + PurchaseItems + matching InventoryMovement rows (+audit log)
    are written together, or none of them are (see Section 29 of the spec).
    """
    queryset = Purchase.objects.select_related("supplier", "recorded_by").prefetch_related("items__product").all()
    serializer_class = PurchaseSerializer
    permission_classes = [HasPermissionCode]
    required_permission_map = {
        "GET": "VIEW_PURCHASE", "POST": "ADD_PURCHASE",
    }
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = PurchaseFilter
    ordering_fields = ["purchase_date", "created_at"]
    ordering = ["-purchase_date"]
    http_method_names = ["get", "post", "head", "options"]  # purchases are not edited/deleted once recorded

    @action(detail=False, methods=["get"], url_path="export")
    def export_csv(self, request):
        """GET /api/purchases/export/?<same filters as list> — requires EXPORT_REPORT."""
        if not request.user.has_perm_code("EXPORT_REPORT"):
            return Response({"error": True, "detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        qs = self.filter_queryset(self.get_queryset())
        rows = qs.values_list(
            "purchase_date", "supplier__name", "invoice_reference", "total_amount", "recorded_by__username",
        )
        return csv_response(
            "purchases.csv",
            ["Date", "Supplier", "Invoice/Reference", "Total", "Recorded By"],
            rows,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        purchase = self._create_purchase_atomic(serializer.validated_data, request.user)
        return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def _create_purchase_atomic(self, validated_data, user):
        items_data = validated_data.pop("items_input")

        purchase = Purchase.objects.create(
            supplier=validated_data["supplier"],
            invoice_reference=validated_data.get("invoice_reference", ""),
            purchase_date=validated_data["purchase_date"],
            notes=validated_data.get("notes", ""),
            recorded_by=user,
            total_amount=Decimal("0"),
        )

        total = Decimal("0")
        for item in items_data:
            line_total = item["quantity"] * item["purchase_price"]
            total += line_total
            PurchaseItem.objects.create(
                purchase=purchase, product=item["product"],
                quantity=item["quantity"], purchase_price=item["purchase_price"],
            )
            # Purchase confirmed -> inventory increases automatically (Section 17)
            InventoryMovement.objects.create(
                product=item["product"], movement_type="PURCHASE", quantity=item["quantity"],
                reference_type="Purchase", reference_id=purchase.id, recorded_by=user,
            )

        purchase.total_amount = total
        purchase.save(update_fields=["total_amount"])

        log_action(
            "CREATE_PURCHASE", "Purchase", purchase.id,
            new_value={"supplier": purchase.supplier_id, "total_amount": str(total)},
            user=user,
        )
        return purchase
