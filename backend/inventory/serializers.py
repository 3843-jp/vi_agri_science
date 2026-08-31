from rest_framework import serializers
from products.models import Product
from .models import InventoryMovement


class InventoryMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    recorded_by_username = serializers.CharField(source="recorded_by.username", read_only=True, default=None)

    class Meta:
        model = InventoryMovement
        fields = [
            "id", "product", "product_name", "movement_type", "quantity",
            "reference_type", "reference_id", "notes", "recorded_by",
            "recorded_by_username", "created_at",
        ]
        read_only_fields = ["id", "created_at", "recorded_by", "recorded_by_username", "product_name"]


class StockAdjustmentSerializer(serializers.Serializer):
    """Used only by the manual-adjustment endpoint — every adjustment must
    carry a reason, since it's the one movement type with no automatic
    business-transaction backing it (not a sale, not a purchase)."""
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField(max_length=255)

    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError("Adjustment quantity cannot be zero.")
        return value
