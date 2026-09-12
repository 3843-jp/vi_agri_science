from django.contrib import admin
from .models import Supplier, Purchase, PurchaseItem


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "is_active")
    search_fields = ("name", "phone")


class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 0


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ("id", "supplier", "purchase_date", "total_amount")
    inlines = [PurchaseItemInline]
    list_filter = ("supplier",)
