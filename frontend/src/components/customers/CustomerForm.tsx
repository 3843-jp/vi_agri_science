import { useState, type FormEvent } from 'react'
import type { Customer } from '../../types'
import { FormField } from '../ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { Button } from '../ui/Button'
import { isBlank, isValidPhone, isNonNegativeNumber } from '../../utils/validation'

export interface CustomerFormValues {
  name: string
  phone: string
  address: string
  business_name: string
  gst_number: string
  credit_limit: string
  opening_balance: string
  status: 'active' | 'inactive'
}

const emptyValues: CustomerFormValues = {
  name: '', phone: '', address: '', business_name: '', gst_number: '',
  credit_limit: '0', opening_balance: '0', status: 'active',
}

export function CustomerForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initial?: Partial<Customer>
  onSubmit: (values: CustomerFormValues) => Promise<void>
  onCancel?: () => void
  isSubmitting: boolean
}) {
  const [values, setValues] = useState<CustomerFormValues>({ ...emptyValues, ...initial } as CustomerFormValues)
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormValues, string>>>({})

  function set<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof CustomerFormValues, string>> = {}
    if (isBlank(values.name)) next.name = 'Name is required.'
    if (isBlank(values.phone)) next.phone = 'Phone is required.'
    else if (!isValidPhone(values.phone)) next.phone = 'Enter a valid phone number.'
    if (!isNonNegativeNumber(values.credit_limit)) next.credit_limit = 'Credit limit cannot be negative.'
    if (!isNonNegativeNumber(values.opening_balance)) next.opening_balance = 'Opening balance cannot be negative.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    // Final validation is still the backend's (Customer serializer / model
    // constraints) — this only prevents an obviously-bad request round trip.
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Name" htmlFor="name" required error={errors.name}>
          <input
            id="name" className={inputClasses(!!errors.name)} value={values.name}
            onChange={(e) => set('name', e.target.value)} placeholder="Ramesh Traders"
          />
        </FormField>
        <FormField label="Phone" htmlFor="phone" required error={errors.phone}>
          <input
            id="phone" className={inputClasses(!!errors.phone)} value={values.phone}
            onChange={(e) => set('phone', e.target.value)} placeholder="9000000001"
          />
        </FormField>
      </div>

      <FormField label="Address" htmlFor="address">
        <textarea
          id="address" rows={2} className={inputClasses()} value={values.address}
          onChange={(e) => set('address', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Business name" htmlFor="business_name" hint="Optional, if this customer buys under a business.">
          <input
            id="business_name" className={inputClasses()} value={values.business_name}
            onChange={(e) => set('business_name', e.target.value)}
          />
        </FormField>
        <FormField label="GST number" htmlFor="gst_number" hint="Optional.">
          <input
            id="gst_number" className={inputClasses()} value={values.gst_number}
            onChange={(e) => set('gst_number', e.target.value.toUpperCase())}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Credit limit (₹)" htmlFor="credit_limit" error={errors.credit_limit}>
          <input
            id="credit_limit" type="number" min="0" step="0.01" className={inputClasses(!!errors.credit_limit)}
            value={values.credit_limit} onChange={(e) => set('credit_limit', e.target.value)}
          />
        </FormField>
        <FormField
          label="Opening balance (₹)" htmlFor="opening_balance" error={errors.opening_balance}
          hint="Amount already owed, carried over from notebook records."
        >
          <input
            id="opening_balance" type="number" min="0" step="0.01" className={inputClasses(!!errors.opening_balance)}
            value={values.opening_balance} onChange={(e) => set('opening_balance', e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Status" htmlFor="status">
        <select
          id="status" className={inputClasses()} value={values.status}
          onChange={(e) => set('status', e.target.value as 'active' | 'inactive')}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </FormField>

      <div className="mt-2 flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save customer'}
        </Button>
      </div>
    </form>
  )
}
