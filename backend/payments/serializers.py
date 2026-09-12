from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    sale_number = serializers.CharField(source="sale.sale_number", read_only=True)
    recorded_by_username = serializers.CharField(source="recorded_by.username", read_only=True, default=None)

    class Meta:
        model = Payment
        fields = [
            "id", "sale", "sale_number", "customer", "customer_name", "amount", "method",
            "reference_number", "status", "payment_date", "recorded_by",
            "recorded_by_username", "reversal_reason",
        ]
        read_only_fields = ["id", "status", "payment_date", "recorded_by", "reversal_reason"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value

    def validate(self, attrs):
        # Deterministic duplicate-payment guard at the application layer too
        # (in addition to the DB-level unique constraint) so we can return a
        # clear message instead of a raw IntegrityError.
        ref = attrs.get("reference_number")
        if ref and Payment.objects.filter(reference_number=ref).exclude(status="reversed").exists():
            raise serializers.ValidationError(
                {"reference_number": "A payment with this reference number already exists (possible duplicate)."}
            )
        return attrs
