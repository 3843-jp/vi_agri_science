from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import HasPermissionCode
from audit.utils import log_action
from .models import Product, ProductCategory, Unit
from .serializers import ProductSerializer, ProductCategorySerializer, UnitSerializer


class ProductCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [HasPermissionCode]
    required_permission_map = {
        "GET": "VIEW_PRODUCT", "POST": "ADD_PRODUCT",
        "PUT": "UPDATE_PRODUCT", "PATCH": "UPDATE_PRODUCT", "DELETE": "DELETE_PRODUCT",
    }


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [HasPermissionCode]
    required_permission_map = {
        "GET": "VIEW_PRODUCT", "POST": "ADD_PRODUCT",
        "PUT": "UPDATE_PRODUCT", "PATCH": "UPDATE_PRODUCT", "DELETE": "DELETE_PRODUCT",
    }


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category", "unit", "supplier").all()
    serializer_class = ProductSerializer
    permission_classes = [HasPermissionCode]
    required_permission_map = {
        "GET": "VIEW_PRODUCT", "POST": "ADD_PRODUCT",
        "PUT": "UPDATE_PRODUCT", "PATCH": "UPDATE_PRODUCT", "DELETE": "DELETE_PRODUCT",
    }
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "is_active", "supplier"]
    search_fields = ["name", "sku", "brand"]
    ordering_fields = ["name", "selling_price", "created_at"]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action("CREATE_PRODUCT", "Product", instance.id, new_value=ProductSerializer(instance).data, user=self.request.user)
        # Opening stock, if provided via request, is created as an explicit
        # OPENING movement rather than a raw stock field — see inventory app.
        opening_qty = self.request.data.get("opening_stock")
        if opening_qty:
            from inventory.models import InventoryMovement
            InventoryMovement.objects.create(
                product=instance, movement_type="OPENING", quantity=opening_qty,
                recorded_by=self.request.user, notes="Initial stock on product creation",
            )

    def perform_update(self, serializer):
        old = ProductSerializer(serializer.instance).data
        instance = serializer.save()
        log_action("UPDATE_PRODUCT", "Product", instance.id, old_value=old, new_value=ProductSerializer(instance).data, user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        log_action("DEACTIVATE_PRODUCT", "Product", instance.id, user=self.request.user)
