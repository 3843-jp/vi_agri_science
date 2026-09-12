from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id", "name", "phone", "address", "business_name", "gst_number",
            "credit_limit", "opening_balance", "status", "created_at", "updated_at",
        ]


class CustomerDetailSerializer(CustomerSerializer):
    """Adds live-computed figures for the customer detail page — never
    stored/cached values, always fresh from Sale/Payment records."""
    total_purchases = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()

    class Meta(CustomerSerializer.Meta):
        fields = CustomerSerializer.Meta.fields + ["total_purchases", "total_paid", "outstanding_balance"]

    def get_total_purchases(self, obj):
        return obj.total_purchases()

    def get_total_paid(self, obj):
        return obj.total_paid()

    def get_outstanding_balance(self, obj):
        return obj.outstanding_balance()
