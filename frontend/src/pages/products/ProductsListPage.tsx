import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Package } from 'lucide-react'
import { productsApi } from '../../api/products'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useAuth } from '../../hooks/useAuth'
import type { ProductCategory } from '../../types'
import { PageHeader } from '../../components/ui/StatusBadge'
import { LinkButton } from '../../components/ui/Button'
import { SearchBar } from '../../components/ui/SearchBar'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { inputClasses } from '../../utils/inputStyles'

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

function stockLabel(current: number, minimum: string) {
  const min = Number(minimum)
  if (current <= 0) return { text: 'Out of Stock', className: 'bg-status-danger/10 text-status-danger' }
  if (current <= min) return { text: 'Low Stock', className: 'bg-lime-300/30 text-status-warning' }
  return { text: 'In Stock', className: 'bg-brand-50 text-brand-700' }
}

export function ProductsListPage() {
  const { hasPermission } = useAuth()
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [categories, setCategories] = useState<ProductCategory[]>([])

  useEffect(() => { productsApi.categories().then(setCategories) }, [])

  const { items, count, totalPages, currentPage, pageSize, isLoading, error, setPage, handleSearch, reload } =
    usePaginatedList(productsApi.list, categoryFilter ? { category: categoryFilter } : {})

  const canAdd = hasPermission('ADD_PRODUCT')

  return (
    <div>
      <PageHeader
        title="Products"
        action={canAdd ? <LinkButton to="/products/new" icon={<Plus className="h-4 w-4" />}>Add Product</LinkButton> : undefined}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar placeholder="Search by name, SKU, brand…" onSearch={handleSearch} />
        <select
          className={`${inputClasses()} sm:w-56`}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading products…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No products found."
          description="Try a different search or filter, or add your first product."
          action={canAdd ? <LinkButton to="/products/new" icon={<Plus className="h-4 w-4" />}>Add Product</LinkButton> : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => {
                  const stock = stockLabel(p.current_stock, p.minimum_stock_level)
                  return (
                    <tr key={p.id} className="hover:bg-surface-muted">
                      <td className="px-4 py-3 font-mono text-xs text-ink-500">{p.sku}</td>
                      <td className="px-4 py-3 font-medium text-ink-900">{p.name}</td>
                      <td className="px-4 py-3 text-ink-700">{p.category_name}</td>
                      <td className="px-4 py-3 text-ink-700">{p.unit_name}</td>
                      <td className="px-4 py-3 text-right text-ink-700">{formatCurrency(p.selling_price)}</td>
                      <td className="px-4 py-3 text-right text-ink-700">{p.current_stock}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stock.className}`}>{stock.text}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/products/${p.id}`} className="text-sm font-medium text-brand-700 hover:underline">View</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col divide-y divide-line lg:hidden">
            {items.map((p) => {
              const stock = stockLabel(p.current_stock, p.minimum_stock_level)
              return (
                <Link key={p.id} to={`/products/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-surface-muted">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Package className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-900">{p.name}</p>
                      <p className="text-xs text-ink-500">{p.sku} · {formatCurrency(p.selling_price)}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stock.className}`}>{stock.text}</span>
                </Link>
              )
            })}
          </div>

          <div className="px-4 pb-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} count={count} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  )
}
