import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

interface Toast {
  id: number
  message: string
  variant: 'success' | 'error'
}

interface ToastContextValue {
  showSuccess: (message: string) => void
  showError: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, variant: Toast['variant']) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const showSuccess = useCallback((message: string) => push(message, 'success'), [push])
  const showError = useCallback((message: string) => push(message, 'error'), [push])

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              t.variant === 'success' ? 'bg-brand-800 text-white' : 'bg-status-danger text-white'
            }`}
          >
            {t.variant === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span>{t.message}</span>
            <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="ml-1 opacity-70 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
