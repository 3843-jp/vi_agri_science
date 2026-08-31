import { useEffect, useState, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import { reportsApi, downloadCsv } from '../../api/dashboard'
import { extractErrorMessage } from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'
import type {
  SalesReportData, PaymentReportData, OutstandingReportData, InventoryReportData,
  PurchaseReportData, ExpenseReportData, BusinessSummaryData, ActivityData,
} from '../../types'
import { LoadingState } from '../ui/LoadingState'
import { ErrorState } from '../ui/ErrorState'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'

function fmt(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

function ExportButton({ onExport }: { onExport: () => void }) {
  const { hasPermission } = useAuth()
  if (!hasPermission('EXPORT_REPORT')) return null
  return (
    <Button variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={onExport} className="!px-3 !py-1.5 text-xs">
      Export CSV
    </Button>
  )
}

// --- Sales -----------------------------------------------------------------

export function SalesReportTab({ start, end }: { start: string; end: string }) {
  const [data, setData] = useState<SalesReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    reportsApi.sales({ start, end }).then(setData).catch((e) => setError(extractErrorMessage(e))).finally(() => setIsLoading(false))
  }, [start, end])

  if (isLoading) return <LoadingState label="Loading sales report…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExportButton onExport={() => downloadCsv('/sales/export/', { date_from: start, date_to: end })} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBox label="Total Sales" value={fmt(data.total_sales)} />
        <StatBox label="Orders" value={String(data.total_orders)} />
        <StatBox label="Items Sold" value={String(data.items_sold)} />
        <StatBox label="Avg Order Value" value={fmt(data.average_order_value)} />
      </div>
      <ReportSection title="Sales trend">
        {data.by_day.length === 0 ? <EmptyState title="No sales in this range." /> : (
          <SimpleBarList items={data.by_day.map((d) => ({ label: d.sale_date__date, value: d.total, sub: `${d.orders} orders` }))} />
        )}
      </ReportSection>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportSection title="Top products">
          {data.top_products.length === 0 ? <EmptyState title="No data." /> : (
            <SimpleBarList items={data.top_products.map((p) => ({ label: p.product__name, value: p.revenue, sub: `${p.qty_sold} sold` }))} />
          )}
        </ReportSection>
        <ReportSection title="Top customers">
          {data.top_customers.length === 0 ? <EmptyState title="No data." /> : (
            <SimpleBarList items={data.top_customers.map((c) => ({ label: c.customer__name, value: c.total_spent, sub: `${c.order_count} orders` }))} />
          )}
        </ReportSection>
      </div>
    </div>
  )
}

// --- Payments ----------------------------------------------------------------

export function PaymentReportTab({ start, end }: { start: string; end: string }) {
  const [data, setData] = useState<PaymentReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    reportsApi.payments({ start, end }).then(setData).catch((e) => setError(extractErrorMessage(e))).finally(() => setIsLoading(false))
  }, [start, end])

  if (isLoading) return <LoadingState label="Loading payment report…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExportButton onExport={() => downloadCsv('/payments/export/', { date_from: start, date_to: end })} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatBox label="Total Collected" value={fmt(data.total_collected)} />
        <StatBox label="Outstanding (all time)" value={fmt(data.outstanding)} tone={data.outstanding > 0 ? 'warning' : undefined} />
      </div>
      <ReportSection title="By payment method">
        {data.by_method.length === 0 ? <EmptyState title="No payments in this range." /> : (
          <SimpleBarList items={data.by_method.map((m) => ({ label: m.method.replace('_', ' '), value: m.total, sub: `${m.count} payments` }))} />
        )}
      </ReportSection>
    </div>
  )
}

// --- Outstanding ---------------------------------------------------------------

export function OutstandingReportTab() {
  const [data, setData] = useState<OutstandingReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    reportsApi.outstanding().then(setData).catch((e) => setError(extractErrorMessage(e))).finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <LoadingState label="Loading outstanding report…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-500">Sorted by highest outstanding first. This is a point-in-time balance, not scoped to a date range.</p>
        <ExportButton onExport={() => downloadCsv('/reports/outstanding/export/', {})} />
      </div>
      {data.results.length === 0 ? (
        <EmptyState title="No outstanding balances." description="Every active customer is fully paid up." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Total Sales</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3">Last Sale</th>
                <th className="px-4 py-3">Last Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.results.map((r) => (
                <tr key={r.customer_id}>
                  <td className="px-4 py-3 font-medium text-ink-900">{r.customer_name}<span className="ml-1.5 text-xs text-ink-500">{r.phone}</span></td>
                  <td className="px-4 py-3 text-right text-ink-700">{fmt(r.total_sales)}</td>
                  <td className="px-4 py-3 text-right text-ink-700">{fmt(r.total_paid)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-status-warning">{fmt(r.outstanding_balance)}</td>
                  <td className="px-4 py-3 text-ink-500">{r.last_sale_date ? new Date(r.last_sale_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 text-ink-500">{r.last_payment_date ? new Date(r.last_payment_date).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// --- Inventory -----------------------------------------------------------------

export function InventoryReportTab() {
  const [data, setData] = useState<InventoryReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    reportsApi.inventory().then(setData).catch((e) => setError(extractErrorMessage(e))).finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <LoadingState label="Loading inventory report…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExportButton onExport={() => downloadCsv('/inventory/export/', {})} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="In Stock" value={String(data.in_stock_count)} />
        <StatBox label="Low Stock" value={String(data.low_stock_count)} tone="warning" />
        <StatBox label="Out of Stock" value={String(data.out_of_stock_count)} tone="danger" />
      </div>
      {[
        { title: 'Low stock', rows: data.low_stock, tone: 'warning' as const },
        { title: 'Out of stock', rows: data.out_of_stock, tone: 'danger' as const },
      ].map((section) => (
        <ReportSection key={section.title} title={section.title}>
          {section.rows.length === 0 ? <EmptyState title="None." /> : (
            <ul className="flex flex-col divide-y divide-line">
              {section.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink-900">{r.name} <span className="text-xs text-ink-500">({r.sku})</span></span>
                  <span className={section.tone === 'danger' ? 'text-status-danger' : 'text-status-warning'}>
                    {r.current_stock} {r.unit} (min {r.minimum_stock})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ReportSection>
      ))}
    </div>
  )
}

// --- Purchases -----------------------------------------------------------------

export function PurchaseReportTab({ start, end }: { start: string; end: string }) {
  const [data, setData] = useState<PurchaseReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    reportsApi.purchases({ start, end }).then(setData).catch((e) => setError(extractErrorMessage(e))).finally(() => setIsLoading(false))
  }, [start, end])

  if (isLoading) return <LoadingState label="Loading purchase report…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExportButton onExport={() => downloadCsv('/purchases/export/', { date_from: start, date_to: end })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Total Purchase Value" value={fmt(data.total_value)} />
        <StatBox label="Number of Purchases" value={String(data.total_purchases)} />
      </div>
      <ReportSection title="Top suppliers">
        {data.by_supplier.length === 0 ? <EmptyState title="No purchases in this range." /> : (
          <SimpleBarList items={data.by_supplier.map((s) => ({ label: s.supplier__name, value: s.total_value, sub: `${s.purchase_count} purchases` }))} />
        )}
      </ReportSection>
    </div>
  )
}

// --- Expenses -----------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport', electricity: 'Electricity', salary: 'Salary', rent: 'Rent',
  loading: 'Loading', maintenance: 'Maintenance', purchase_related: 'Purchase-related', miscellaneous: 'Miscellaneous',
}

export function ExpenseReportTab({ start, end }: { start: string; end: string }) {
  const [data, setData] = useState<ExpenseReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    reportsApi.expenses({ start, end }).then(setData).catch((e) => setError(extractErrorMessage(e))).finally(() => setIsLoading(false))
  }, [start, end])

  if (isLoading) return <LoadingState label="Loading expense report…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExportButton onExport={() => downloadCsv('/expenses/export/', { date_from: start, date_to: end })} />
      </div>
      <StatBox label="Total Expenses" value={fmt(data.total)} />
      <ReportSection title="By category">
        {data.by_category.length === 0 ? <EmptyState title="No expenses in this range." /> : (
          <SimpleBarList items={data.by_category.map((c) => ({ label: CATEGORY_LABELS[c.category] ?? c.category, value: c.total, sub: `${c.count} entries` }))} />
        )}
      </ReportSection>
      <ReportSection title="Over time">
        {data.by_day.length === 0 ? <EmptyState title="No expenses in this range." /> : (
          <SimpleBarList items={data.by_day.map((d) => ({ label: d.expense_date, value: d.total }))} />
        )}
      </ReportSection>
    </div>
  )
}

// --- Business Summary -----------------------------------------------------------

export function BusinessSummaryTab({ start, end }: { start: string; end: string }) {
  const [data, setData] = useState<BusinessSummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    reportsApi.businessSummary({ start, end }).then(setData).catch((e) => setError(extractErrorMessage(e))).finally(() => setIsLoading(false))
  }, [start, end])

  if (isLoading) return <LoadingState label="Loading business summary…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-lime-300/20 px-4 py-3 text-sm text-ink-700">{data.note}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBox label="Revenue (Sales)" value={fmt(data.total_revenue)} />
        <StatBox label="Collected (Payments)" value={fmt(data.total_collected)} />
        <StatBox label="Expenses" value={fmt(data.total_expenses)} />
        <StatBox label="Purchases (stock cost)" value={fmt(data.total_purchases)} />
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-xs font-medium text-ink-500">Net Cash Movement</p>
        <p className={`mt-1 text-2xl font-semibold ${data.net_cash_movement >= 0 ? 'text-brand-700' : 'text-status-danger'}`}>
          {fmt(data.net_cash_movement)}
        </p>
        <p className="mt-1 text-xs text-ink-300">Collected − Expenses − Purchases</p>
      </div>
    </div>
  )
}

// --- Activity / Exceptions --------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  CANCEL_SALE: 'Sale cancelled', UPDATE_SALE: 'Sale edited', REVERSE_PAYMENT: 'Payment reversed',
  ADJUST_STOCK: 'Stock adjusted', CANCEL_EXPENSE: 'Expense cancelled',
}

export function ActivityTab({ start, end }: { start: string; end: string }) {
  const [data, setData] = useState<ActivityData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    reportsApi.activity({ start, end }).then(setData).catch((e) => setError(extractErrorMessage(e))).finally(() => setIsLoading(false))
  }, [start, end])

  if (isLoading) return <LoadingState label="Loading activity…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-500">
        Sales cancellations/edits, payment reversals, and stock adjustments — for the owner to review, not an
        accusation. Every entry shows who acted and why.
      </p>
      {data.results.length === 0 ? (
        <EmptyState title="No activity requiring review in this range." />
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-4">
          {data.results.map((a) => (
            <li key={a.id} className="py-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink-900">{ACTION_LABELS[a.action] ?? a.action} — {a.entity_type} #{a.entity_id}</p>
                <p className="text-xs text-ink-500">{new Date(a.created_at).toLocaleString('en-IN')}</p>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                By {a.user ?? 'unknown'}{a.reason ? ` — "${a.reason}"` : ' — no reason given'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// --- shared bits -----------------------------------------------------------

function StatBox({ label, value, tone }: { label: string; value: string; tone?: 'warning' | 'danger' }) {
  const toneClass = tone === 'danger' ? 'text-status-danger' : tone === 'warning' ? 'text-status-warning' : 'text-ink-900'
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="mb-3 text-sm font-semibold text-ink-900">{title}</p>
      {children}
    </div>
  )
}

function SimpleBarList({ items }: { items: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, idx) => (
        <li key={idx}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-ink-700">{item.label}{item.sub && <span className="ml-1.5 text-xs text-ink-300">{item.sub}</span>}</span>
            <span className="font-medium text-ink-900">{fmt(item.value)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
