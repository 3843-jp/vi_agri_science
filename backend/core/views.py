from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum, Count, F, Q, Subquery, OuterRef
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import HasPermissionCode
from audit.utils import log_action
from sales.models import Sale, SaleItem
from payments.models import Payment
from expenses.models import Expense
from products.models import Product
from inventory.models import InventoryMovement
from purchases.models import Purchase
from .models import BusinessSettings
from .serializers import BusinessSettingsSerializer


class BusinessSettingsView(APIView):
    """
    GET /api/settings/business/ — any authenticated user (business
    name/tagline/address are shown in the UI shell, not sensitive).
    PATCH /api/settings/business/ — requires MANAGE_SETTINGS. Backed by a
    real persisted singleton row (BusinessSettings), not environment
    variables — the old env-var-only version had no update path at all.
    Every change is audited with old/new values.
    """
    required_permission_map = {"PATCH": "MANAGE_SETTINGS"}

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsAuthenticated(), HasPermissionCode()]
        return [IsAuthenticated()]

    def get(self, request):
        obj = BusinessSettings.load()
        return Response(BusinessSettingsSerializer(obj).data)

    def patch(self, request):
        obj = BusinessSettings.load()
        old = BusinessSettingsSerializer(obj).data
        serializer = BusinessSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        new = BusinessSettingsSerializer(obj).data
        log_action(
            "UPDATE_BUSINESS_SETTINGS", "BusinessSettings", obj.pk,
            old_value=old, new_value=new, user=request.user,
        )
        return Response(new)


class DashboardView(APIView):
    """
    GET /api/dashboard/?date=YYYY-MM-DD
    Every figure here is a live SUM/COUNT over transactional tables for the
    requested date (default: today, in the business's Asia/Kolkata
    timezone — see settings.TIME_ZONE / USE_TZ). Nothing is a manually
    maintained running total.

    Stock-status counts (in/low/out) are computed via a single annotated
    query rather than a per-product Python loop calling current_stock()
    (that was an N+1 pattern — fine at a handful of products, but at
    hundreds/thousands it turns one dashboard load into that many extra
    queries).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        target_date = request.query_params.get("date")
        if target_date:
            day = timezone.datetime.fromisoformat(target_date).date()
        else:
            day = timezone.localdate()  # resolves in Asia/Kolkata per TIME_ZONE

        sales_qs = Sale.objects.filter(sale_date__date=day, status="confirmed")
        todays_sales = sales_qs.aggregate(total=Sum("total_amount"))["total"] or 0
        order_count = sales_qs.count()

        payments_qs = Payment.objects.filter(payment_date__date=day, status="paid")
        payments_received = payments_qs.aggregate(total=Sum("amount"))["total"] or 0

        expenses_qs = Expense.objects.filter(expense_date=day, status="active")
        todays_expenses = expenses_qs.aggregate(total=Sum("amount"))["total"] or 0

        pending_amount = todays_sales - payments_received
        if pending_amount < 0:
            pending_amount = 0

        stock_sq = (
            InventoryMovement.objects.filter(product=OuterRef("pk"))
            .order_by().values("product").annotate(total=Sum("quantity")).values("total")
        )
        products_with_stock = Product.objects.filter(is_active=True).annotate(
            stock=Coalesce(Subquery(stock_sq), Decimal("0"))
        )
        low_stock_products = [p for p in products_with_stock if 0 < p.stock <= p.minimum_stock_level]
        out_of_stock_products = [p for p in products_with_stock if p.stock <= 0]

        recent_sales = list(
            Sale.objects.filter(status="confirmed").select_related("customer")
            .order_by("-sale_date")[:5]
            .values("id", "sale_number", "customer__name", "total_amount", "payment_status", "sale_date")
        )
        recent_payments = list(
            Payment.objects.filter(status="paid").select_related("customer")
            .order_by("-payment_date")[:5]
            .values("id", "customer__name", "amount", "method", "payment_date")
        )
        recent_purchases = list(
            Purchase.objects.select_related("supplier")
            .order_by("-purchase_date", "-created_at")[:5]
            .values("id", "supplier__name", "total_amount", "purchase_date", "invoice_reference")
        )
        recent_expenses = list(
            Expense.objects.filter(status="active").order_by("-expense_date", "-created_at")[:5]
            .values("id", "category", "amount", "expense_date", "description")
        )

        return Response({
            "date": str(day),
            "todays_sales": todays_sales,
            "payments_received": payments_received,
            "pending_amount": pending_amount,
            "todays_expenses": todays_expenses,
            "order_count": order_count,
            "low_stock_count": len(low_stock_products),
            "out_of_stock_count": len(out_of_stock_products),
            "low_stock_products": [
                {"id": p.id, "name": p.name, "current_stock": p.stock, "minimum": p.minimum_stock_level}
                for p in low_stock_products
            ],
            "out_of_stock_products": [
                {"id": p.id, "name": p.name, "minimum": p.minimum_stock_level} for p in out_of_stock_products
            ],
            "recent_sales": recent_sales,
            "recent_payments": recent_payments,
            "recent_purchases": recent_purchases,
            "recent_expenses": recent_expenses,
        })


class SalesReportView(APIView):
    """
    GET /api/reports/sales/?start=YYYY-MM-DD&end=YYYY-MM-DD&customer=&product=
    Supports daily/weekly/monthly/custom-range simply by varying the date
    filters the frontend sends — no separate endpoints per period, per the
    "one timestamp, many ways to slice it" pattern.
    """
    permission_classes = [HasPermissionCode]
    required_permission = "VIEW_REPORT"

    def get(self, request):
        qs = Sale.objects.filter(status="confirmed")

        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if start:
            qs = qs.filter(sale_date__date__gte=start)
        if end:
            qs = qs.filter(sale_date__date__lte=end)

        customer_id = request.query_params.get("customer")
        if customer_id:
            qs = qs.filter(customer_id=customer_id)

        totals = qs.aggregate(total_sales=Sum("total_amount"), total_orders=Count("id"))
        total_sales = totals["total_sales"] or 0
        total_orders = totals["total_orders"] or 0
        average_order_value = (total_sales / total_orders) if total_orders else 0

        items_sold = SaleItem.objects.filter(sale__in=qs).aggregate(total=Sum("quantity"))["total"] or 0

        by_day = list(
            qs.values("sale_date__date").annotate(total=Sum("total_amount"), orders=Count("id"))
            .order_by("sale_date__date")
        )

        top_products = list(
            SaleItem.objects.filter(sale__in=qs)
            .values("product__name")
            .annotate(qty_sold=Sum("quantity"), revenue=Sum(F("quantity") * F("unit_price") - F("discount")))
            .order_by("-revenue")[:10]
        )

        top_customers = list(
            qs.values("customer__id", "customer__name")
            .annotate(total_spent=Sum("total_amount"), order_count=Count("id"))
            .order_by("-total_spent")[:10]
        )

        return Response({
            "total_sales": total_sales,
            "total_orders": total_orders,
            "items_sold": items_sold,
            "average_order_value": average_order_value,
            "by_day": by_day,
            "top_products": top_products,
            "top_customers": top_customers,
        })


class PaymentReportView(APIView):
    """
    GET /api/reports/payments/?start=&end=
    Total collected and a breakdown by method — computed strictly from
    actual Payment records (status="paid"), never inferred from Sale
    totals, per the explicit requirement that payment confirmation is
    never guessed at.
    """
    permission_classes = [HasPermissionCode]
    required_permission = "VIEW_REPORT"

    def get(self, request):
        qs = Payment.objects.filter(status="paid")
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if start:
            qs = qs.filter(payment_date__date__gte=start)
        if end:
            qs = qs.filter(payment_date__date__lte=end)

        total_collected = qs.aggregate(total=Sum("amount"))["total"] or 0

        by_method = list(
            qs.values("method").annotate(total=Sum("amount"), count=Count("id")).order_by("-total")
        )

        # Outstanding is a point-in-time balance sheet figure, not scoped to
        # the date range above (an old unpaid sale is still outstanding
        # today regardless of the report's date filter) — computed the
        # same way as OutstandingReportView, just summed rather than listed.
        outstanding_total = Sale.objects.filter(status="confirmed").aggregate(
            total=Sum("total_amount")
        )["total"] or 0
        paid_total_all_time = Payment.objects.filter(status="paid").aggregate(
            total=Sum("amount")
        )["total"] or 0
        outstanding = outstanding_total - paid_total_all_time

        return Response({
            "total_collected": total_collected,
            "by_method": by_method,
            "outstanding": outstanding if outstanding > 0 else 0,
        })


class InventoryReportView(APIView):
    """
    GET /api/reports/inventory/
    In Stock / Low Stock / Out of Stock, computed via a single annotated
    query (same Subquery pattern as the dashboard fix) rather than a
    per-product Python loop.
    """
    permission_classes = [HasPermissionCode]
    required_permission = "VIEW_REPORT"

    def get(self, request):
        stock_sq = (
            InventoryMovement.objects.filter(product=OuterRef("pk"))
            .order_by().values("product").annotate(total=Sum("quantity")).values("total")
        )
        products = Product.objects.filter(is_active=True).select_related("category", "unit").annotate(
            stock=Coalesce(Subquery(stock_sq), Decimal("0"))
        )

        in_stock, low_stock, out_of_stock = [], [], []
        for p in products:
            row = {
                "id": p.id, "sku": p.sku, "name": p.name, "category": p.category.name,
                "unit": p.unit.name, "current_stock": p.stock, "minimum_stock": p.minimum_stock_level,
            }
            if p.stock <= 0:
                out_of_stock.append(row)
            elif p.stock <= p.minimum_stock_level:
                low_stock.append(row)
            else:
                in_stock.append(row)

        return Response({
            "in_stock_count": len(in_stock),
            "low_stock_count": len(low_stock),
            "out_of_stock_count": len(out_of_stock),
            "in_stock": in_stock,
            "low_stock": low_stock,
            "out_of_stock": out_of_stock,
        })


class PurchaseReportView(APIView):
    """GET /api/reports/purchases/?start=&end= — purchase totals by supplier."""
    permission_classes = [HasPermissionCode]
    required_permission = "VIEW_REPORT"

    def get(self, request):
        qs = Purchase.objects.all()
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if start:
            qs = qs.filter(purchase_date__gte=start)
        if end:
            qs = qs.filter(purchase_date__lte=end)

        totals = qs.aggregate(total_value=Sum("total_amount"), total_purchases=Count("id"))

        by_supplier = list(
            qs.values("supplier__id", "supplier__name")
            .annotate(purchase_count=Count("id"), total_value=Sum("total_amount"))
            .order_by("-total_value")
        )

        return Response({
            "total_value": totals["total_value"] or 0,
            "total_purchases": totals["total_purchases"] or 0,
            "by_supplier": by_supplier,
        })


class ExpenseReportView(APIView):
    """GET /api/reports/expenses/?start=&end= — totals, by-category, and a daily trend."""
    permission_classes = [HasPermissionCode]
    required_permission = "VIEW_REPORT"

    def get(self, request):
        qs = Expense.objects.filter(status="active")
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if start:
            qs = qs.filter(expense_date__gte=start)
        if end:
            qs = qs.filter(expense_date__lte=end)

        total = qs.aggregate(total=Sum("amount"))["total"] or 0

        by_category = list(
            qs.values("category").annotate(total=Sum("amount"), count=Count("id")).order_by("-total")
        )

        by_day = list(
            qs.values("expense_date").annotate(total=Sum("amount")).order_by("expense_date")
        )

        return Response({"total": total, "by_category": by_category, "by_day": by_day})


class BusinessSummaryView(APIView):
    """
    GET /api/reports/business-summary/?start=&end=

    Deliberately NOT called "Profit". Product.purchase_price is a mutable,
    current-snapshot field — it is overwritten whenever a product's price
    changes, and no per-sale-item historical cost is recorded anywhere in
    this system. Multiplying today's purchase_price by units sold in a
    past date range would produce a plausible-looking but not-actually-
    correct Cost of Goods Sold figure, which would make any "profit"
    number built on it misleading rather than merely approximate.

    Until COGS is tracked at the point of sale (e.g. a cost_price snapshot
    on SaleItem), this endpoint only reports raw, directly-recorded cash
    movements — each one a straightforward SUM() with no inference layer.
    """
    permission_classes = [HasPermissionCode]
    required_permission = "VIEW_REPORT"

    def get(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        sales_qs = Sale.objects.filter(status="confirmed")
        payments_qs = Payment.objects.filter(status="paid")
        expenses_qs = Expense.objects.filter(status="active")
        purchases_qs = Purchase.objects.all()

        if start:
            sales_qs = sales_qs.filter(sale_date__date__gte=start)
            payments_qs = payments_qs.filter(payment_date__date__gte=start)
            expenses_qs = expenses_qs.filter(expense_date__gte=start)
            purchases_qs = purchases_qs.filter(purchase_date__gte=start)
        if end:
            sales_qs = sales_qs.filter(sale_date__date__lte=end)
            payments_qs = payments_qs.filter(payment_date__date__lte=end)
            expenses_qs = expenses_qs.filter(expense_date__lte=end)
            purchases_qs = purchases_qs.filter(purchase_date__lte=end)

        total_revenue = sales_qs.aggregate(t=Sum("total_amount"))["t"] or 0
        total_collected = payments_qs.aggregate(t=Sum("amount"))["t"] or 0
        total_expenses = expenses_qs.aggregate(t=Sum("amount"))["t"] or 0
        total_purchases = purchases_qs.aggregate(t=Sum("total_amount"))["t"] or 0
        net_cash_movement = total_collected - total_expenses - total_purchases

        return Response({
            "label": "Business Transaction Summary",
            "note": (
                "This is not a profit/loss statement. Gross profit would require a "
                "reliable historical cost-of-goods-sold figure, which this system does "
                "not currently track per sale — Product purchase prices are a current "
                "snapshot, not a per-transaction historical cost. These are raw, "
                "directly-recorded totals only."
            ),
            "total_revenue": total_revenue,
            "total_collected": total_collected,
            "total_expenses": total_expenses,
            "total_purchases": total_purchases,
            "net_cash_movement": net_cash_movement,
        })


class ActivityExceptionsView(APIView):
    """
    GET /api/reports/activity/?user=&action=&start=&end=
    Surfaces the audit-log entries an owner would actually want to review:
    cancellations, edits, reversals, and manual stock adjustments. This is
    explicitly a review aid, not a fraud detector — it makes unusual
    activity visible for a human to investigate, with no automated
    accusation attached.
    """
    permission_classes = [HasPermissionCode]
    required_permission = "VIEW_AUDIT_LOG"

    REVIEW_ACTIONS = ["CANCEL_SALE", "UPDATE_SALE", "REVERSE_PAYMENT", "ADJUST_STOCK", "CANCEL_EXPENSE"]

    def get(self, request):
        from audit.models import AuditLog

        qs = AuditLog.objects.filter(action__in=self.REVIEW_ACTIONS).select_related("user")

        user_id = request.query_params.get("user")
        action_filter = request.query_params.get("action")
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if user_id:
            qs = qs.filter(user_id=user_id)
        if action_filter:
            qs = qs.filter(action=action_filter)
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)

        qs = qs.order_by("-created_at")[:200]  # a review feed, not a full paginated table

        rows = [
            {
                "id": a.id, "action": a.action, "entity_type": a.entity_type, "entity_id": a.entity_id,
                "user": a.user.username if a.user else None, "reason": a.reason,
                "old_value": a.old_value, "new_value": a.new_value, "created_at": a.created_at,
            }
            for a in qs
        ]
        return Response({"count": len(rows), "results": rows})


class OutstandingExportView(APIView):
    """GET /api/reports/outstanding/export/ — CSV, requires EXPORT_REPORT."""
    permission_classes = [HasPermissionCode]
    required_permission = "EXPORT_REPORT"

    def get(self, request):
        data = OutstandingReportView().get(request).data
        rows = [
            (r["customer_name"], r["phone"], r["total_sales"], r["total_paid"], r["outstanding_balance"])
            for r in data["results"]
        ]
        from core.csv_export import csv_response
        return csv_response(
            "outstanding.csv",
            ["Customer", "Phone", "Total Sales", "Total Paid", "Outstanding"],
            rows,
        )


class OutstandingReportView(APIView):
    """
    GET /api/reports/outstanding/
    Per-customer outstanding balance. Rewritten to use database-side
    aggregation instead of a Python loop calling
    Customer.outstanding_balance() per row (which was an N+1 query
    pattern — 1 query per customer for purchases, another for payments;
    at 1,000+ customers that's 2,000+ queries per request). This version
    issues a small, constant number of queries regardless of customer
    count.

    IMPORTANT: total_sales and total_paid are computed as separate
    Subquery aggregates rather than two Sum()s in one annotate() call.
    Annotating Sum() over two different reverse-FK relations (sales AND
    payments) in a single query causes Django to JOIN both relations,
    which fans out into a cartesian product and silently inflates both
    sums whenever a customer has more than one sale AND more than one
    payment. Subquery avoids this entirely — each aggregate is computed
    in its own isolated query.
    """
    permission_classes = [HasPermissionCode]
    required_permission = "VIEW_REPORT"

    def get(self, request):
        from customers.models import Customer
        from sales.models import Sale
        from payments.models import Payment

        sales_sq = (
            Sale.objects.filter(customer=OuterRef("pk"), status="confirmed")
            .order_by().values("customer")
            .annotate(total=Sum("total_amount")).values("total")
        )
        paid_sq = (
            Payment.objects.filter(customer=OuterRef("pk"), status="paid")
            .order_by().values("customer")
            .annotate(total=Sum("amount")).values("total")
        )
        last_sale_sq = (
            Sale.objects.filter(customer=OuterRef("pk"), status="confirmed")
            .order_by("-sale_date").values("sale_date")[:1]
        )
        last_payment_sq = (
            Payment.objects.filter(customer=OuterRef("pk"), status="paid")
            .order_by("-payment_date").values("payment_date")[:1]
        )

        customers = Customer.objects.filter(status="active").annotate(
            total_sales=Coalesce(Subquery(sales_sq), Decimal("0")),
            total_paid_agg=Coalesce(Subquery(paid_sq), Decimal("0")),
            last_sale_date=Subquery(last_sale_sq),
            last_payment_date=Subquery(last_payment_sq),
        )

        rows = []
        for c in customers:
            outstanding = c.opening_balance + c.total_sales - c.total_paid_agg
            if outstanding > 0:
                rows.append({
                    "customer_id": c.id,
                    "customer_name": c.name,
                    "phone": c.phone,
                    "total_sales": c.total_sales,
                    "total_paid": c.total_paid_agg,
                    "outstanding_balance": outstanding,
                    "last_sale_date": c.last_sale_date,
                    "last_payment_date": c.last_payment_date,
                })
        rows.sort(key=lambda r: r["outstanding_balance"], reverse=True)
        return Response({"count": len(rows), "results": rows})
