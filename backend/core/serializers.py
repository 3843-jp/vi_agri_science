from rest_framework import serializers
from .models import BusinessSettings


class BusinessSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessSettings
        fields = [
            "name", "tagline", "address", "phone", "email", "gstin",
            "currency", "invoice_prefix", "default_minimum_stock", "updated_at",
        ]
        read_only_fields = ["updated_at"]
