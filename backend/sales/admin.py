from django.contrib import admin
from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("sale_number", "customer", "total_amount", "payment_status", "status", "sale_date")
    inlines = [SaleItemInline]
    list_filter = ("status", "payment_status")
    search_fields = ("sale_number", "customer__name")
