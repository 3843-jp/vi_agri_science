import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, PackageX, Tag, Layers } from 'lucide-react'
import { productsApi } from '../../api/products'
import { inventoryApi } from '../../api/inventory'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import type { Product, InventoryMovement } from '../../types'
import { PageHeader } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ProductForm, type ProductFormValues } from '../../components/products/ProductForm'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

const movementTone: Record<string, string> = {
  OPENING: 'text-ink-500', PURCHASE: 'text-brand-700', SALE: 'text-status-danger',
  RETURN: 'text-brand-700', ADJUSTMENT: 'text-status-warning', DAMAGE: 'text-status-danger',
  CANCELLATION: 'text-brand-700',
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const productId = Number(id)
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const { showSuccess, showError } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    Promise.all([productsApi.retrieve(productId), inventoryApi.list({ product: productId })])
      .then(([p, m]) => { setProduct(p); setMovements(m.results) })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false))
  }, [productId])

  useEffect(load, [load])

  async function handleUpdate(values: ProductFormValues) {
    setIsSaving(true)
    try {
      await productsApi.update(productId, {
        ...values,
        category: values.category || undefined,
        unit: values.unit || undefined,
        supplier: values.supplier || null,
      } as never)
      showSuccess('Product updated.')
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
      await productsApi.deactivate(productId)
      showSuccess('Product deactivated.')
      navigate('/products')
    } catch (err) {
      showError(extractErrorMessage(err))
      setIsDeactivating(false)
      setConfirmDeactivate(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading product…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!product) return null

  const canEdit = hasPermission('UPDATE_PRODUCT')
  const canDeactivate = hasPermission('DELETE_PRODUCT')
  const stockTone = product.current_stock <= 0
    ? 'text-status-danger'
    : product.is_low_stock ? 'text-status-warning' : 'text-brand-700'
  const stockLabel = product.current_stock <= 0 ? 'Out of Stock' : product.is_low_stock ? 'Low Stock' : 'In Stock'

  return (
    <div>
      <PageHeader
        title={product.name}
        backTo="/products"
        action={
          <div className="flex gap-2">
            {canEdit && <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>Edit</Button>}
            {canDeactivate && product.is_active && (
              <Button variant="danger" icon={<PackageX className="h-4 w-4" />} onClick={() => setConfirmDeactivate(true)}>Deactivate</Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5 lg:col-span-1">
          <p className="font-mono text-xs text-ink-500">{product.sku}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-700">
            <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-ink-300" /> {product.category_name}</span>
            <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-ink-300" /> {product.unit_name}</span>
          </div>
          {product.brand && <p className="mt-2 text-sm text-ink-500">Brand: {product.brand}</p>}
          {product.description && <p className="mt-3 text-sm text-ink-700">{product.description}</p>}
          {!product.is_active && <p className="mt-3 text-xs font-medium text-status-danger">Inactive</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-ink-500">Current Stock</p>
            <p className={`mt-1 text-lg font-semibold ${stockTone}`}>{product.current_stock} <span className="text-xs font-normal">{stockLabel}</span></p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-ink-500">Minimum Stock</p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{product.minimum_stock_level}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-ink-500">Purchase Price</p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{formatCurrency(product.purchase_price)}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-ink-500">Selling Price</p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{formatCurrency(product.selling_price)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <p className="mb-3 text-sm font-semibold text-ink-900">Recent stock movements</p>
        {movements.length === 0 ? (
          <EmptyState title="No stock movements recorded yet." />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {movements.slice(0, 15).map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className={`font-medium capitalize ${movementTone[m.movement_type] ?? 'text-ink-700'}`}>{m.movement_type.toLowerCase()}</p>
                  <p className="text-xs text-ink-500">{new Date(m.created_at).toLocaleString('en-IN')}{m.notes ? ` · ${m.notes}` : ''}</p>
                </div>
                <p className={`font-medium ${Number(m.quantity) < 0 ? 'text-status-danger' : 'text-brand-700'}`}>
                  {Number(m.quantity) > 0 ? '+' : ''}{m.quantity}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-4 text-sm font-semibold text-ink-900">Edit product</p>
            <ProductForm
              initial={product}
              isEdit
              onSubmit={handleUpdate}
              onCancel={() => setEditOpen(false)}
              isSubmitting={isSaving}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate this product?"
        description="It will no longer be sellable, but its stock and sales history are preserved."
        confirmLabel="Deactivate"
        danger
        isSubmitting={isDeactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </div>
  )
}
