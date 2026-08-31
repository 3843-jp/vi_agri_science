from django.contrib import admin
from .models import BusinessSettings


@admin.register(BusinessSettings)
class BusinessSettingsAdmin(admin.ModelAdmin):
    list_display = ("name", "currency", "updated_at")

    def has_add_permission(self, request):
        # Singleton — never allow creating a second row via admin either.
        return not BusinessSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
