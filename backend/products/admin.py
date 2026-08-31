from django.contrib import admin
from .models import Product, ProductCategory, Unit


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("name", "abbreviation")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "category", "unit", "selling_price", "is_active")
    search_fields = ("name", "sku", "brand")
    list_filter = ("category", "is_active")
