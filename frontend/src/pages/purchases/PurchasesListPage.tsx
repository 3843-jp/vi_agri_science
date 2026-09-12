import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Truck } from 'lucide-react'
import { purchasesApi } from '../../api/purchases'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/StatusBadge'
import { LinkButton } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { DateRangeFilter } from '../../components/ui/DateRangeFilter'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

export function PurchasesListPage() {
  const { hasPermission } = useAuth()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { items, count, totalPages, currentPage, pageSize, isLoading, error, setPage, reload } = usePaginatedList(
    purchasesApi.list,
    { ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) },
  )

  const canAdd = hasPermission('ADD_PURCHASE')

  return (
    <div>
      <PageHeader
        title="Purchases"
        action={canAdd ? <LinkButton to="/purchases/new" icon={<Plus className="h-4 w-4" />}>New Purchase</LinkButton> : undefined}
      />

      <div className="mb-4">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} />
      </div>

      {isLoading ? (
        <LoadingState label="Loading purchases…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No purchases found."
          description="Try a different date range, or record your first purchase."
          action={canAdd ? <LinkButton to="/purchases/new" icon={<Plus className="h-4 w-4" />}>New Purchase</LinkButton> : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Invoice/Ref</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 text-ink-700">{new Date(p.purchase_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 font-medium text-ink-900">{p.supplier_name}</td>
                    <td className="px-4 py-3 text-ink-500">{p.invoice_reference || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink-900">{formatCurrency(p.total_amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/purchases/${p.id}`} className="text-sm font-medium text-brand-700 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col divide-y divide-line lg:hidden">
            {items.map((p) => (
              <Link key={p.id} to={`/purchases/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-surface-muted">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{p.supplier_name}</p>
                    <p className="text-xs text-ink-500">{new Date(p.purchase_date).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-ink-900">{formatCurrency(p.total_amount)}</p>
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
