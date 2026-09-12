import { useEffect, useState } from 'react'
import { Search, Building2, X } from 'lucide-react'
import { suppliersApi } from '../../api/purchases'
import type { Supplier } from '../../types'

export function SupplierPicker({
  selected,
  onSelect,
}: {
  selected: Supplier | null
  onSelect: (supplier: Supplier | null) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Supplier[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const handle = setTimeout(() => {
      suppliersApi.list({ search: query }).then((r) => setResults(r.results))
    }, 300)
    return () => clearTimeout(handle)
  }, [query])

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink-900">{selected.name}</p>
            <p className="text-xs text-ink-500">{selected.phone || 'No phone on file'}</p>
          </div>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-ink-300 hover:text-ink-700">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search supplier by name…"
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      {open && query.trim() && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
            {results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-ink-500">No suppliers found.</p>
            ) : (
              results.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onSelect(s); setQuery(''); setOpen(false) }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-surface-muted"
                >
                  <span className="font-medium text-ink-900">{s.name}</span>
                  <span className="text-xs text-ink-500">{s.phone}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
