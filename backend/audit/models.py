from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """
    Append-only. Rows are NEVER updated or deleted by application code —
    only ever inserted. This is what makes "who changed what, when"
    trustworthy: if it were editable, it couldn't be relied on as evidence.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=64, db_index=True)  # e.g. CREATE_SALE, REVERSE_PAYMENT
    entity_type = models.CharField(max_length=64, db_index=True)  # e.g. "Sale"
    entity_id = models.CharField(max_length=64, db_index=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["action", "created_at"]),
        ]

    def __str__(self):
        return f"{self.action} {self.entity_type}#{self.entity_id} by {self.user}"
