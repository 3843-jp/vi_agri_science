import { useState } from 'react'
import { Menu, LogOut, ChevronDown, User as UserIcon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-ink-700 hover:bg-surface-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-muted"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <UserIcon className="h-4 w-4" />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block leading-tight">{user?.first_name || user?.username}</span>
            <span className="block text-xs font-normal text-ink-500 leading-tight">{user?.role_name ?? 'No role'}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-ink-300" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-line bg-surface py-1.5 shadow-lg">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-status-danger hover:bg-status-danger/5"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
