import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-brand-50 text-brand-700',
    inactive: 'bg-ink-300/10 text-ink-500',
    paid: 'bg-brand-50 text-brand-700',
    partial: 'bg-lime-300/30 text-status-warning',
    pending: 'bg-ink-300/10 text-ink-500',
    failed: 'bg-status-danger/10 text-status-danger',
    reversed: 'bg-status-danger/10 text-status-danger',
    confirmed: 'bg-brand-50 text-brand-700',
    cancelled: 'bg-status-danger/10 text-status-danger',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] ?? 'bg-ink-300/10 text-ink-500'}`}>
      {status}
    </span>
  )
}

export function PageHeader({
  title,
  backTo,
  action,
}: {
  title: string
  backTo?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        {backTo && (
          <Link to={backTo} className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-700">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        )}
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
      </div>
      {action}
    </div>
  )
}
