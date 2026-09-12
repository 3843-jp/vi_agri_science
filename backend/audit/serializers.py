from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "username", "action", "entity_type", "entity_id",
            "old_value", "new_value", "reason", "ip_address", "created_at",
        ]
        read_only_fields = fields  # audit logs are never edited via the API
