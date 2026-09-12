import { useState, type FormEvent } from 'react'
import type { Supplier } from '../../types'
import { FormField } from '../ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { Button } from '../ui/Button'
import { isBlank, isValidPhone } from '../../utils/validation'

export interface SupplierFormValues {
  name: string
  phone: string
  address: string
  gst_number: string
  is_active: boolean
}

const emptyValues: SupplierFormValues = { name: '', phone: '', address: '', gst_number: '', is_active: true }

export function SupplierForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initial?: Partial<Supplier>
  onSubmit: (values: SupplierFormValues) => Promise<void>
  onCancel?: () => void
  isSubmitting: boolean
}) {
  const [values, setValues] = useState<SupplierFormValues>({ ...emptyValues, ...initial } as SupplierFormValues)
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormValues, string>>>({})

  function set<K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof SupplierFormValues, string>> = {}
    if (isBlank(values.name)) next.name = 'Name is required.'
    if (!isBlank(values.phone) && !isValidPhone(values.phone)) next.phone = 'Enter a valid phone number.'
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
      <FormField label="Name" htmlFor="name" required error={errors.name}>
        <input id="name" className={inputClasses(!!errors.name)} value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Krishna AgriChem Distributors" />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Phone" htmlFor="phone" error={errors.phone} hint="Optional.">
          <input id="phone" className={inputClasses(!!errors.phone)} value={values.phone} onChange={(e) => set('phone', e.target.value)} />
        </FormField>
        <FormField label="GST number" htmlFor="gst_number" hint="Optional.">
          <input id="gst_number" className={inputClasses()} value={values.gst_number} onChange={(e) => set('gst_number', e.target.value.toUpperCase())} />
        </FormField>
      </div>

      <FormField label="Address" htmlFor="address">
        <textarea id="address" rows={2} className={inputClasses()} value={values.address} onChange={(e) => set('address', e.target.value)} />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={values.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500" />
        Active
      </label>

      <div className="mt-2 flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save supplier'}</Button>
      </div>
    </form>
  )
}
