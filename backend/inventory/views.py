from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, OuterRef, Subquery
from django.db.models.functions import Coalesce
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from accounts.permissions import HasPermissionCode
from audit.utils import log_action
from core.csv_export import csv_response
from .models import InventoryMovement
from .serializers import InventoryMovementSerializer, StockAdjustmentSerializer


class InventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only — movements are never edited or deleted after the fact
    (append-only ledger). New movements are only ever created as a
    side-effect of a Sale, Purchase, or the explicit adjustment endpoint
    below, never via a raw POST here.
    """
    queryset = InventoryMovement.objects.select_related("product", "recorded_by").all()
    serializer_class = InventoryMovementSerializer
    permission_classes = [HasPermissionCode]
    required_permission = "VIEW_INVENTORY"
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["product", "movement_type"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]


class StockAdjustmentView(APIView):
    """
    POST /api/inventory/adjust/
    The ONLY way to create a manual ADJUSTMENT/DAMAGE movement outside of a
    sale or purchase — requires ADJUST_STOCK permission and always logs an
    audit entry with the given reason, since this is the one stock change
    with no other transaction record backing it up.
    """
    permission_classes = [HasPermissionCode]
    required_permission = "ADJUST_STOCK"

    @transaction.atomic
    def post(self, request):
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        movement = InventoryMovement.objects.create(
            product=data["product"],
            movement_type="ADJUSTMENT",
            quantity=data["quantity"],
            notes=data["reason"],
            recorded_by=request.user,
        )
        log_action(
            "ADJUST_STOCK", "InventoryMovement", movement.id,
            new_value={"product": data["product"].id, "quantity": str(data["quantity"])},
            reason=data["reason"], user=request.user,
        )
        return Response(InventoryMovementSerializer(movement).data, status=status.HTTP_201_CREATED)


class InventoryExportView(APIView):
    """
    GET /api/inventory/export/ — requires EXPORT_REPORT.
    Exports the current stock snapshot (not the raw movement ledger) —
    one row per active product with its live-computed current stock,
    matching what the Inventory list page shows.
    """
    permission_classes = [HasPermissionCode]
    required_permission = "EXPORT_REPORT"

    def get(self, request):
        from products.models import Product

        stock_sq = (
            InventoryMovement.objects.filter(product=OuterRef("pk"))
            .order_by().values("product").annotate(total=Sum("quantity")).values("total")
        )
        products = Product.objects.filter(is_active=True).select_related("category", "unit").annotate(
            stock=Coalesce(Subquery(stock_sq), Decimal("0"))
        )

        def status_label(p):
            if p.stock <= 0:
                return "Out of Stock"
            if p.stock <= p.minimum_stock_level:
                return "Low Stock"
            return "In Stock"

        rows = [
            (p.sku, p.name, p.category.name, p.unit.name, p.stock, p.minimum_stock_level, status_label(p))
            for p in products
        ]
        return csv_response(
            "inventory.csv",
            ["SKU", "Product", "Category", "Unit", "Current Stock", "Minimum Stock", "Status"],
            rows,
        )
