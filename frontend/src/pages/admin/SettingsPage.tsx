import { useEffect, useState } from 'react'
import { businessSettingsApi } from '../../api/admin'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import type { BusinessSettings } from '../../types'
import { PageHeader } from '../../components/ui/StatusBadge'
import { AdminTabs } from '../../components/admin/AdminTabs'
import { FormField } from '../../components/ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

export function SettingsPage() {
  const { hasPermission } = useAuth()
  const { showSuccess, showError } = useToast()
  const canEdit = hasPermission('MANAGE_SETTINGS')

  const [values, setValues] = useState<BusinessSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    businessSettingsApi.get().then(setValues).catch((e) => setError(extractErrorMessage(e))).finally(() => setIsLoading(false))
  }, [])

  function set<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setValues((v) => (v ? { ...v, [key]: value } : v))
  }

  async function handleSave() {
    if (!values) return
    setIsSaving(true)
    try {
      const updated = await businessSettingsApi.update({
        name: values.name, tagline: values.tagline, address: values.address, phone: values.phone,
        email: values.email, gstin: values.gstin, currency: values.currency,
        invoice_prefix: values.invoice_prefix, default_minimum_stock: values.default_minimum_stock,
      })
      setValues(updated)
      showSuccess('Business settings updated.')
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading settings…" />
  if (error) return <ErrorState message={error} />
  if (!values) return null

  return (
    <div>
      <PageHeader title="Business Settings" />
      <AdminTabs />

      <div className="max-w-2xl rounded-2xl border border-line bg-surface p-5">
        {!canEdit && (
          <p className="mb-4 rounded-lg bg-lime-300/20 px-3.5 py-2.5 text-sm text-ink-700">
            You can view these settings but don't have permission to change them.
          </p>
        )}

        <div className="flex flex-col gap-4">
          <FormField label="Business name" htmlFor="name">
            <input id="name" disabled={!canEdit} className={inputClasses()} value={values.name} onChange={(e) => set('name', e.target.value)} />
          </FormField>

          <FormField label="Tagline" htmlFor="tagline">
            <input id="tagline" disabled={!canEdit} className={inputClasses()} value={values.tagline} onChange={(e) => set('tagline', e.target.value)} />
          </FormField>

          <FormField label="Address" htmlFor="address">
            <textarea id="address" rows={2} disabled={!canEdit} className={inputClasses()} value={values.address} onChange={(e) => set('address', e.target.value)} />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Phone" htmlFor="phone">
              <input id="phone" disabled={!canEdit} className={inputClasses()} value={values.phone} onChange={(e) => set('phone', e.target.value)} />
            </FormField>
            <FormField label="Email" htmlFor="email">
              <input id="email" type="email" disabled={!canEdit} className={inputClasses()} value={values.email} onChange={(e) => set('email', e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="GSTIN" htmlFor="gstin" hint="Optional.">
              <input id="gstin" disabled={!canEdit} className={inputClasses()} value={values.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} />
            </FormField>
            <FormField label="Currency" htmlFor="currency">
              <input id="currency" disabled={!canEdit} className={inputClasses()} value={values.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Invoice prefix" htmlFor="invoice_prefix" hint="Used as a visual prefix on printed invoices, if implemented.">
              <input id="invoice_prefix" disabled={!canEdit} className={inputClasses()} value={values.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} />
            </FormField>
            <FormField label="Default minimum stock" htmlFor="default_minimum_stock" hint="Suggested default when adding a new product — doesn't change existing products.">
              <input id="default_minimum_stock" type="number" min="0" step="0.01" disabled={!canEdit} className={inputClasses()} value={values.default_minimum_stock} onChange={(e) => set('default_minimum_stock', e.target.value)} />
            </FormField>
          </div>

          <FormField label="Business timezone" htmlFor="timezone" hint="Fixed as business configuration, not editable here — every dashboard and report is calculated against this.">
            <input id="timezone" disabled value="Asia/Kolkata" className={inputClasses()} />
          </FormField>

          {canEdit && (
            <div className="mt-1 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save settings'}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
