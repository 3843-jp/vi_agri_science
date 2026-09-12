import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users as UsersIcon, UserCheck, UserX, ShieldCheck } from 'lucide-react'
import { usersApi, rolesApi, auditApi } from '../../api/admin'
import { extractErrorMessage } from '../../api/axios'
import type { User, AuditLog } from '../../types'
import { PageHeader } from '../../components/ui/StatusBadge'
import { AdminTabs } from '../../components/admin/AdminTabs'
import { StatCard } from '../../components/ui/StatCard'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'

// Admin-specific action set, distinct from the business Activity/Exceptions
// feed on the Reports page — this shows administrative changes (users,
// roles, settings), not sales/payment/stock activity.
const ADMIN_ACTIONS = [
  'CREATE_USER', 'UPDATE_USER', 'DEACTIVATE_USER', 'REACTIVATE_USER',
  'CREATE_ROLE', 'UPDATE_ROLE', 'UPDATE_BUSINESS_SETTINGS',
]

const ACTION_LABELS: Record<string, string> = {
  CREATE_USER: 'User created', UPDATE_USER: 'User updated', DEACTIVATE_USER: 'User deactivated',
  REACTIVATE_USER: 'User reactivated', CREATE_ROLE: 'Role created', UPDATE_ROLE: 'Role updated',
  UPDATE_BUSINESS_SETTINGS: 'Business settings changed',
}

export function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roleCount, setRoleCount] = useState(0)
  const [activity, setActivity] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([usersApi.list({ page_size: 200 }), rolesApi.list(), auditApi.list({ page: 1 })])
      .then(([u, r, a]) => {
        setUsers(u.results)
        setRoleCount(r.count)
        setActivity(a.results.filter((log) => ADMIN_ACTIONS.includes(log.action)).slice(0, 8))
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <LoadingState label="Loading admin overview…" />
  if (error) return <ErrorState message={error} />

  const activeCount = users.filter((u) => u.is_active).length
  const inactiveCount = users.length - activeCount

  return (
    <div>
      <PageHeader title="Administration" />
      <AdminTabs />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Users" value={String(activeCount)} icon={UserCheck} />
        <StatCard label="Inactive Users" value={String(inactiveCount)} icon={UserX} tone={inactiveCount > 0 ? 'warning' : 'default'} />
        <StatCard label="Roles" value={String(roleCount)} icon={ShieldCheck} />
        <StatCard label="Total Accounts" value={String(users.length)} icon={UsersIcon} />
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink-900">Recent admin activity</p>
          <Link to="/admin/audit-logs" className="text-xs font-medium text-brand-700 hover:underline">View all</Link>
        </div>
        {activity.length === 0 ? (
          <EmptyState title="No administrative changes recorded yet." />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink-900">{ACTION_LABELS[a.action] ?? a.action}</p>
                  <p className="text-xs text-ink-500">By {a.username ?? 'unknown'}</p>
                </div>
                <p className="text-xs text-ink-500">{new Date(a.created_at).toLocaleString('en-IN')}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
