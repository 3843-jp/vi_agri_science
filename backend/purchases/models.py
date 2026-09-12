from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class Supplier(TimeStampedModel):
    name = models.CharField(max_length=150, db_index=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    gst_number = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Purchase(TimeStampedModel):
    """
    A confirmed purchase increases inventory (see PurchaseItem save logic
    in the view/service layer, which creates matching InventoryMovement
    rows inside the same DB transaction).
    """
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchases")
    invoice_reference = models.CharField(max_length=80, blank=True)
    purchase_date = models.DateField()
    notes = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="purchases_recorded",
    )

    class Meta:
        ordering = ["-purchase_date", "-created_at"]

    def __str__(self):
        return f"Purchase #{self.id} — {self.supplier.name}"


class PurchaseItem(TimeStampedModel):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("products.Product", on_delete=models.PROTECT, related_name="purchase_items")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def line_total(self):
        return self.quantity * self.purchase_price

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
