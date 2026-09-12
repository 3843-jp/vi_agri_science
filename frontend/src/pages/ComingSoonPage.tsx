import type { LucideIcon } from 'lucide-react'

/**
 * Used only for routes whose backend API already exists but whose full
 * CRUD interface is scheduled for a later phase (Section 14: "do not
 * implement all business modules in one step"). This is never shown for
 * functionality that doesn't exist on the backend.
 */
export function ComingSoonPage({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-6 py-24 text-center">
      <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      <p className="max-w-sm text-sm text-ink-500">
        The API for this module is already live on the backend — the full interface here is coming in the next build phase.
      </p>
    </div>
  )
}
