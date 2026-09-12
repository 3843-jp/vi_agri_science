import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary: 'border border-line bg-surface text-ink-700 hover:bg-surface-muted',
  danger: 'bg-status-danger text-white hover:bg-status-danger/90',
  ghost: 'text-ink-700 hover:bg-surface-muted',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
}

export function Button({ variant = 'primary', icon, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

export function LinkButton({
  to,
  variant = 'primary',
  icon,
  children,
}: {
  to: string
  variant?: Variant
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${variantClasses[variant]}`}
    >
      {icon}
      {children}
    </Link>
  )
}
