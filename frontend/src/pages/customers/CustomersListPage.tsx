import { Link } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { customersApi } from '../../api/customers'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader, StatusBadge } from '../../components/ui/StatusBadge'
import { LinkButton } from '../../components/ui/Button'
import { SearchBar } from '../../components/ui/SearchBar'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

export function CustomersListPage() {
  const { hasPermission } = useAuth()
  const { items, count, totalPages, currentPage, pageSize, isLoading, error, setPage, handleSearch, reload } =
    usePaginatedList(customersApi.list)

  const canAdd = hasPermission('ADD_CUSTOMER')

  return (
    <div>
      <PageHeader
        title="Customers"
        action={canAdd ? <LinkButton to="/customers/new" icon={<Plus className="h-4 w-4" />}>Add Customer</LinkButton> : undefined}
      />

      <div className="mb-4">
        <SearchBar placeholder="Search by name, phone, business, GST…" onSearch={handleSearch} />
      </div>

      {isLoading ? (
        <LoadingState label="Loading customers…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No customers found."
          description="Try a different search, or add your first customer."
          action={canAdd ? <LinkButton to="/customers/new" icon={<Plus className="h-4 w-4" />}>Add Customer</LinkButton> : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">GST</th>
                  <th className="px-4 py-3 text-right">Credit Limit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-medium text-ink-900">{c.name}</td>
                    <td className="px-4 py-3 text-ink-700">{c.phone}</td>
                    <td className="px-4 py-3 text-ink-700">{c.business_name || '—'}</td>
                    <td className="px-4 py-3 text-ink-700">{c.gst_number || '—'}</td>
                    <td className="px-4 py-3 text-right text-ink-700">{formatCurrency(c.credit_limit)}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/customers/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col divide-y divide-line lg:hidden">
            {items.map((c) => (
              <Link key={c.id} to={`/customers/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-surface-muted">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{c.name}</p>
                    <p className="text-xs text-ink-500">{c.phone}</p>
                  </div>
                </div>
                <StatusBadge status={c.status} />
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
