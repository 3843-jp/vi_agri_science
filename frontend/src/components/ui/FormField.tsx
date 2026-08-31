import type { ReactNode } from 'react'

export function FormField({
  label,
  htmlFor,
  error,
  required,
  children,
  hint,
}: {
  label: string
  htmlFor: string
  error?: string
  required?: boolean
  children: ReactNode
  hint?: string
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
        {required && <span className="text-status-danger"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-300">{hint}</p>}
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  )
}
