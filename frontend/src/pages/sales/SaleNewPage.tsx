import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { salesApi } from '../../api/sales'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import type { Customer, Product } from '../../types'
import type { CartLine } from '../../types/cart'
import { PageHeader } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { CustomerPicker } from '../../components/sales/CustomerPicker'
import { ProductPicker } from '../../components/sales/ProductPicker'
import { SaleItemsCart } from '../../components/sales/SaleItemsCart'
import { FormField } from '../../components/ui/FormField'
import { inputClasses } from '../../utils/inputStyles'

export function SaleNewPage() {
  const navigate = useNavigate()
  const { showSuccess } = useToast()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [lines, setLines] = useState<CartLine[]>([])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function addProduct(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: String(Number(l.quantity) + 1) } : l))
      }
      return [
        ...prev,
        {
          key: `${product.id}-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unitLabel: product.unit_name,
          currentStock: product.current_stock,
          quantity: '1',
          unitPrice: product.selling_price,
          discount: '0',
        },
      ]
    })
  }

  function updateLine(key: string, patch: Partial<CartLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  async function handleSave() {
    setFormError(null)
    if (!customer) { setFormError('Select a customer first.'); return }
    if (lines.length === 0) { setFormError('Add at least one product.'); return }

    setIsSubmitting(true)
    try {
      // The backend computes and validates the authoritative total and
      // stock availability — this call is the ONLY write; inventory
      // deduction happens inside Django's atomic sale-creation transaction,
      // never via a separate frontend call.
      const sale = await salesApi.create({
        customer: customer.id,
        notes,
        items_input: lines.map((l) => ({
          product: l.productId,
          quantity: l.quantity,
          unit_price: l.unitPrice,
          discount: l.discount,
        })),
      })
      showSuccess(`Sale ${sale.sale_number} saved.`)
      navigate(`/sales/${sale.id}`)
    } catch (err) {
      // e.g. "Insufficient stock for Urea: 8 available, 10 requested." —
      // the backend's own message, shown verbatim rather than guessed at.
      setFormError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-24 lg:pb-0">
      <PageHeader title="New Sale" backTo="/sales" />

      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <FormField label="Customer" htmlFor="customer" required>
            <CustomerPicker selected={customer} onSelect={setCustomer} />
          </FormField>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-ink-700">Add products</p>
          <ProductPicker onPick={addProduct} />
          <div className="mt-4">
            <SaleItemsCart lines={lines} onUpdate={updateLine} onRemove={removeLine} />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <FormField label="Notes" htmlFor="notes" hint="Optional.">
            <textarea id="notes" rows={2} className={inputClasses()} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>

        {formError && <p className="rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">{formError}</p>}

        {/* Sticky save action on mobile so it's always reachable while scrolling a long cart */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-3xl justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/sales')} disabled={isSubmitting} className="hidden lg:inline-flex">
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSubmitting} className="w-full lg:w-auto">
              {isSubmitting ? 'Saving…' : 'Save Sale'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
