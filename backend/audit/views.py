from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from accounts.permissions import HasPermissionCode
from .models import AuditLog
from .serializers import AuditLogSerializer
from .filters import AuditLogFilter


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only on purpose — nobody, including Owner/Admin via the API, can
    edit or delete an audit entry. Ordinary staff cannot even view this
    (enforced via VIEW_AUDIT_LOG permission).
    """
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [HasPermissionCode]
    required_permission = "VIEW_AUDIT_LOG"
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AuditLogFilter
    search_fields = ["reason", "entity_id", "user__username"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]
