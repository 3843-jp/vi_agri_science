from rest_framework import serializers
from .models import Product, ProductCategory, Unit


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ["id", "name"]


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ["id", "name", "abbreviation"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    unit_name = serializers.CharField(source="unit.name", read_only=True)
    current_stock = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "sku", "name", "category", "category_name", "brand", "unit", "unit_name",
            "purchase_price", "selling_price", "minimum_stock_level", "supplier",
            "description", "is_active", "current_stock", "is_low_stock",
        ]

    def get_current_stock(self, obj):
        return obj.current_stock()

    def get_is_low_stock(self, obj):
        return obj.is_low_stock()

    def validate_purchase_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Purchase price cannot be negative.")
        return value

    def validate_selling_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Selling price cannot be negative.")
        return value
