import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Ban, Wallet, Undo2 } from 'lucide-react'
import { salesApi } from '../../api/sales'
import { paymentsApi } from '../../api/payments'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import type { Sale, Payment, Product } from '../../types'
import type { CartLine } from '../../types/cart'
import { PageHeader, StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { FormField } from '../../components/ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { ProductPicker } from '../../components/sales/ProductPicker'
import { SaleItemsCart } from '../../components/sales/SaleItemsCart'
import { PaymentForm, type PaymentFormValues } from '../../components/payments/PaymentForm'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const saleId = Number(id)
  const { hasPermission } = useAuth()
  const { showSuccess, showError } = useToast()

  const [sale, setSale] = useState<Sale | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editLines, setEditLines] = useState<CartLine[]>([])
  const [editReason, setEditReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const [reverseTarget, setReverseTarget] = useState<Payment | null>(null)
  const [reverseReason, setReverseReason] = useState('')
  const [isReversing, setIsReversing] = useState(false)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    Promise.all([salesApi.retrieve(saleId), paymentsApi.list({ sale: saleId })])
      .then(([s, p]) => { setSale(s); setPayments(p.results) })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false))
  }, [saleId])

  useEffect(load, [load])

  function openEdit() {
    if (!sale) return
    setEditLines(
      sale.items.map((item) => ({
        key: `${item.id}`,
        productId: item.product,
        productName: item.product_name,
        sku: '',
        unitLabel: '',
        currentStock: Infinity, // editing an existing line isn't bounded by pre-edit stock display; backend validates the real diff
        quantity: item.quantity,
        unitPrice: item.unit_price,
        discount: item.discount,
      })),
    )
    setEditReason('')
    setEditError(null)
    setEditOpen(true)
  }

  function addEditProduct(product: Product) {
    setEditLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) return prev.map((l) => (l.productId === product.id ? { ...l, quantity: String(Number(l.quantity) + 1) } : l))
      return [...prev, {
        key: `${product.id}-${Date.now()}`, productId: product.id, productName: product.name,
        sku: product.sku, unitLabel: product.unit_name, currentStock: product.current_stock,
        quantity: '1', unitPrice: product.selling_price, discount: '0',
      }]
    })
  }

  async function handleSaveEdit() {
    if (editLines.length === 0) { setEditError('A sale must contain at least one product.'); return }
    setEditError(null)
    setIsSaving(true)
    try {
      // Submits only the permitted change — the backend diffs old vs new
      // quantities per product and writes the ADJUSTMENT inventory
      // movement itself; nothing about stock is computed here.
      const updated = await salesApi.update(saleId, {
        items_input: editLines.map((l) => ({ product: l.productId, quantity: l.quantity, unit_price: l.unitPrice, discount: l.discount })),
        reason: editReason,
      })
      setSale(updated)
      showSuccess('Sale updated.')
      setEditOpen(false)
      load()
    } catch (err) {
      setEditError(extractErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCancel() {
    setIsCancelling(true)
    try {
      await salesApi.cancel(saleId, cancelReason)
      showSuccess('Sale cancelled and inventory reversed.')
      setCancelOpen(false)
      load()
    } catch (err) {
      showError(extractErrorMessage(err))
      setIsCancelling(false)
    }
  }

  async function handleRecordPayment(values: PaymentFormValues) {
    if (!sale) return
    setIsPaying(true)
    try {
      await paymentsApi.create({
        sale: sale.id,
        customer: sale.customer,
        amount: values.amount,
        method: values.method,
        reference_number: values.reference_number || undefined,
      })
      showSuccess('Payment recorded.')
      setPaymentOpen(false)
      load() // refresh sale (outstanding/status) + payment history together
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsPaying(false)
    }
  }

  async function handleReverse() {
    if (!reverseTarget) return
    setIsReversing(true)
    try {
      await paymentsApi.reverse(reverseTarget.id, reverseReason)
      showSuccess('Payment reversed.')
      setReverseTarget(null)
      setReverseReason('')
      load()
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsReversing(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading sale…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!sale) return null

  const canEdit = hasPermission('UPDATE_SALE') && sale.status === 'confirmed'
  const canCancel = hasPermission('CANCEL_SALE') && sale.status === 'confirmed'
  const canAddPayment = hasPermission('ADD_PAYMENT') && sale.status === 'confirmed' && sale.outstanding > 0
  const canReverse = hasPermission('REVERSE_PAYMENT')

  return (
    <div>
      <PageHeader
        title={sale.sale_number}
        backTo="/sales"
        action={
          <div className="flex flex-wrap gap-2">
            {canEdit && <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={openEdit}>Edit</Button>}
            {canCancel && <Button variant="danger" icon={<Ban className="h-4 w-4" />} onClick={() => setCancelOpen(true)}>Cancel Sale</Button>}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-ink-500">
        <span>{sale.customer_name}</span>
        <span>·</span>
        <span>{new Date(sale.sale_date).toLocaleString('en-IN')}</span>
        <StatusBadge status={sale.status} />
        <StatusBadge status={sale.payment_status} />
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-ink-900">{item.product_name}</td>
                  <td className="px-4 py-3 text-right text-ink-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-ink-700">{formatCurrency(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right text-ink-700">{formatCurrency(item.discount)}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink-900">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col divide-y divide-line lg:hidden">
          {sale.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{item.product_name}</p>
                <p className="text-xs text-ink-500">{item.quantity} × {formatCurrency(item.unit_price)}</p>
              </div>
              <p className="text-sm font-medium text-ink-900">{formatCurrency(item.line_total)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4 lg:col-span-2">
          <p className="mb-3 flex items-center justify-between text-sm font-semibold text-ink-900">
            Payments
            {canAddPayment && (
              <Button variant="secondary" icon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setPaymentOpen(true)} className="!px-3 !py-1.5 text-xs">
                Record Payment
              </Button>
            )}
          </p>
          {payments.length === 0 ? (
            <EmptyState title="No payments recorded yet." />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium capitalize text-ink-900">{p.method.replace('_', ' ')}</p>
                    <p className="text-xs text-ink-500">
                      {new Date(p.payment_date).toLocaleString('en-IN')}
                      {p.reference_number ? ` · ${p.reference_number}` : ''}
                    </p>
                    {p.status === 'reversed' && p.reversal_reason && (
                      <p className="mt-0.5 text-xs text-status-danger">Reversed: {p.reversal_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-medium text-ink-900">{formatCurrency(p.amount)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    {canReverse && p.status === 'paid' && (
                      <button
                        onClick={() => setReverseTarget(p)}
                        title="Reverse payment"
                        className="rounded-lg border border-line p-1.5 text-ink-500 hover:bg-surface-muted hover:text-status-danger"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 text-sm font-semibold text-ink-900">Summary</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-ink-500"><span>Subtotal</span><span className="text-ink-700">{formatCurrency(sale.subtotal)}</span></div>
            <div className="flex justify-between text-ink-500"><span>Discount</span><span className="text-ink-700">{formatCurrency(sale.discount)}</span></div>
            <div className="flex justify-between border-t border-line pt-2 font-medium text-ink-900"><span>Total</span><span>{formatCurrency(sale.total_amount)}</span></div>
            <div className="flex justify-between text-ink-500"><span>Paid</span><span className="text-brand-700">{formatCurrency(sale.amount_paid)}</span></div>
            <div className="flex justify-between font-semibold">
              <span className="text-ink-900">Outstanding</span>
              {sale.outstanding <= 0 ? (
                <span className="text-brand-700">PAID</span>
              ) : (
                <span className="text-status-warning">{formatCurrency(sale.outstanding)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-4 text-sm font-semibold text-ink-900">Edit sale items</p>
            <ProductPicker onPick={addEditProduct} />
            <div className="mt-4">
              <SaleItemsCart
                lines={editLines}
                onUpdate={(key, patch) => setEditLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))}
                onRemove={(key) => setEditLines((prev) => prev.filter((l) => l.key !== key))}
              />
            </div>
            <div className="mt-4">
              <FormField label="Reason for this change" htmlFor="edit_reason" hint="Recorded in the audit log.">
                <input id="edit_reason" className={inputClasses()} value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Customer requested additional quantity" />
              </FormField>
            </div>
            {editError && <p className="mt-3 text-sm text-status-danger">{editError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {paymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPaymentOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-4 text-sm font-semibold text-ink-900">Record payment</p>
            <PaymentForm outstanding={sale.outstanding} onSubmit={handleRecordPayment} onCancel={() => setPaymentOpen(false)} isSubmitting={isPaying} />
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-1 text-sm font-semibold text-ink-900">Cancel this sale?</p>
            <p className="mb-4 text-sm text-ink-500">
              This will reverse the associated inventory movement. The original transaction will remain in the system for audit purposes.
            </p>
            <FormField label="Reason" htmlFor="cancel_reason" hint="Optional, but recorded in the audit log.">
              <input id="cancel_reason" className={inputClasses()} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} autoFocus />
            </FormField>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={isCancelling}>Keep Sale</Button>
              <Button variant="danger" onClick={handleCancel} disabled={isCancelling}>
                {isCancelling ? 'Cancelling…' : 'Cancel Sale'}
              </Button>
            </div>
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
