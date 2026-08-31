from decimal import Decimal
from rest_framework import serializers
from products.models import Product
from .models import Supplier, Purchase, PurchaseItem


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name", "phone", "address", "gst_number", "is_active"]


class PurchaseItemInputSerializer(serializers.Serializer):
    """Input-only shape for creating a purchase with nested items."""
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    purchase_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))


class PurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ["id", "product", "product_name", "quantity", "purchase_price", "line_total"]


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    # write-only input for creation — the backend computes total_amount, never trusts a client-sent total
    items_input = PurchaseItemInputSerializer(many=True, write_only=True)

    class Meta:
        model = Purchase
        fields = [
            "id", "supplier", "supplier_name", "invoice_reference", "purchase_date",
            "notes", "total_amount", "recorded_by", "items", "items_input", "created_at",
        ]
        read_only_fields = ["id", "total_amount", "recorded_by", "created_at"]

    def validate_items_input(self, value):
        if not value:
            raise serializers.ValidationError("A purchase must contain at least one item.")
        return value
