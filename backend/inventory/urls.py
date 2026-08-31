from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import InventoryMovementViewSet, StockAdjustmentView, InventoryExportView

router = DefaultRouter()
router.register("inventory-movements", InventoryMovementViewSet, basename="inventory-movement")

urlpatterns = [
    path("inventory/adjust/", StockAdjustmentView.as_view(), name="stock-adjust"),
    path("inventory/export/", InventoryExportView.as_view(), name="inventory-export"),
] + router.urls
