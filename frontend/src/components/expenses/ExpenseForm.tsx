import { useState, type FormEvent } from 'react'
import { FormField } from '../ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { Button } from '../ui/Button'
import { isPositiveNumber, isBlank } from '../../utils/validation'
import type { ExpenseCategory } from '../../types'

export interface ExpenseFormValues {
  category: ExpenseCategory
  amount: string
  expense_date: string
  description: string
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'transport', label: 'Transport' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'salary', label: 'Salary' },
  { value: 'rent', label: 'Rent' },
  { value: 'loading', label: 'Loading' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'purchase_related', label: 'Purchase-related' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
]

export function ExpenseForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  onSubmit: (values: ExpenseFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [values, setValues] = useState<ExpenseFormValues>({
    category: 'miscellaneous', amount: '', expense_date: new Date().toISOString().slice(0, 10), description: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormValues, string>>>({})

  function set<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof ExpenseFormValues, string>> = {}
    if (isBlank(values.amount) || !isPositiveNumber(values.amount)) next.amount = 'Amount must be greater than zero.'
    if (isBlank(values.expense_date)) next.expense_date = 'Date is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Category" htmlFor="category" required>
        <select id="category" className={inputClasses()} value={values.category} onChange={(e) => set('category', e.target.value as ExpenseCategory)}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Amount (₹)" htmlFor="amount" required error={errors.amount}>
          <input id="amount" type="number" min="0.01" step="0.01" className={inputClasses(!!errors.amount)} value={values.amount} onChange={(e) => set('amount', e.target.value)} autoFocus />
        </FormField>
        <FormField label="Date" htmlFor="expense_date" required error={errors.expense_date}>
          <input id="expense_date" type="date" className={inputClasses(!!errors.expense_date)} value={values.expense_date} onChange={(e) => set('expense_date', e.target.value)} />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description" hint="Optional.">
        <textarea id="description" rows={2} className={inputClasses()} value={values.description} onChange={(e) => set('description', e.target.value)} />
      </FormField>

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save Expense'}</Button>
      </div>
    </form>
  )
}
