import { useNavigate } from 'react-router-dom'
import { customersApi } from '../../api/customers'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { PageHeader } from '../../components/ui/StatusBadge'
import { CustomerForm, type CustomerFormValues } from '../../components/customers/CustomerForm'
import { useState } from 'react'

export function CustomerNewPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(values: CustomerFormValues) {
    setIsSubmitting(true)
    try {
      const customer = await customersApi.create(values)
      showSuccess(`${customer.name} was added.`)
      navigate(`/customers/${customer.id}`)
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add Customer" backTo="/customers" />
      <div className="rounded-2xl border border-line bg-surface p-5">
        <CustomerForm onSubmit={handleSubmit} onCancel={() => navigate('/customers')} isSubmitting={isSubmitting} />
      </div>
    </div>
  )
}
