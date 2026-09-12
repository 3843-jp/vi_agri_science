from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "business_name", "status", "created_at")
    search_fields = ("name", "phone", "business_name", "gst_number")
    list_filter = ("status",)
