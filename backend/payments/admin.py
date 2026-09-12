from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "sale", "customer", "amount", "method", "status", "payment_date")
    list_filter = ("status", "method")
    search_fields = ("reference_number", "customer__name")
