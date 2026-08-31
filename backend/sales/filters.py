import django_filters
from .models import Sale


class SaleFilter(django_filters.FilterSet):
    """
    Extends the plain filterset_fields list with date-range filtering.
    Sale.sale_date is a DateTimeField, so a bare field-name filter only
    supports exact match — this adds date_from/date_to (inclusive) so the
    frontend's date-range picker has something real to call.
    """
    date_from = django_filters.DateFilter(field_name="sale_date", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="sale_date", lookup_expr="date__lte")

    class Meta:
        model = Sale
        fields = ["customer", "status", "payment_status"]
