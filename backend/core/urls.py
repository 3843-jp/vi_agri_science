from django.urls import path
from .views import (
    BusinessSettingsView, DashboardView, SalesReportView, OutstandingReportView,
    PaymentReportView, InventoryReportView, PurchaseReportView, ExpenseReportView,
    BusinessSummaryView, ActivityExceptionsView, OutstandingExportView,
)

urlpatterns = [
    path("settings/business/", BusinessSettingsView.as_view(), name="business-settings"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("reports/sales/", SalesReportView.as_view(), name="sales-report"),
    path("reports/payments/", PaymentReportView.as_view(), name="payment-report"),
    path("reports/outstanding/", OutstandingReportView.as_view(), name="outstanding-report"),
    path("reports/outstanding/export/", OutstandingExportView.as_view(), name="outstanding-export"),
    path("reports/inventory/", InventoryReportView.as_view(), name="inventory-report"),
    path("reports/purchases/", PurchaseReportView.as_view(), name="purchase-report"),
    path("reports/expenses/", ExpenseReportView.as_view(), name="expense-report"),
    path("reports/business-summary/", BusinessSummaryView.as_view(), name="business-summary"),
    path("reports/activity/", ActivityExceptionsView.as_view(), name="activity-exceptions"),
]
