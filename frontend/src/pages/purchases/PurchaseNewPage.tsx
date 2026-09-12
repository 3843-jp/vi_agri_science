import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { purchasesApi } from '../../api/purchases'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import type { Supplier, Product } from '../../types'
import type { CartLine } from '../../types/cart'
import { PageHeader } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { SupplierPicker } from '../../components/purchases/SupplierPicker'
import { ProductPicker } from '../../components/sales/ProductPicker'
import { PurchaseItemsCart } from '../../components/purchases/PurchaseItemsCart'

export function PurchaseNewPage() {
  const navigate = useNavigate()
  const { showSuccess } = useToast()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [invoiceReference, setInvoiceReference] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<CartLine[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function addProduct(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) return prev.map((l) => (l.productId === product.id ? { ...l, quantity: String(Number(l.quantity) + 1) } : l))
      return [...prev, {
        key: `${product.id}-${Date.now()}`, productId: product.id, productName: product.name,
        sku: product.sku, unitLabel: product.unit_name, currentStock: product.current_stock,
        quantity: '1', unitPrice: product.purchase_price, discount: '0',
      }]
    })
  }

  async function handleSave() {
    setFormError(null)
    if (!supplier) { setFormError('Select a supplier first.'); return }
    if (lines.length === 0) { setFormError('Add at least one product.'); return }
    if (!purchaseDate) { setFormError('Purchase date is required.'); return }

    setIsSubmitting(true)
    try {
      // Backend handles Purchase + PurchaseItems + InventoryMovement +
      // AuditLog atomically — this is the only API call made here.
      const purchase = await purchasesApi.create({
        supplier: supplier.id,
        invoice_reference: invoiceReference,
        purchase_date: purchaseDate,
        notes,
        items_input: lines.map((l) => ({ product: l.productId, quantity: l.quantity, purchase_price: l.unitPrice })),
      })
      showSuccess(`Purchase from ${supplier.name} saved.`)
      navigate(`/purchases/${purchase.id}`)
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-24 lg:pb-0">
      <PageHeader title="New Purchase" backTo="/purchases" />

      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <FormField label="Supplier" htmlFor="supplier" required>
            <SupplierPicker selected={supplier} onSelect={setSupplier} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2">
          <FormField label="Purchase date" htmlFor="purchase_date" required>
            <input id="purchase_date" type="date" className={inputClasses()} value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </FormField>
          <FormField label="Invoice / reference number" htmlFor="invoice_reference" hint="Optional.">
            <input id="invoice_reference" className={inputClasses()} value={invoiceReference} onChange={(e) => setInvoiceReference(e.target.value)} />
          </FormField>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-ink-700">Add products</p>
          <ProductPicker onPick={addProduct} />
          <div className="mt-4">
            <PurchaseItemsCart
              lines={lines}
              onUpdate={(key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))}
              onRemove={(key) => setLines((prev) => prev.filter((l) => l.key !== key))}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <FormField label="Notes" htmlFor="notes" hint="Optional.">
            <textarea id="notes" rows={2} className={inputClasses()} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>

        {formError && <p className="rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">{formError}</p>}

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-3xl justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/purchases')} disabled={isSubmitting} className="hidden lg:inline-flex">
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSubmitting} className="w-full lg:w-auto">
              {isSubmitting ? 'Saving…' : 'Save Purchase'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
