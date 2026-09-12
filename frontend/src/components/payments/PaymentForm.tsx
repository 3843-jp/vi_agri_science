import { useState, type FormEvent } from 'react'
import { FormField } from '../ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { Button } from '../ui/Button'
import { isPositiveNumber } from '../../utils/validation'
import type { PaymentMethod } from '../../types'

export interface PaymentFormValues {
  amount: string
  method: PaymentMethod
  reference_number: string
}

export function PaymentForm({
  outstanding,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  outstanding: number
  onSubmit: (values: PaymentFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [values, setValues] = useState<PaymentFormValues>({
    amount: outstanding > 0 ? String(outstanding) : '',
    method: 'cash',
    reference_number: '',
  })
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof PaymentFormValues>(key: K, value: PaymentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isPositiveNumber(values.amount)) {
      setError('Amount must be greater than zero.')
      return
    }
    // Client-side heads-up only — the backend does not reject overpayment
    // (it's tracked and folded into the deterministic reconciliation
    // status), so this is a warning, not a hard block.
    if (outstanding > 0 && Number(values.amount) > outstanding) {
      const proceed = window.confirm(
        `This amount (₹${values.amount}) is more than the outstanding balance (₹${outstanding}). Record it anyway?`,
      )
      if (!proceed) return
    }
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Amount (₹)" htmlFor="amount" required>
        <input
          id="amount" type="number" min="0.01" step="0.01" className={inputClasses(!!error)}
          value={values.amount} onChange={(e) => set('amount', e.target.value)} autoFocus
        />
      </FormField>

      <FormField label="Payment method" htmlFor="method" required>
        <select id="method" className={inputClasses()} value={values.method} onChange={(e) => set('method', e.target.value as PaymentMethod)}>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="card">Card</option>
          <option value="credit">Credit</option>
          <option value="other">Other</option>
        </select>
      </FormField>

      <FormField label="Reference number" htmlFor="reference_number" hint="UTR / transaction ID, if applicable.">
        <input id="reference_number" className={inputClasses()} value={values.reference_number} onChange={(e) => set('reference_number', e.target.value)} />
      </FormField>

      {error && <p className="text-sm text-status-danger">{error}</p>}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Recording…' : 'Record Payment'}</Button>
      </div>
    </form>
  )
}
