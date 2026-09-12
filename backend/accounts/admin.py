from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Role, Permission, RolePermission


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "is_active_employee", "is_staff")
    fieldsets = UserAdmin.fieldsets + (
        ("Business role", {"fields": ("role", "phone", "is_active_employee")}),
    )


class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 0


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "is_system_role")
    inlines = [RolePermissionInline]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("codename", "description")
    search_fields = ("codename",)


admin.site.register(RolePermission)
