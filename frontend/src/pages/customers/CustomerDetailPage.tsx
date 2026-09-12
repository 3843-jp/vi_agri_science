import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, UserX, Phone, MapPin, Building2 } from 'lucide-react'
import { customersApi } from '../../api/customers'
import { salesApi } from '../../api/sales'
import { paymentsApi } from '../../api/payments'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import type { CustomerDetail, Sale, Payment } from '../../types'
import { PageHeader, StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CustomerForm, type CustomerFormValues } from '../../components/customers/CustomerForm'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const customerId = Number(id)
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const { showSuccess, showError } = useToast()

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
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
      customersApi.retrieve(customerId),
      salesApi.list({ customer: customerId }),
      paymentsApi.list({ customer: customerId }),
    ])
      .then(([c, s, p]) => {
        setCustomer(c)
        setSales(s.results)
        setPayments(p.results)
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false))
  }, [customerId])

  useEffect(load, [load])

  async function handleUpdate(values: CustomerFormValues) {
    setIsSaving(true)
    try {
      await customersApi.update(customerId, values)
      showSuccess('Customer updated.')
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
      await customersApi.deactivate(customerId)
      showSuccess('Customer deactivated.')
      navigate('/customers')
    } catch (err) {
      showError(extractErrorMessage(err))
      setIsDeactivating(false)
      setConfirmDeactivate(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading customer…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!customer) return null

  const canEdit = hasPermission('UPDATE_CUSTOMER')
  const canDeactivate = hasPermission('DELETE_CUSTOMER')

  return (
    <div>
      <PageHeader
        title={customer.name}
        backTo="/customers"
        action={
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {canDeactivate && customer.status === 'active' && (
              <Button variant="danger" icon={<UserX className="h-4 w-4" />} onClick={() => setConfirmDeactivate(true)}>
                Deactivate
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Info card */}
        <div className="rounded-2xl border border-line bg-surface p-5 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <StatusBadge status={customer.status} />
            {customer.business_name && <span className="text-xs text-ink-500">{customer.business_name}</span>}
          </div>
          <div className="flex flex-col gap-2.5 text-sm text-ink-700">
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-ink-300" /> {customer.phone}</p>
            {customer.address && <p className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 shrink-0 text-ink-300 mt-0.5" /> {customer.address}</p>}
            {customer.gst_number && <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-ink-300" /> GST: {customer.gst_number}</p>}
          </div>
        </div>

        {/* Financial summary — all values come straight from the backend's
            CustomerDetailSerializer, never recalculated in React */}
        <div className="grid grid-cols-3 gap-3 lg:col-span-2">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-ink-500">Total Purchases</p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{formatCurrency(customer.total_purchases)}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-ink-500">Total Paid</p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{formatCurrency(customer.total_paid)}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-ink-500">Outstanding</p>
            <p className={`mt-1 text-lg font-semibold ${customer.outstanding_balance > 0 ? 'text-status-warning' : 'text-ink-900'}`}>
              {formatCurrency(customer.outstanding_balance)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="mb-3 text-sm font-semibold text-ink-900">Recent sales</p>
          {sales.length === 0 ? (
            <EmptyState title="No sales yet for this customer." />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {sales.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink-900">{s.sale_number}</p>
                    <p className="text-xs text-ink-500">{new Date(s.sale_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-ink-900">{formatCurrency(s.total_amount)}</p>
                    <StatusBadge status={s.payment_status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="mb-3 text-sm font-semibold text-ink-900">Payment history</p>
          {payments.length === 0 ? (
            <EmptyState title="No payments recorded for this customer." />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {payments.slice(0, 10).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink-900 capitalize">{p.method.replace('_', ' ')}</p>
                    <p className="text-xs text-ink-500">{new Date(p.payment_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-ink-900">{formatCurrency(p.amount)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl max-h-full">
            <p className="mb-4 text-sm font-semibold text-ink-900">Edit customer</p>
            <CustomerForm initial={customer} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} isSubmitting={isSaving} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate this customer?"
        description="They'll no longer appear in the active customer list, but their sales and payment history are preserved."
        confirmLabel="Deactivate"
        danger
        isSubmitting={isDeactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </div>
  )
}
