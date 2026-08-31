from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class InventoryMovement(TimeStampedModel):
    """
    Append-only stock ledger. `current_stock` is NEVER a manually-editable
    field anywhere in this system — it is always the sum of these rows for
    a product (see Product.current_stock()). This is what makes stock
    numbers auditable and trustworthy, the same principle used for money.
    """
    MOVEMENT_TYPES = [
        ("OPENING", "Opening stock"),
        ("PURCHASE", "Purchase"),
        ("SALE", "Sale"),
        ("RETURN", "Return"),
        ("ADJUSTMENT", "Adjustment"),
        ("DAMAGE", "Damage"),
        ("CANCELLATION", "Cancellation reversal"),
    ]

    product = models.ForeignKey("products.Product", on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES, db_index=True)
    # Positive = stock in (purchase, opening, return, cancellation-reversal)
    # Negative = stock out (sale, damage, adjustment-down)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    reference_type = models.CharField(max_length=40, blank=True)  # e.g. "Sale", "Purchase"
    reference_id = models.CharField(max_length=40, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="stock_movements",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["product", "movement_type"])]

    def __str__(self):
        return f"{self.product.name}: {self.quantity} ({self.movement_type})"
