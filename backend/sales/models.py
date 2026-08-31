from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class Sale(TimeStampedModel):
    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
    ]
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partial"),
        ("paid", "Paid"),
        ("overpaid", "Overpaid"),
        ("failed", "Failed"),
        ("reversed", "Reversed"),
    ]

    sale_number = models.CharField(max_length=30, unique=True, db_index=True)
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="sales")
    sale_date = models.DateTimeField(auto_now_add=True, db_index=True)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default="pending")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="confirmed")
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="sales_created",
    )

    class Meta:
        ordering = ["-sale_date"]
        indexes = [models.Index(fields=["sale_date", "status"])]

    def __str__(self):
        return f"Sale {self.sale_number}"

    def amount_paid(self):
        from payments.models import Payment
        agg = Payment.objects.filter(sale=self, status="paid").aggregate(total=models.Sum("amount"))
        return agg["total"] or 0

    def outstanding(self):
        return self.total_amount - self.amount_paid()

    def recompute_payment_status(self):
        """Deterministic reconciliation status — no AI, just arithmetic
        comparing amount_paid() against total_amount. Overpayment is its
        own visible status (not silently folded into "paid") so the owner
        can see and act on a customer credit balance rather than it being
        invisible in the data."""
        paid = self.amount_paid()
        if paid <= 0:
            self.payment_status = "pending"
        elif paid < self.total_amount:
            self.payment_status = "partial"
        elif paid == self.total_amount:
            self.payment_status = "paid"
        else:
            self.payment_status = "overpaid"
        self.save(update_fields=["payment_status"])


class SaleItem(TimeStampedModel):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("products.Product", on_delete=models.PROTECT, related_name="sale_items")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    @property
    def line_total(self):
        return (self.quantity * self.unit_price) - self.discount

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
