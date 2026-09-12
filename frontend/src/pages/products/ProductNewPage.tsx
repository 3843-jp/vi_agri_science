import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { productsApi } from '../../api/products'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { PageHeader } from '../../components/ui/StatusBadge'
import { ProductForm, type ProductFormValues } from '../../components/products/ProductForm'

export function ProductNewPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(values: ProductFormValues) {
    setIsSubmitting(true)
    try {
      const product = await productsApi.create({
        ...values,
        category: values.category || undefined,
        unit: values.unit || undefined,
        supplier: values.supplier || null,
      } as never)
      showSuccess(`${product.name} was added.`)
      navigate(`/products/${product.id}`)
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add Product" backTo="/products" />
      <div className="rounded-2xl border border-line bg-surface p-5">
        <ProductForm onSubmit={handleSubmit} onCancel={() => navigate('/products')} isSubmitting={isSubmitting} />
      </div>
    </div>
  )
}
