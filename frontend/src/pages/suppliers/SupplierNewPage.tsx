import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { suppliersApi } from '../../api/purchases'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { PageHeader } from '../../components/ui/StatusBadge'
import { SupplierForm, type SupplierFormValues } from '../../components/suppliers/SupplierForm'

export function SupplierNewPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(values: SupplierFormValues) {
    setIsSubmitting(true)
    try {
      const supplier = await suppliersApi.create(values)
      showSuccess(`${supplier.name} was added.`)
      navigate(`/suppliers/${supplier.id}`)
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add Supplier" backTo="/suppliers" />
      <div className="rounded-2xl border border-line bg-surface p-5">
        <SupplierForm onSubmit={handleSubmit} onCancel={() => navigate('/suppliers')} isSubmitting={isSubmitting} />
      </div>
    </div>
  )
}
