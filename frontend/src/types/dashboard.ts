// Matches core/views.py::DashboardView.get() exactly.
export interface DashboardLowStockProduct {
  id: number
  name: string
  current_stock: number
  minimum: string
}

export interface DashboardOutOfStockProduct {
  id: number
  name: string
  minimum: string
}

export interface DashboardRecentSale {
  id: number
  sale_number: string
  customer__name: string
  total_amount: string
  payment_status: string
  sale_date: string
}

export interface DashboardRecentPayment {
  id: number
  customer__name: string
  amount: string
  method: string
  payment_date: string
}

export interface DashboardRecentPurchase {
  id: number
  supplier__name: string
  total_amount: string
  purchase_date: string
  invoice_reference: string
}

export interface DashboardRecentExpense {
  id: number
  category: string
  amount: string
  expense_date: string
  description: string
}

export interface DashboardData {
  date: string
  todays_sales: number
  payments_received: number
  pending_amount: number
  todays_expenses: number
  order_count: number
  low_stock_count: number
  out_of_stock_count: number
  low_stock_products: DashboardLowStockProduct[]
  out_of_stock_products: DashboardOutOfStockProduct[]
  recent_sales: DashboardRecentSale[]
  recent_payments: DashboardRecentPayment[]
  recent_purchases: DashboardRecentPurchase[]
  recent_expenses: DashboardRecentExpense[]
}

// Matches core/views.py::SalesReportView.get() exactly.
export interface SalesReportByDay {
  sale_date__date: string
  total: number
  orders: number
}

export interface SalesReportTopProduct {
  product__name: string
  qty_sold: number
  revenue: number
}

export interface SalesReportTopCustomer {
  customer__id: number
  customer__name: string
  total_spent: number
  order_count: number
}

export interface SalesReportData {
  total_sales: number
  total_orders: number
  items_sold: number
  average_order_value: number
  by_day: SalesReportByDay[]
  top_products: SalesReportTopProduct[]
  top_customers: SalesReportTopCustomer[]
}

// Matches core/views.py::PaymentReportView.get() exactly.
export interface PaymentReportByMethod {
  method: string
  total: number
  count: number
}

export interface PaymentReportData {
  total_collected: number
  by_method: PaymentReportByMethod[]
  outstanding: number
}

// Matches core/views.py::OutstandingReportView.get() exactly.
export interface OutstandingRow {
  customer_id: number
  customer_name: string
  phone: string
  total_sales: number
  total_paid: number
  outstanding_balance: number
  last_sale_date: string | null
  last_payment_date: string | null
}

export interface OutstandingReportData {
  count: number
  results: OutstandingRow[]
}

// Matches core/views.py::InventoryReportView.get() exactly.
export interface InventoryReportRow {
  id: number
  sku: string
  name: string
  category: string
  unit: string
  current_stock: number
  minimum_stock: string
}

export interface InventoryReportData {
  in_stock_count: number
  low_stock_count: number
  out_of_stock_count: number
  in_stock: InventoryReportRow[]
  low_stock: InventoryReportRow[]
  out_of_stock: InventoryReportRow[]
}

// Matches core/views.py::PurchaseReportView.get() exactly.
export interface PurchaseReportBySupplier {
  supplier__id: number
  supplier__name: string
  purchase_count: number
  total_value: number
}

export interface PurchaseReportData {
  total_value: number
  total_purchases: number
  by_supplier: PurchaseReportBySupplier[]
}

// Matches core/views.py::ExpenseReportView.get() exactly.
export interface ExpenseReportByCategory {
  category: string
  total: number
  count: number
}

export interface ExpenseReportByDay {
  expense_date: string
  total: number
}

export interface ExpenseReportData {
  total: number
  by_category: ExpenseReportByCategory[]
  by_day: ExpenseReportByDay[]
}

// Matches core/views.py::BusinessSummaryView.get() exactly.
export interface BusinessSummaryData {
  label: string
  note: string
  total_revenue: number
  total_collected: number
  total_expenses: number
  total_purchases: number
  net_cash_movement: number
}

// Matches core/views.py::ActivityExceptionsView.get() exactly.
export interface ActivityRow {
  id: number
  action: string
  entity_type: string
  entity_id: string
  user: string | null
  reason: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export interface ActivityData {
  count: number
  results: ActivityRow[]
}

// Matches core/views.py::BusinessSettingsView + core/serializers.py::BusinessSettingsSerializer exactly.
export interface BusinessSettings {
  name: string
  tagline: string
  address: string
  phone: string
  email: string
  gstin: string
  currency: string
  invoice_prefix: string
  default_minimum_stock: string
  updated_at: string
}
