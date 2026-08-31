import { AlertTriangle } from 'lucide-react'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  isSubmitting?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${danger ? 'bg-status-danger/10 text-status-danger' : 'bg-brand-50 text-brand-700'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-900">{title}</p>
            <p className="mt-1 text-sm text-ink-500">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-surface-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              danger ? 'bg-status-danger hover:bg-status-danger/90' : 'bg-brand-700 hover:bg-brand-800'
            }`}
          >
            {isSubmitting ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
