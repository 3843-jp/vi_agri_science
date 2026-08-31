import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SlidersHorizontal, Boxes } from 'lucide-react'
import { productsApi } from '../../api/products'
import { inventoryApi } from '../../api/inventory'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import type { Product } from '../../types'
import { PageHeader } from '../../components/ui/StatusBadge'
import { SearchBar } from '../../components/ui/SearchBar'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { StockAdjustmentForm, type StockAdjustmentFormValues } from '../../components/inventory/StockAdjustmentForm'

function stockStatus(product: Product) {
  if (product.current_stock <= 0) return { text: 'Out of Stock', className: 'bg-status-danger/10 text-status-danger' }
  if (product.is_low_stock) return { text: 'Low Stock', className: 'bg-lime-300/30 text-status-warning' }
  return { text: 'In Stock', className: 'bg-brand-50 text-brand-700' }
}

export function InventoryListPage() {
  const { hasPermission } = useAuth()
  const { showSuccess, showError } = useToast()
  const { items, count, totalPages, currentPage, pageSize, isLoading, error, setPage, handleSearch, reload } =
    usePaginatedList(productsApi.list, { is_active: true })

  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const canAdjust = hasPermission('ADJUST_STOCK')

  async function handleAdjust(values: StockAdjustmentFormValues) {
    if (!adjustTarget) return
    setIsAdjusting(true)
    try {
      await inventoryApi.adjust({ product: adjustTarget.id, quantity: values.quantity, reason: values.reason })
      showSuccess(`Stock adjusted for ${adjustTarget.name}.`)
      setAdjustTarget(null)
      reload()
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsAdjusting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Inventory" />

      <div className="mb-4">
        <SearchBar placeholder="Search by product name or SKU…" onSearch={handleSearch} />
      </div>

      {isLoading ? (
        <LoadingState label="Loading inventory…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState title="No products found." />
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Minimum</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => {
                  const status = stockStatus(p)
                  return (
                    <tr key={p.id} className="hover:bg-surface-muted">
                      <td className="px-4 py-3">
                        <Link to={`/products/${p.id}`} className="font-medium text-ink-900 hover:text-brand-700">{p.name}</Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-500">{p.sku}</td>
                      <td className="px-4 py-3 text-right text-ink-700">{p.current_stock}</td>
                      <td className="px-4 py-3 text-ink-700">{p.unit_name}</td>
                      <td className="px-4 py-3 text-right text-ink-700">{p.minimum_stock_level}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.text}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canAdjust && (
                          <button
                            onClick={() => setAdjustTarget(p)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col divide-y divide-line lg:hidden">
            {items.map((p) => {
              const status = stockStatus(p)
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <Link to={`/products/${p.id}`} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Boxes className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-900">{p.name}</p>
                      <p className="text-xs text-ink-500">{p.current_stock} {p.unit_name} · min {p.minimum_stock_level}</p>
                    </div>
                  </Link>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.text}</span>
                    {canAdjust && (
                      <button onClick={() => setAdjustTarget(p)} className="text-xs font-medium text-brand-700">Adjust</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="px-4 pb-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} count={count} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </div>
      )}

      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAdjustTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-4 text-sm font-semibold text-ink-900">Adjust stock</p>
            <StockAdjustmentForm product={adjustTarget} onSubmit={handleAdjust} onCancel={() => setAdjustTarget(null)} isSubmitting={isAdjusting} />
          </div>
        </div>
      )}
    </div>
  )
}
