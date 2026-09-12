from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from accounts.permissions import HasPermissionCode
from audit.utils import log_action
from core.csv_export import csv_response
from .models import Expense
from .serializers import ExpenseSerializer
from .filters import ExpenseFilter


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related("recorded_by").all()
    serializer_class = ExpenseSerializer
    permission_classes = [HasPermissionCode]
    required_permission_map = {
        "GET": "VIEW_EXPENSE", "POST": "ADD_EXPENSE",
        "PUT": "UPDATE_EXPENSE", "PATCH": "UPDATE_EXPENSE",
    }
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = ExpenseFilter
    ordering_fields = ["expense_date", "amount"]
    ordering = ["-expense_date"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        expense = serializer.save(recorded_by=self.request.user)
        log_action("CREATE_EXPENSE", "Expense", expense.id, new_value=ExpenseSerializer(expense).data, user=self.request.user)

    def perform_update(self, serializer):
        old = ExpenseSerializer(serializer.instance).data
        expense = serializer.save()
        log_action("UPDATE_EXPENSE", "Expense", expense.id, old_value=old, new_value=ExpenseSerializer(expense).data, user=self.request.user)

    @action(detail=False, methods=["get"], url_path="export")
    def export_csv(self, request):
        """GET /api/expenses/export/?<same filters as list> — requires EXPORT_REPORT."""
        if not request.user.has_perm_code("EXPORT_REPORT"):
            return Response({"error": True, "detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        qs = self.filter_queryset(self.get_queryset())
        rows = qs.values_list("expense_date", "category", "amount", "description", "status", "recorded_by__username")
        return csv_response(
            "expenses.csv",
            ["Date", "Category", "Amount", "Description", "Status", "Recorded By"],
            rows,
        )

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        if not request.user.has_perm_code("CANCEL_EXPENSE"):
            return Response({"error": True, "detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        expense = self.get_object()
        expense.status = "cancelled"
        expense.save(update_fields=["status"])
        log_action("CANCEL_EXPENSE", "Expense", expense.id, reason=request.data.get("reason", ""), user=request.user)
        return Response(ExpenseSerializer(expense).data)
