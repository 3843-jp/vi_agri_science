import { useState } from 'react'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { auditApi } from '../../api/admin'
import type { AuditLog } from '../../types'
import { PageHeader } from '../../components/ui/StatusBadge'
import { AdminTabs } from '../../components/admin/AdminTabs'
import { SearchBar } from '../../components/ui/SearchBar'
import { DateRangeFilter } from '../../components/ui/DateRangeFilter'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { inputClasses } from '../../utils/inputStyles'

const ENTITY_TYPES = [
  'Customer', 'Product', 'Supplier', 'Sale', 'Payment', 'Purchase',
  'Expense', 'InventoryMovement', 'User', 'Role', 'BusinessSettings',
]

const ACTIONS = [
  'CREATE_CUSTOMER', 'UPDATE_CUSTOMER', 'DEACTIVATE_CUSTOMER',
  'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DEACTIVATE_PRODUCT',
  'CREATE_SUPPLIER', 'UPDATE_SUPPLIER', 'DEACTIVATE_SUPPLIER',
  'CREATE_SALE', 'UPDATE_SALE', 'CANCEL_SALE',
  'CREATE_PAYMENT', 'REVERSE_PAYMENT',
  'CREATE_PURCHASE', 'ADJUST_STOCK',
  'CREATE_EXPENSE', 'UPDATE_EXPENSE', 'CANCEL_EXPENSE',
  'CREATE_USER', 'UPDATE_USER', 'DEACTIVATE_USER', 'REACTIVATE_USER',
  'CREATE_ROLE', 'UPDATE_ROLE', 'UPDATE_BUSINESS_SETTINGS',
]

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

export function AuditLogsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [detail, setDetail] = useState<AuditLog | null>(null)

  const { items, count, totalPages, currentPage, pageSize, isLoading, error, setPage, handleSearch, reload } =
    usePaginatedList(auditApi.list, {
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      ...(action ? { action } : {}),
      ...(entityType ? { entity_type: entityType } : {}),
    })

  return (
    <div>
      <PageHeader title="Audit Logs" />
      <AdminTabs />

      <div className="mb-4 flex flex-col gap-3">
        <SearchBar placeholder="Search by reason, record ID, or username…" onSearch={handleSearch} />
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} />
          <select className={`${inputClasses()} sm:w-48`} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">All modules</option>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={`${inputClasses()} sm:w-56`} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading audit logs…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState title="No audit entries found." description="Try different filters." />
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Object ID</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 text-ink-700">{new Date(a.created_at).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-ink-700">{a.username ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-700">{a.action}</td>
                    <td className="px-4 py-3 text-ink-700">{a.entity_type}</td>
                    <td className="px-4 py-3 text-ink-500">#{a.entity_id}</td>
                    <td className="px-4 py-3 text-ink-500">{a.reason || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDetail(a)} className="text-sm font-medium text-brand-700 hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} count={count} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetail(null)} />
          <div className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-4 text-sm font-semibold text-ink-900">Audit entry #{detail.id}</p>
            <dl className="flex flex-col gap-2.5 text-sm">
              <div><dt className="text-xs text-ink-500">User</dt><dd className="text-ink-900">{detail.username ?? 'Unknown'}</dd></div>
              <div><dt className="text-xs text-ink-500">Action</dt><dd className="font-mono text-xs text-brand-700">{detail.action}</dd></div>
              <div><dt className="text-xs text-ink-500">Time</dt><dd className="text-ink-900">{new Date(detail.created_at).toLocaleString('en-IN')}</dd></div>
              <div><dt className="text-xs text-ink-500">Record</dt><dd className="text-ink-900">{detail.entity_type} #{detail.entity_id}</dd></div>
              <div><dt className="text-xs text-ink-500">Reason</dt><dd className="text-ink-900">{detail.reason || 'No reason given'}</dd></div>
              {detail.ip_address && <div><dt className="text-xs text-ink-500">IP address</dt><dd className="text-ink-900">{detail.ip_address}</dd></div>}
              {/* Only shown if the backend actually recorded before/after values for this action — never fabricated. */}
              {detail.old_value && (
                <div><dt className="text-xs text-ink-500">Previous</dt><dd className="whitespace-pre-wrap rounded-lg bg-surface-muted p-2 font-mono text-xs text-ink-700">{formatValue(detail.old_value)}</dd></div>
              )}
              {detail.new_value && (
                <div><dt className="text-xs text-ink-500">New</dt><dd className="whitespace-pre-wrap rounded-lg bg-surface-muted p-2 font-mono text-xs text-ink-700">{formatValue(detail.new_value)}</dd></div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}
