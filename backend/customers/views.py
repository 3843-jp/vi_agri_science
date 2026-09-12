from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import HasPermissionCode
from audit.utils import log_action
from .models import Customer
from .serializers import CustomerSerializer, CustomerDetailSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    permission_classes = [HasPermissionCode]
    required_permission_map = {
        "GET": "VIEW_CUSTOMER",
        "POST": "ADD_CUSTOMER",
        "PUT": "UPDATE_CUSTOMER",
        "PATCH": "UPDATE_CUSTOMER",
        "DELETE": "DELETE_CUSTOMER",
    }
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["name", "phone", "business_name", "gst_number"]
    ordering_fields = ["name", "created_at"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CustomerDetailSerializer
        return CustomerSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action("CREATE_CUSTOMER", "Customer", instance.id, new_value=CustomerSerializer(instance).data, user=self.request.user)

    def perform_update(self, serializer):
        old = CustomerSerializer(serializer.instance).data
        instance = serializer.save()
        log_action("UPDATE_CUSTOMER", "Customer", instance.id, old_value=old, new_value=CustomerSerializer(instance).data, user=self.request.user)

    def perform_destroy(self, instance):
        # Master data (not financial ledger) — soft delete via status is still
        # preferred so historical sales keep a valid customer reference.
        instance.status = "inactive"
        instance.save()
        log_action("DEACTIVATE_CUSTOMER", "Customer", instance.id, user=self.request.user)
