import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  currentPage,
  totalPages,
  count,
  pageSize,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  count: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, count)

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-1 pt-4 sm:flex-row">
      <p className="text-xs text-ink-500">
        Showing <span className="font-medium text-ink-700">{start}–{end}</span> of{' '}
        <span className="font-medium text-ink-700">{count}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-700 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <span className="px-2 text-xs text-ink-500">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-700 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
