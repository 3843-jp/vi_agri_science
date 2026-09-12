import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const TABS = [
  { label: 'Overview', to: '/admin', permission: 'MANAGE_USERS' as const },
  { label: 'Users', to: '/admin/users', permission: 'MANAGE_USERS' as const },
  { label: 'Roles', to: '/admin/roles', permission: 'MANAGE_ROLES' as const },
  { label: 'Permissions', to: '/admin/permissions', permission: 'MANAGE_ROLES' as const },
  { label: 'Audit Logs', to: '/admin/audit-logs', permission: 'VIEW_AUDIT_LOG' as const },
  { label: 'Settings', to: '/admin/settings', permission: 'MANAGE_SETTINGS' as const },
]

export function AdminTabs() {
  const { hasPermission } = useAuth()
  const visible = TABS.filter((t) => hasPermission(t.permission))

  return (
    <div className="mb-5 flex flex-wrap gap-1.5 border-b border-line pb-3">
      {visible.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/admin'}
          className={({ isActive }) =>
            `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive ? 'bg-brand-700 text-white' : 'text-ink-700 hover:bg-surface-muted'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
