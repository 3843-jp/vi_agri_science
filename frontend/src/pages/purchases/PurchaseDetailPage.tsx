import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { purchasesApi } from '../../api/purchases'
import { extractErrorMessage } from '../../api/axios'
import type { Purchase } from '../../types'
import { PageHeader } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const purchaseId = Number(id)

  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    purchasesApi.retrieve(purchaseId).then(setPurchase).catch((err) => setError(extractErrorMessage(err))).finally(() => setIsLoading(false))
  }, [purchaseId])

  useEffect(load, [load])

  if (isLoading) return <LoadingState label="Loading purchase…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!purchase) return null

  return (
    <div>
      <PageHeader title={purchase.invoice_reference || `Purchase #${purchase.id}`} backTo="/purchases" />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-medium text-ink-500">Supplier</p>
          <p className="mt-1 text-sm font-semibold text-ink-900">{purchase.supplier_name}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-medium text-ink-500">Date</p>
          <p className="mt-1 text-sm font-semibold text-ink-900">{new Date(purchase.purchase_date).toLocaleDateString('en-IN')}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-medium text-ink-500">Total</p>
          <p className="mt-1 text-sm font-semibold text-ink-900">{formatCurrency(purchase.total_amount)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Purchase Price</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {purchase.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-ink-900">{item.product_name}</td>
                  <td className="px-4 py-3 text-right text-ink-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-ink-700">{formatCurrency(item.purchase_price)}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink-900">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col divide-y divide-line lg:hidden">
          {purchase.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{item.product_name}</p>
                <p className="text-xs text-ink-500">{item.quantity} × {formatCurrency(item.purchase_price)}</p>
              </div>
              <p className="text-sm font-medium text-ink-900">{formatCurrency(item.line_total)}</p>
            </div>
          ))}
        </div>
      </div>

      {purchase.notes && (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-medium text-ink-500">Notes</p>
          <p className="mt-1 text-sm text-ink-700">{purchase.notes}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-300">
        Purchases are not edited once recorded — this keeps the inventory ledger's PURCHASE movements
        permanently traceable to a fixed record.
      </p>
    </div>
  )
}
