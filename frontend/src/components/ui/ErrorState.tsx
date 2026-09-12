import { AlertTriangle, RefreshCw } from 'lucide-react'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-status-danger/20 bg-status-danger/5 px-6 py-14 text-center">
      <AlertTriangle className="h-6 w-6 text-status-danger" />
      <p className="max-w-sm text-sm text-ink-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      )}
    </div>
  )
}
