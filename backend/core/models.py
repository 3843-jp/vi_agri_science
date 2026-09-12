from django.db import models


class TimeStampedModel(models.Model):
    """
    Abstract base model providing created_at / updated_at on every table.
    Every business entity inherits this so we always know when a record
    was created and last modified — required for audit and reporting.
    """
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BusinessSettings(TimeStampedModel):
    """
    Singleton row (always pk=1) holding the editable business identity and
    a small set of operational defaults. Previously this was entirely
    read-only, sourced from environment variables with no way to change it
    without a redeploy — this model replaces that for the fields that
    genuinely benefit from being owner-editable at runtime.

    Deliberately NOT included:
    - A business logo: no file/media storage is configured yet (Section
      62 of the original spec explicitly separates transactional data from
      file storage); adding an image field without real storage backing it
      would be a half-built feature.
    - A configurable timezone: Django's TIME_ZONE is a process-level
      setting baked into every date-boundary calculation across the
      dashboard and reports (see core/views.py). Making it a runtime
      database value that could silently drift from the actual configured
      timezone would risk exactly the kind of quiet reporting bug this
      project has been careful to avoid. It stays as explicit business
      configuration (Asia/Kolkata), matching Section 16's documented
      fallback for exactly this situation.
    """
    name = models.CharField(max_length=150, default="VI Agri Science")
    tagline = models.CharField(max_length=255, blank=True, default="Planting dreams, harvesting life")
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    gstin = models.CharField(max_length=20, blank=True, verbose_name="GSTIN")
    currency = models.CharField(max_length=8, default="INR")
    invoice_prefix = models.CharField(max_length=20, blank=True, default="INV")
    # A suggested default only — read by the frontend to prefill new
    # Product forms. Does not retroactively change any existing product's
    # own minimum_stock_level, and is not enforced anywhere in the backend;
    # claiming otherwise would be inventing behavior that isn't real.
    default_minimum_stock = models.DecimalField(max_digits=12, decimal_places=2, default=10)

    class Meta:
        verbose_name = "Business settings"
        verbose_name_plural = "Business settings"

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce singleton
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.name
