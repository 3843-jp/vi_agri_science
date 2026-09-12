from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class Payment(TimeStampedModel):
    METHOD_CHOICES = [
        ("cash", "Cash"), ("upi", "UPI"), ("bank_transfer", "Bank Transfer"),
        ("card", "Card"), ("credit", "Credit"), ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"), ("paid", "Paid"), ("partial", "Partial"),
        ("failed", "Failed"), ("reversed", "Reversed"),
    ]

    sale = models.ForeignKey("sales.Sale", on_delete=models.PROTECT, related_name="payments")
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    # Unique where present — this is the deterministic duplicate-payment guard
    # from the reconciliation design: the DB itself refuses a second row with
    # the same transaction/reference id.
    reference_number = models.CharField(max_length=100, blank=True, null=True, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="paid")
    payment_date = models.DateTimeField(auto_now_add=True, db_index=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="payments_recorded",
    )
    reversal_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-payment_date"]
        indexes = [models.Index(fields=["payment_date", "status"])]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name="payment_amount_positive"),
        ]

    def __str__(self):
        return f"Payment {self.id} — {self.amount} ({self.status})"
