from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from accounts.permissions import HasPermissionCode
from audit.utils import log_action
from sales.models import Sale
from core.csv_export import csv_response
from .models import Payment
from .serializers import PaymentSerializer
from .filters import PaymentFilter


class PaymentViewSet(viewsets.ModelViewSet):
    """
    Payment confirmation is always deterministic here: whoever records it
    (staff, or later a payment-gateway webhook) provides amount + method +
    reference; AI plays no role in deciding whether money arrived
    (Section 18 — this is a hard architecture constraint, not a preference).
    """
    queryset = Payment.objects.select_related("sale", "customer", "recorded_by").all()
    serializer_class = PaymentSerializer
    permission_classes = [HasPermissionCode]
    required_permission_map = {
        "GET": "VIEW_PAYMENT", "POST": "ADD_PAYMENT",
        "PUT": "UPDATE_PAYMENT", "PATCH": "UPDATE_PAYMENT",
    }
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = PaymentFilter
    ordering_fields = ["payment_date", "amount"]
    ordering = ["-payment_date"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    @transaction.atomic
    def perform_create(self, serializer):
        # Lock the parent Sale row for the duration of this transaction so
        # two payments recorded on the same sale at nearly the same instant
        # can't both read a stale amount_paid() and race on
        # recompute_payment_status() — the second payment's transaction
        # blocks until the first commits, then recomputes from the
        # now-current total.
        sale = Sale.objects.select_for_update().get(pk=serializer.validated_data["sale"].pk)
        payment = serializer.save(recorded_by=self.request.user, status="paid")
        sale.recompute_payment_status()
        log_action(
            "CREATE_PAYMENT", "Payment", payment.id,
            new_value={"sale": payment.sale_id, "amount": str(payment.amount), "method": payment.method},
            user=self.request.user,
        )

    @action(detail=False, methods=["get"], url_path="export")
    def export_csv(self, request):
        """GET /api/payments/export/?<same filters as list> — requires EXPORT_REPORT."""
        if not request.user.has_perm_code("EXPORT_REPORT"):
            return Response({"error": True, "detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        qs = self.filter_queryset(self.get_queryset())
        rows = qs.values_list(
            "payment_date", "customer__name", "sale__sale_number", "amount",
            "method", "reference_number", "status", "recorded_by__username",
        )
        return csv_response(
            "payments.csv",
            ["Date", "Customer", "Sale Number", "Amount", "Method", "Reference", "Status", "Recorded By"],
            rows,
        )

    @action(detail=True, methods=["post"], url_path="reverse")
    def reverse(self, request, pk=None):
        """
        POST /api/payments/{id}/reverse/ — requires REVERSE_PAYMENT.
        Never deletes the payment row; flips status to 'reversed' (excluded
        from amount_paid() aggregation) and requires a reason, fully audited.
        """
        if not request.user.has_perm_code("REVERSE_PAYMENT"):
            return Response({"error": True, "detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        payment = self.get_object()
        reason = request.data.get("reason", "")
        if not reason:
            return Response({"error": True, "detail": "A reason is required to reverse a payment."}, status=400)
        if payment.status == "reversed":
            return Response({"error": True, "detail": "Payment already reversed."}, status=400)

        with transaction.atomic():
            sale = Sale.objects.select_for_update().get(pk=payment.sale_id)
            old_status = payment.status
            payment.status = "reversed"
            payment.reversal_reason = reason
            payment.save(update_fields=["status", "reversal_reason"])
            sale.recompute_payment_status()
            log_action(
                "REVERSE_PAYMENT", "Payment", payment.id,
                old_value={"status": old_status}, new_value={"status": "reversed"}, reason=reason,
                user=request.user,
            )
        return Response(PaymentSerializer(payment).data)
