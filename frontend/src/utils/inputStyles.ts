const baseInputClasses =
  'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-300'

export function inputClasses(hasError?: boolean) {
  return `${baseInputClasses} ${
    hasError
      ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/10'
      : 'border-line focus:border-brand-500 focus:ring-brand-100'
  }`
}
