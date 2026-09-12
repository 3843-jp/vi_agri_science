import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  sublabel,
}: {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'danger'
  sublabel?: string
}) {
  const toneClasses: Record<string, string> = {
    default: 'bg-brand-50 text-brand-700',
    success: 'bg-brand-50 text-brand-700',
    warning: 'bg-lime-300/30 text-status-warning',
    danger: 'bg-status-danger/10 text-status-danger',
  }

  return (
    <div className="flex items-start justify-between rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
        {sublabel && <p className="mt-1 text-xs text-ink-300">{sublabel}</p>}
      </div>
      <div className={`rounded-xl p-2.5 ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  )
}
