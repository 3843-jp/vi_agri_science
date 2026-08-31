import { useState, type FormEvent } from 'react'
import { FormField } from '../ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { Button } from '../ui/Button'
import type { Product } from '../../types'

export interface StockAdjustmentFormValues {
  quantity: string
  reason: string
}

export function StockAdjustmentForm({
  product,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  product: Product
  onSubmit: (values: StockAdjustmentFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const n = Number(quantity)
    if (!quantity || Number.isNaN(n) || n === 0) { setError('Enter a non-zero adjustment quantity (e.g. -2 or +10).'); return }
    if (!reason.trim()) { setError('A reason is required for every stock adjustment.'); return }
    await onSubmit({ quantity, reason })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-xl bg-surface-muted px-3.5 py-2.5 text-sm">
        <p className="font-medium text-ink-900">{product.name}</p>
        <p className="text-xs text-ink-500">Current stock: {product.current_stock} {product.unit_name}</p>
      </div>

      <FormField
        label="Adjustment quantity" htmlFor="quantity" required
        hint="Positive to add stock (e.g. found extra bags), negative to remove (e.g. damage)."
      >
        <input id="quantity" type="number" step="0.01" className={inputClasses()} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="-2 or +10" autoFocus />
      </FormField>

      <FormField label="Reason" htmlFor="reason" required>
        <input id="reason" className={inputClasses()} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged bags found during stock check" />
      </FormField>

      {error && <p className="text-sm text-status-danger">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save Adjustment'}</Button>
      </div>
    </form>
  )
}
