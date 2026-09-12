import { useEffect, useState, type FormEvent } from 'react'
import type { Product, ProductCategory, Unit, Supplier } from '../../types'
import { productsApi } from '../../api/products'
import { suppliersApi } from '../../api/purchases'
import { FormField } from '../ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { QuickAddSelect } from '../ui/QuickAddSelect'
import { Button } from '../ui/Button'
import { isBlank, isNonNegativeNumber } from '../../utils/validation'

export interface ProductFormValues {
  sku: string
  name: string
  category: number | ''
  brand: string
  unit: number | ''
  purchase_price: string
  selling_price: string
  minimum_stock_level: string
  supplier: number | ''
  description: string
  is_active: boolean
  opening_stock: string // only meaningful on create
}

const emptyValues: ProductFormValues = {
  sku: '', name: '', category: '', brand: '', unit: '',
  purchase_price: '', selling_price: '', minimum_stock_level: '0',
  supplier: '', description: '', is_active: true, opening_stock: '0',
}

export function ProductForm({
  initial,
  isEdit = false,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initial?: Partial<Product>
  isEdit?: boolean
  onSubmit: (values: ProductFormValues) => Promise<void>
  onCancel?: () => void
  isSubmitting: boolean
}) {
  const [values, setValues] = useState<ProductFormValues>({
    ...emptyValues,
    ...(initial as Partial<ProductFormValues>),
    supplier: initial?.supplier ?? '',
    opening_stock: '0',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({})
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    productsApi.categories().then(setCategories)
    productsApi.units().then(setUnits)
    suppliersApi.list().then((r) => setSuppliers(r.results))
  }, [])

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof ProductFormValues, string>> = {}
    if (isBlank(values.sku)) next.sku = 'SKU is required.'
    if (isBlank(values.name)) next.name = 'Product name is required.'
    if (!values.category) next.category = 'Category is required.'
    if (!values.unit) next.unit = 'Unit is required.'
    if (isBlank(values.purchase_price) || !isNonNegativeNumber(values.purchase_price)) next.purchase_price = 'Enter a valid purchase price.'
    if (isBlank(values.selling_price) || !isNonNegativeNumber(values.selling_price)) next.selling_price = 'Enter a valid selling price.'
    if (!isNonNegativeNumber(values.minimum_stock_level)) next.minimum_stock_level = 'Minimum stock cannot be negative.'
    if (!isEdit && !isNonNegativeNumber(values.opening_stock)) next.opening_stock = 'Opening stock cannot be negative.'
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="SKU" htmlFor="sku" required error={errors.sku}>
          <input id="sku" className={inputClasses(!!errors.sku)} value={values.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} placeholder="SKU-UREA" />
        </FormField>
        <FormField label="Product name" htmlFor="name" required error={errors.name}>
          <input id="name" className={inputClasses(!!errors.name)} value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Urea" />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Category" htmlFor="category" required error={errors.category}>
          <QuickAddSelect
            id="category"
            value={values.category}
            options={categories.map((c) => ({ id: c.id, label: c.name }))}
            onChange={(id) => set('category', id)}
            onCreate={async (name) => {
              const c = await productsApi.createCategory(name)
              setCategories((prev) => [...prev, c])
              return { id: c.id, label: c.name }
            }}
            placeholder="Category"
            hasError={!!errors.category}
          />
        </FormField>
        <FormField label="Unit" htmlFor="unit" required error={errors.unit}>
          <QuickAddSelect
            id="unit"
            value={values.unit}
            options={units.map((u) => ({ id: u.id, label: u.name }))}
            onChange={(id) => set('unit', id)}
            onCreate={async (name) => {
              const u = await productsApi.createUnit(name)
              setUnits((prev) => [...prev, u])
              return { id: u.id, label: u.name }
            }}
            placeholder="Unit"
            hasError={!!errors.unit}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Brand" htmlFor="brand" hint="Optional.">
          <input id="brand" className={inputClasses()} value={values.brand} onChange={(e) => set('brand', e.target.value)} />
        </FormField>
        <FormField label="Supplier" htmlFor="supplier" hint="Optional.">
          <select id="supplier" className={inputClasses()} value={values.supplier} onChange={(e) => set('supplier', e.target.value ? Number(e.target.value) : '')}>
            <option value="">None</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Purchase price (₹)" htmlFor="purchase_price" required error={errors.purchase_price}>
          <input id="purchase_price" type="number" min="0" step="0.01" className={inputClasses(!!errors.purchase_price)} value={values.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} />
        </FormField>
        <FormField label="Selling price (₹)" htmlFor="selling_price" required error={errors.selling_price}>
          <input id="selling_price" type="number" min="0" step="0.01" className={inputClasses(!!errors.selling_price)} value={values.selling_price} onChange={(e) => set('selling_price', e.target.value)} />
        </FormField>
        <FormField label="Minimum stock" htmlFor="minimum_stock_level" error={errors.minimum_stock_level}>
          <input id="minimum_stock_level" type="number" min="0" step="0.01" className={inputClasses(!!errors.minimum_stock_level)} value={values.minimum_stock_level} onChange={(e) => set('minimum_stock_level', e.target.value)} />
        </FormField>
      </div>

      {!isEdit && (
        <FormField
          label="Opening stock" htmlFor="opening_stock" error={errors.opening_stock}
          hint="Recorded as an OPENING inventory movement — never a raw editable stock number."
        >
          <input id="opening_stock" type="number" min="0" step="0.01" className={inputClasses(!!errors.opening_stock)} value={values.opening_stock} onChange={(e) => set('opening_stock', e.target.value)} />
        </FormField>
      )}

      <FormField label="Description" htmlFor="description">
        <textarea id="description" rows={2} className={inputClasses()} value={values.description} onChange={(e) => set('description', e.target.value)} />
      </FormField>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={values.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500" />
          Active
        </label>
      )}

      <div className="mt-2 flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save product'}</Button>
      </div>
    </form>
  )
}
