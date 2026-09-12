from django.db import models
from core.models import TimeStampedModel


class ProductCategory(TimeStampedModel):
    """Configurable — NOT hard-coded. Admin can add categories beyond the
    seeded Fertilizer/Insecticide/Fungicide/... starter set."""
    name = models.CharField(max_length=80, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Product categories"

    def __str__(self):
        return self.name


class Unit(TimeStampedModel):
    """Configurable unit of measure: bag, kg, litre, packet, etc."""
    name = models.CharField(max_length=30, unique=True)
    abbreviation = models.CharField(max_length=10, blank=True)

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    sku = models.CharField(max_length=40, unique=True, db_index=True)
    name = models.CharField(max_length=150, db_index=True)
    category = models.ForeignKey(ProductCategory, on_delete=models.PROTECT, related_name="products")
    brand = models.CharField(max_length=100, blank=True)
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name="products")
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    minimum_stock_level = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    supplier = models.ForeignKey(
        "purchases.Supplier", on_delete=models.SET_NULL, null=True, blank=True, related_name="products",
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["name", "sku"])]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    def current_stock(self):
        """
        Never a manually-editable field. Always the running sum of every
        InventoryMovement for this product — see Section 16 of the spec.
        """
        from inventory.models import InventoryMovement
        agg = InventoryMovement.objects.filter(product=self).aggregate(total=models.Sum("quantity"))
        return agg["total"] or 0

    def is_low_stock(self):
        return self.current_stock() <= self.minimum_stock_level
