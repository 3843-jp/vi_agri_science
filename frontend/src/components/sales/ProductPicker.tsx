import { useEffect, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { productsApi } from '../../api/products'
import type { Product } from '../../types'

export function ProductPicker({ onPick }: { onPick: (product: Product) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setIsSearching(true)
    const handle = setTimeout(() => {
      productsApi
        .list({ search: query, is_active: true })
        .then((r) => setResults(r.results))
        .finally(() => setIsSearching(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [query])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search product by name or SKU…"
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {open && query.trim() && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
            {isSearching ? (
              <p className="px-4 py-3 text-sm text-ink-500">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-ink-500">No products found.</p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onPick(p); setQuery(''); setResults([]); setOpen(false) }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-muted"
                >
                  <div>
                    <p className="font-medium text-ink-900">{p.name}</p>
                    <p className="text-xs text-ink-500">
                      {p.sku} · {p.current_stock} {p.unit_name} in stock
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-sm font-medium text-ink-900">₹{p.selling_price}</span>
                    <Plus className="h-4 w-4 text-brand-600" />
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
