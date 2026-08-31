from django.contrib import admin
from .models import InventoryMovement


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = ("product", "movement_type", "quantity", "created_at")
    list_filter = ("movement_type",)
    search_fields = ("product__name",)
