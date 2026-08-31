from decimal import Decimal
from rest_framework import serializers
from products.models import Product
from .models import Sale, SaleItem


class SaleItemInputSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(is_active=True))
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"), required=False)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"), default=0)


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = SaleItem
        fields = ["id", "product", "product_name", "quantity", "unit_price", "discount", "line_total"]


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    amount_paid = serializers.SerializerMethodField()
    outstanding = serializers.SerializerMethodField()
    # write-only input. required=False so PATCH can update non-item fields
    # (e.g. notes) without resubmitting the full item list; the view enforces
    # it's present on POST (create).
    items_input = SaleItemInputSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Sale
        fields = [
            "id", "sale_number", "customer", "customer_name", "sale_date",
            "subtotal", "discount", "total_amount", "payment_status", "status",
            "notes", "created_by", "items", "items_input", "amount_paid", "outstanding",
        ]
        read_only_fields = [
            "id", "sale_number", "sale_date", "subtotal", "total_amount",
            "payment_status", "status", "created_by",
        ]

    def validate_items_input(self, value):
        if value is not None and not value:
            raise serializers.ValidationError("A sale must contain at least one product.")
        return value

    def get_amount_paid(self, obj):
        return obj.amount_paid()

    def get_outstanding(self, obj):
        return obj.outstanding()
