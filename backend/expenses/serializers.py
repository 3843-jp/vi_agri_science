from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    recorded_by_username = serializers.CharField(source="recorded_by.username", read_only=True, default=None)

    class Meta:
        model = Expense
        fields = [
            "id", "category", "amount", "expense_date", "description",
            "status", "recorded_by", "recorded_by_username",
        ]
        read_only_fields = ["id", "status", "recorded_by"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expense amount must be greater than zero.")
        return value
