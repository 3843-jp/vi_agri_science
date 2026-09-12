import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, Building2Icon, Phone, MapPin } from 'lucide-react'
import { suppliersApi, purchasesApi } from '../../api/purchases'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import type { Supplier, Purchase } from '../../types'
import { PageHeader, StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SupplierForm, type SupplierFormValues } from '../../components/suppliers/SupplierForm'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supplierId = Number(id)
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const { showSuccess, showError } = useToast()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [purchaseCount, setPurchaseCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    Promise.all([
      suppliersApi.retrieve(supplierId),
      purchasesApi.list({ supplier: supplierId, page_size: 100 }),
    ])
      .then(([s, purchaseData]) => {
        setSupplier(s)
        setPurchases(purchaseData.results)
        setPurchaseCount(purchaseData.count)
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false))
  }, [supplierId])

  useEffect(load, [load])

  async function handleUpdate(values: SupplierFormValues) {
    setIsSaving(true)
    try {
      await suppliersApi.update(supplierId, values)
      showSuccess('Supplier updated.')
      setEditOpen(false)
      load()
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeactivate() {
    setIsDeactivating(true)
    try {
      await suppliersApi.deactivate(supplierId)
      showSuccess('Supplier deactivated.')
      navigate('/suppliers')
    } catch (err) {
      showError(extractErrorMessage(err))
      setIsDeactivating(false)
      setConfirmDeactivate(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading supplier…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!supplier) return <ErrorState message="Supplier not found." />

  const canEdit = hasPermission('UPDATE_SUPPLIER')
  const canDeactivate = hasPermission('UPDATE_SUPPLIER') // no dedicated DELETE_SUPPLIER codename exists
  const totalPurchaseValue = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0)

  return (
    <div>
      <PageHeader
        title={supplier.name}
        backTo="/suppliers"
        action={
          <div className="flex gap-2">
            {canEdit && <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>Edit</Button>}
            {canDeactivate && supplier.is_active && (
              <Button variant="danger" icon={<Building2Icon className="h-4 w-4" />} onClick={() => setConfirmDeactivate(true)}>Deactivate</Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5 lg:col-span-1">
          <StatusBadge status={supplier.is_active ? 'active' : 'inactive'} />
          <div className="mt-3 flex flex-col gap-2.5 text-sm text-ink-700">
            {supplier.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-ink-300" /> {supplier.phone}</p>}
            {supplier.address && <p className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-ink-300" /> {supplier.address}</p>}
            {supplier.gst_number && <p className="text-xs text-ink-500">GST: {supplier.gst_number}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-ink-500">Total Purchases</p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{purchaseCount}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-ink-500">Total Purchase Value</p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{formatCurrency(totalPurchaseValue)}</p>
            {purchaseCount > purchases.length && (
              <p className="mt-0.5 text-[11px] text-ink-300">Based on the {purchases.length} most recent purchases shown below.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <p className="mb-3 text-sm font-semibold text-ink-900">Recent purchases</p>
        {purchases.length === 0 ? (
          <EmptyState title="No purchases recorded from this supplier yet." />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {purchases.slice(0, 15).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink-900">{p.invoice_reference || `Purchase #${p.id}`}</p>
                  <p className="text-xs text-ink-500">{new Date(p.purchase_date).toLocaleDateString('en-IN')} · {p.items.length} item{p.items.length !== 1 ? 's' : ''}</p>
                </div>
                <p className="font-medium text-ink-900">{formatCurrency(p.total_amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl max-h-full">
            <p className="mb-4 text-sm font-semibold text-ink-900">Edit supplier</p>
            <SupplierForm initial={supplier} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} isSubmitting={isSaving} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate this supplier?"
        description="They'll be marked inactive; existing purchase history is preserved."
        confirmLabel="Deactivate"
        danger
        isSubmitting={isDeactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </div>
  )
}
