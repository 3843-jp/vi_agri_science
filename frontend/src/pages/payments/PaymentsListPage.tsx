import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Undo2, Wallet } from 'lucide-react'
import { paymentsApi } from '../../api/payments'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useAuth } from '../../hooks/useAuth'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import type { Payment, PaymentMethod } from '../../types'
import { PageHeader, StatusBadge } from '../../components/ui/StatusBadge'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { DateRangeFilter } from '../../components/ui/DateRangeFilter'
import { FormField } from '../../components/ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { Button } from '../../components/ui/Button'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

export function PaymentsListPage() {
  const { hasPermission } = useAuth()
  const { showSuccess, showError } = useToast()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [status, setStatus] = useState('')

  const { items, count, totalPages, currentPage, pageSize, isLoading, error, setPage, reload } = usePaginatedList(
    paymentsApi.list,
    {
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      ...(method ? { method } : {}),
      ...(status ? { status } : {}),
    },
  )

  const [reverseTarget, setReverseTarget] = useState<Payment | null>(null)
  const [reverseReason, setReverseReason] = useState('')
  const [isReversing, setIsReversing] = useState(false)
  const canReverse = hasPermission('REVERSE_PAYMENT')

  async function handleReverse() {
    if (!reverseTarget) return
    setIsReversing(true)
    try {
      await paymentsApi.reverse(reverseTarget.id, reverseReason)
      showSuccess('Payment reversed.')
      setReverseTarget(null)
      setReverseReason('')
      reload()
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsReversing(false)
    }
  }

  return (
    <div>
      <PageHeader title="Payments" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} />
        <select className={`${inputClasses()} sm:w-44`} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}>
          <option value="">All methods</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="card">Card</option>
          <option value="credit">Credit</option>
          <option value="other">Other</option>
        </select>
        <select className={`${inputClasses()} sm:w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="reversed">Reversed</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading payments…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState title="No payments found." description="Try different filters." />
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Sale</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recorded By</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 text-ink-700">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-ink-700">{p.customer_name}</td>
                    <td className="px-4 py-3">
                      <Link to={`/sales/${p.sale}`} className="font-medium text-brand-700 hover:underline">{p.sale_number}</Link>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-ink-900">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 capitalize text-ink-700">{p.method.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-ink-500">{p.reference_number || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-ink-500">{p.recorded_by_username || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {canReverse && p.status === 'paid' && (
                        <button onClick={() => setReverseTarget(p)} className="text-ink-500 hover:text-status-danger" title="Reverse">
                          <Undo2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col divide-y divide-line lg:hidden">
            {items.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <Link to={`/sales/${p.sale}`} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{p.customer_name}</p>
                    <p className="text-xs text-ink-500">{p.sale_number} · {formatCurrency(p.amount)}</p>
                  </div>
                </Link>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>

          <div className="px-4 pb-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} count={count} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </div>
      )}

      {reverseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReverseTarget(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-1 text-sm font-semibold text-ink-900">Reverse this payment?</p>
            <p className="mb-4 text-sm text-ink-500">The original payment record is preserved and marked reversed — not deleted.</p>
            <FormField label="Reason" htmlFor="reverse_reason" required>
              <input id="reverse_reason" className={inputClasses()} value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} autoFocus />
            </FormField>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReverseTarget(null)} disabled={isReversing}>Cancel</Button>
              <Button variant="danger" onClick={handleReverse} disabled={isReversing || !reverseReason.trim()}>
                {isReversing ? 'Reversing…' : 'Reverse Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
