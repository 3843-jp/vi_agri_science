from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class Expense(TimeStampedModel):
    CATEGORY_CHOICES = [
        ("transport", "Transport"), ("electricity", "Electricity"), ("salary", "Salary"),
        ("rent", "Rent"), ("loading", "Loading"), ("maintenance", "Maintenance"),
        ("purchase_related", "Purchase-related"), ("miscellaneous", "Miscellaneous"),
    ]
    STATUS_CHOICES = [("active", "Active"), ("cancelled", "Cancelled")]

    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField(db_index=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="expenses_recorded",
    )

    class Meta:
        ordering = ["-expense_date"]
        indexes = [models.Index(fields=["expense_date", "category"])]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name="expense_amount_positive"),
        ]

    def __str__(self):
        return f"{self.category} — {self.amount} ({self.expense_date})"
