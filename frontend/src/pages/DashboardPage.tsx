import { useEffect, useState } from 'react'
import { IndianRupee, Wallet, AlertCircle, Receipt, ShoppingBag, PackageX, PackageSearch } from 'lucide-react'
import { dashboardApi } from '../api/dashboard'
import { extractErrorMessage } from '../api/axios'
import type { DashboardData } from '../types'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { StatCard } from '../components/ui/StatCard'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setIsLoading(true)
    setError(null)
    dashboardApi
      .get()
      .then(setData)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false))
  }

  useEffect(load, [])

  if (isLoading) return <LoadingState label="Loading today's business summary…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  // Formatted in IST explicitly — the shop's business day, not the
  // viewing device's local timezone.
  const todayLabel = new Date(`${data.date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata',
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-500">{todayLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's Sales" value={formatCurrency(data.todays_sales)} icon={IndianRupee} />
        <StatCard label="Payments Received" value={formatCurrency(data.payments_received)} icon={Wallet} />
        <StatCard
          label="Outstanding Today"
          value={formatCurrency(data.pending_amount)}
          icon={AlertCircle}
          tone={data.pending_amount > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Today's Expenses" value={formatCurrency(data.todays_expenses)} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-brand-600" />
            <p className="text-sm font-semibold text-ink-900">Orders today</p>
          </div>
          <p className="text-3xl font-semibold text-ink-900">{data.order_count}</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <PackageX className="h-4 w-4 text-status-warning" />
            <p className="text-sm font-semibold text-ink-900">Low stock ({data.low_stock_count})</p>
          </div>
          {data.low_stock_products.length === 0 ? (
            <p className="text-sm text-ink-500">No low-stock products.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.low_stock_products.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{p.name}</span>
                  <span className="font-medium text-status-warning">{p.current_stock} left (min {p.minimum})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-status-danger" />
            <p className="text-sm font-semibold text-ink-900">Out of stock ({data.out_of_stock_count})</p>
          </div>
          {data.out_of_stock_products.length === 0 ? (
            <p className="text-sm text-ink-500">No products are out of stock.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.out_of_stock_products.slice(0, 5).map((p) => (
                <li key={p.id} className="text-sm text-status-danger">{p.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="mb-3 text-sm font-semibold text-ink-900">Recent sales</p>
          {data.recent_sales.length === 0 ? (
            <EmptyState title="No sales recorded today." />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {data.recent_sales.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink-900">{s.sale_number}</p>
                    <p className="text-xs text-ink-500">{s.customer__name} · {formatTime(s.sale_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-ink-900">{formatCurrency(Number(s.total_amount))}</p>
                    <p className="text-xs capitalize text-ink-500">{s.payment_status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="mb-3 text-sm font-semibold text-ink-900">Recent payments</p>
          {data.recent_payments.length === 0 ? (
            <EmptyState title="No payments recorded today." />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {data.recent_payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink-900">{p.customer__name}</p>
                    <p className="text-xs capitalize text-ink-500">{p.method} · {formatTime(p.payment_date)}</p>
                  </div>
                  <p className="font-medium text-ink-900">{formatCurrency(Number(p.amount))}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="mb-3 text-sm font-semibold text-ink-900">Recent purchases</p>
          {data.recent_purchases.length === 0 ? (
            <EmptyState title="No purchases recorded recently." />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {data.recent_purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink-900">{p.supplier__name}</p>
                    <p className="text-xs text-ink-500">{new Date(p.purchase_date).toLocaleDateString('en-IN')}{p.invoice_reference ? ` · ${p.invoice_reference}` : ''}</p>
                  </div>
                  <p className="font-medium text-ink-900">{formatCurrency(Number(p.total_amount))}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="mb-3 text-sm font-semibold text-ink-900">Recent expenses</p>
          {data.recent_expenses.length === 0 ? (
            <EmptyState title="No expenses recorded recently." />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {data.recent_expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium capitalize text-ink-900">{e.category.replace('_', ' ')}</p>
                    <p className="text-xs text-ink-500">{new Date(e.expense_date).toLocaleDateString('en-IN')}{e.description ? ` · ${e.description}` : ''}</p>
                  </div>
                  <p className="font-medium text-ink-900">{formatCurrency(Number(e.amount))}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
