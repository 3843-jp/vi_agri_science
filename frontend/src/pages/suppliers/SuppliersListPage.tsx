import { Link } from 'react-router-dom'
import { Plus, Building2 } from 'lucide-react'
import { suppliersApi } from '../../api/purchases'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader, StatusBadge } from '../../components/ui/StatusBadge'
import { LinkButton } from '../../components/ui/Button'
import { SearchBar } from '../../components/ui/SearchBar'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'

export function SuppliersListPage() {
  const { hasPermission } = useAuth()
  const { items, count, totalPages, currentPage, pageSize, isLoading, error, setPage, handleSearch, reload } =
    usePaginatedList(suppliersApi.list)

  const canAdd = hasPermission('ADD_SUPPLIER')

  return (
    <div>
      <PageHeader
        title="Suppliers"
        action={canAdd ? <LinkButton to="/suppliers/new" icon={<Plus className="h-4 w-4" />}>Add Supplier</LinkButton> : undefined}
      />

      <div className="mb-4">
        <SearchBar placeholder="Search by name, phone, GST…" onSearch={handleSearch} />
      </div>

      {isLoading ? (
        <LoadingState label="Loading suppliers…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No suppliers found."
          description="Try a different search, or add your first supplier."
          action={canAdd ? <LinkButton to="/suppliers/new" icon={<Plus className="h-4 w-4" />}>Add Supplier</LinkButton> : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">GST</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-medium text-ink-900">{s.name}</td>
                    <td className="px-4 py-3 text-ink-700">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-ink-700">{s.gst_number || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.is_active ? 'active' : 'inactive'} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/suppliers/${s.id}`} className="text-sm font-medium text-brand-700 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col divide-y divide-line lg:hidden">
            {items.map((s) => (
              <Link key={s.id} to={`/suppliers/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-surface-muted">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{s.name}</p>
                    <p className="text-xs text-ink-500">{s.phone || 'No phone'}</p>
                  </div>
                </div>
                <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
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
