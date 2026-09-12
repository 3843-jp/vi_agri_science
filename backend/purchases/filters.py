import django_filters
from .models import Purchase


class PurchaseFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="purchase_date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="purchase_date", lookup_expr="lte")

    class Meta:
        model = Purchase
        fields = ["supplier"]
