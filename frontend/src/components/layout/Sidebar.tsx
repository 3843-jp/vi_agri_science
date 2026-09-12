import { NavLink } from 'react-router-dom'
import { Sprout } from 'lucide-react'
import { NAV_SECTIONS } from './navConfig'
import { useAuth } from '../../hooks/useAuth'

export function Sidebar() {
  const { hasPermission } = useAuth()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-brand-900/40 bg-brand-950 text-brand-100 lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500">
          <Sprout className="h-5 w-5 text-brand-950" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-white">VI AGRI SCIENCE</p>
          <p className="text-[11px] leading-tight text-brand-300">Planting dreams, harvesting life</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
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
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-800 text-white'
                          : 'text-brand-200 hover:bg-brand-900 hover:text-white'
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
  )
}
