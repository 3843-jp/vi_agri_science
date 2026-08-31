import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShoppingCart } from 'lucide-react'
import { salesApi } from '../../api/sales'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader, StatusBadge } from '../../components/ui/StatusBadge'
import { LinkButton } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { DateRangeFilter } from '../../components/ui/DateRangeFilter'
import { inputClasses } from '../../utils/inputStyles'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

export function SalesListPage() {
  const { hasPermission } = useAuth()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')

  const { items, count, totalPages, currentPage, pageSize, isLoading, error, setPage, reload } = usePaginatedList(
    salesApi.list,
    {
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      ...(paymentStatus ? { payment_status: paymentStatus } : {}),
    },
  )

  const canAdd = hasPermission('ADD_SALE')

  return (
    <div>
      <PageHeader
        title="Sales"
        action={canAdd ? <LinkButton to="/sales/new" icon={<Plus className="h-4 w-4" />}>New Sale</LinkButton> : undefined}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} />
        <select className={`${inputClasses()} sm:w-48`} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
          <option value="">All payment statuses</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading sales…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No sales found."
          description="Try different filters, or record your first sale."
          action={canAdd ? <LinkButton to="/sales/new" icon={<Plus className="h-4 w-4" />}>New Sale</LinkButton> : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Sale No.</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-medium text-ink-900">{s.sale_number}</td>
                    <td className="px-4 py-3 text-ink-700">{new Date(s.sale_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-ink-700">{s.customer_name}</td>
                    <td className="px-4 py-3 text-right text-ink-700">{formatCurrency(s.total_amount)}</td>
                    <td className="px-4 py-3 text-right text-ink-700">{formatCurrency(s.amount_paid)}</td>
                    <td className="px-4 py-3 text-right text-ink-700">{formatCurrency(s.outstanding)}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.payment_status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/sales/${s.id}`} className="text-sm font-medium text-brand-700 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col divide-y divide-line lg:hidden">
            {items.map((s) => (
              <Link key={s.id} to={`/sales/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-surface-muted">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <ShoppingCart className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{s.sale_number}</p>
                    <p className="text-xs text-ink-500">{s.customer_name} · {formatCurrency(s.total_amount)}</p>
                  </div>
                </div>
                <StatusBadge status={s.payment_status} />
              </Link>
            ))}
          </div>

          <div className="px-4 pb-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} count={count} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  )
}
