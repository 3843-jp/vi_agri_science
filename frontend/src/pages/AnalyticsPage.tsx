import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts'
import { reportsApi } from '../api/dashboard'
import { extractErrorMessage } from '../api/axios'
import type { SalesReportData, ExpenseReportData } from '../types'
import { PageHeader } from '../components/ui/StatusBadge'
import { DateRangePresetPicker } from '../components/reports/DateRangePresetPicker'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'

function fmt(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport', electricity: 'Electricity', salary: 'Salary', rent: 'Rent',
  loading: 'Loading', maintenance: 'Maintenance', purchase_related: 'Purchase', miscellaneous: 'Misc',
}

export function AnalyticsPage() {
  const [range, setRange] = useState<{ start: string; end: string } | null>(null)
  const [sales, setSales] = useState<SalesReportData | null>(null)
  const [expenses, setExpenses] = useState<ExpenseReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!range) return
    setIsLoading(true)
    setError(null)
    Promise.all([reportsApi.sales(range), reportsApi.expenses(range)])
      .then(([s, e]) => { setSales(s); setExpenses(e) })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false))
  }, [range])

  return (
    <div>
      <PageHeader title="Analytics" />
      <div className="mb-5">
        <DateRangePresetPicker onChange={setRange} />
      </div>

      {isLoading ? (
        <LoadingState label="Loading analytics…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : !sales || !expenses ? null : (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="mb-4 text-sm font-semibold text-ink-900">Sales trend</p>
            {sales.by_day.length === 0 ? (
              <EmptyState title="No sales in this range." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={sales.by_day.map((d) => ({ date: d.sale_date__date.slice(5), total: d.total }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-ink-500)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-500)' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13 }} />
                  <Line type="monotone" dataKey="total" stroke="var(--color-brand-600)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="mb-4 text-sm font-semibold text-ink-900">Top products by revenue</p>
              {sales.top_products.length === 0 ? (
                <EmptyState title="No data." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sales.top_products.slice(0, 8).map((p) => ({ name: p.product__name, revenue: p.revenue }))} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-ink-500)' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'var(--color-ink-700)' }} />
                    <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13 }} />
                    <Bar dataKey="revenue" fill="var(--color-brand-500)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="mb-4 text-sm font-semibold text-ink-900">Top customers by spend</p>
              {sales.top_customers.length === 0 ? (
                <EmptyState title="No data." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sales.top_customers.slice(0, 8).map((c) => ({ name: c.customer__name, spent: c.total_spent }))} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-ink-500)' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'var(--color-ink-700)' }} />
                    <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13 }} />
                    <Bar dataKey="spent" fill="var(--color-lime-500)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="mb-4 text-sm font-semibold text-ink-900">Expenses by category</p>
            {expenses.by_category.length === 0 ? (
              <EmptyState title="No expenses in this range." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={expenses.by_category.map((c) => ({ name: CATEGORY_LABELS[c.category] ?? c.category, total: c.total }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-ink-500)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-500)' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13 }} />
                  <Bar dataKey="total" fill="var(--color-status-warning)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
