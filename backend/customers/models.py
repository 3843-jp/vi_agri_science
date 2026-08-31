from django.db import models
from core.models import TimeStampedModel


class Customer(TimeStampedModel):
    STATUS_CHOICES = [("active", "Active"), ("inactive", "Inactive")]

    name = models.CharField(max_length=150, db_index=True)
    phone = models.CharField(max_length=20, db_index=True)
    address = models.TextField(blank=True)
    business_name = models.CharField(max_length=150, blank=True)
    gst_number = models.CharField(max_length=20, blank=True)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    opening_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Amount owed at the time this customer was digitized, carried over from notebook records.",
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["name", "phone"])]

    def __str__(self):
        return f"{self.name} ({self.phone})"

    # --- Derived figures — always computed from real transactions, never stored ---
    def total_purchases(self):
        from sales.models import Sale
        agg = Sale.objects.filter(customer=self, status="confirmed").aggregate(
            total=models.Sum("total_amount")
        )
        return agg["total"] or 0

    def total_paid(self):
        from payments.models import Payment
        agg = Payment.objects.filter(sale__customer=self, status="paid").aggregate(
            total=models.Sum("amount")
        )
        return agg["total"] or 0

    def outstanding_balance(self):
        return self.opening_balance + self.total_purchases() - self.total_paid()
