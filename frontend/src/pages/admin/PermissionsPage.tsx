import { useEffect, useState } from 'react'
import { permissionsApi } from '../../api/admin'
import { extractErrorMessage } from '../../api/axios'
import type { Permission } from '../../types'
import { groupPermissions } from '../../utils/permissionGroups'
import { PageHeader } from '../../components/ui/StatusBadge'
import { AdminTabs } from '../../components/admin/AdminTabs'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

export function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    permissionsApi.list().then(setPermissions).catch((e) => setError(extractErrorMessage(e))).finally(() => setIsLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="Permissions" />
      <AdminTabs />

      {isLoading ? (
        <LoadingState label="Loading permissions…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groupPermissions(permissions).map((group) => (
            <div key={group.label} className="rounded-2xl border border-line bg-surface p-5">
              <p className="mb-3 text-sm font-semibold text-ink-900">{group.label}</p>
              <ul className="flex flex-col gap-1.5">
                {group.items.map((p) => (
                  <li key={p.codename} className="flex flex-col text-sm">
                    <span className="font-mono text-xs text-brand-700">{p.codename}</span>
                    {p.description && <span className="text-xs text-ink-500">{p.description}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
