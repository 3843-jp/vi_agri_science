import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

export function SearchBar({
  placeholder = 'Search…',
  onSearch,
}: {
  placeholder?: string
  onSearch: (query: string) => void
}) {
  const [value, setValue] = useState('')

  // Debounced so we don't hit the backend on every keystroke — the API
  // already supports server-side `search=` filtering (Section 4 of Phase 6).
  useEffect(() => {
    const handle = setTimeout(() => onSearch(value), 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  )
}
