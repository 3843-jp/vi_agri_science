import { inputClasses } from '../../utils/inputStyles'

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string
  dateTo: string
  onChange: (from: string, to: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onChange(e.target.value, dateTo)}
        className={`${inputClasses()} w-full sm:w-40`}
        aria-label="From date"
      />
      <span className="text-xs text-ink-300">to</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onChange(dateFrom, e.target.value)}
        className={`${inputClasses()} w-full sm:w-40`}
        aria-label="To date"
      />
    </div>
  )
}
