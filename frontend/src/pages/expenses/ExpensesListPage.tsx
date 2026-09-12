import { useState } from 'react'
import { Plus, Ban, Receipt } from 'lucide-react'
import { expensesApi } from '../../api/expenses'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import type { Expense, ExpenseCategory } from '../../types'
import { PageHeader, StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { DateRangeFilter } from '../../components/ui/DateRangeFilter'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { inputClasses } from '../../utils/inputStyles'
import { ExpenseForm, type ExpenseFormValues } from '../../components/expenses/ExpenseForm'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport', electricity: 'Electricity', salary: 'Salary', rent: 'Rent',
  loading: 'Loading', maintenance: 'Maintenance', purchase_related: 'Purchase-related', miscellaneous: 'Miscellaneous',
}

export function ExpensesListPage() {
  const { hasPermission } = useAuth()
  const { showSuccess, showError } = useToast()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')

  const { items, count, totalPages, currentPage, pageSize, isLoading, error, setPage, reload } = usePaginatedList(
    expensesApi.list,
    { ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}), ...(category ? { category } : {}) },
  )

  const [addOpen, setAddOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Expense | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const canAdd = hasPermission('ADD_EXPENSE')
  const canCancel = hasPermission('UPDATE_EXPENSE')

  async function handleAdd(values: ExpenseFormValues) {
    setIsSubmitting(true)
    try {
      await expensesApi.create(values)
      showSuccess('Expense recorded.')
      setAddOpen(false)
      reload()
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCancelExpense() {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      await expensesApi.cancel(cancelTarget.id)
      showSuccess('Expense cancelled.')
      setCancelTarget(null)
      reload()
    } catch (err) {
      showError(extractErrorMessage(err))
      setIsCancelling(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        action={canAdd ? <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>Add Expense</Button> : undefined}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} />
        <select className={`${inputClasses()} sm:w-48`} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory | '')}>
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading expenses…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No expenses found."
          description="Try different filters, or record your first expense."
          action={canAdd ? <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>Add Expense</Button> : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recorded By</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 text-ink-700">{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-ink-700">{CATEGORY_LABELS[e.category] ?? e.category}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink-900">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-ink-500">{e.description || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-ink-500">{e.recorded_by_username || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {canCancel && e.status === 'active' && (
                        <button onClick={() => setCancelTarget(e)} className="text-ink-500 hover:text-status-danger" title="Cancel">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col divide-y divide-line lg:hidden">
            {items.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{CATEGORY_LABELS[e.category] ?? e.category}</p>
                    <p className="text-xs text-ink-500">{new Date(e.expense_date).toLocaleDateString('en-IN')} · {formatCurrency(e.amount)}</p>
                  </div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>

          <div className="px-4 pb-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} count={count} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-4 text-sm font-semibold text-ink-900">Add expense</p>
            <ExpenseForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} isSubmitting={isSubmitting} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel this expense?"
        description="The record is preserved and marked cancelled, not deleted."
        confirmLabel="Cancel Expense"
        danger
        isSubmitting={isCancelling}
        onConfirm={handleCancelExpense}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}
