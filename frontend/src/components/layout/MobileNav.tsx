import { NavLink } from 'react-router-dom'
import { Sprout, X } from 'lucide-react'
import { NAV_SECTIONS } from './navConfig'
import { useAuth } from '../../hooks/useAuth'

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hasPermission } = useAuth()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-brand-950 text-brand-100">
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-500">
              <Sprout className="h-4 w-4 text-brand-950" />
            </div>
            <p className="text-sm font-semibold text-white">VI AGRI SCIENCE</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-brand-200 hover:bg-brand-900" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 pb-6">
          {NAV_SECTIONS.map((section, idx) => {
            const visibleItems = section.items.filter((item) => !item.permission || hasPermission(item.permission))
            if (visibleItems.length === 0) return null
            return (
              <div key={idx} className="mb-5">
                {section.title && (
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-400">
                    {section.title}
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
                          isActive ? 'bg-brand-800 text-white' : 'text-brand-200 hover:bg-brand-900 hover:text-white'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}
