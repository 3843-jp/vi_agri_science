import { useEffect, useState, useCallback, Fragment } from 'react'
import { Plus } from 'lucide-react'
import { rolesApi, permissionsApi } from '../../api/admin'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import type { Role, Permission } from '../../types'
import { groupPermissions } from '../../utils/permissionGroups'
import { PageHeader } from '../../components/ui/StatusBadge'
import { AdminTabs } from '../../components/admin/AdminTabs'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

export function RolesPage() {
  const { hasPermission } = useAuth()
  const { showSuccess, showError } = useToast()
  const canManage = hasPermission('MANAGE_ROLES')

  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  // roleId -> set of currently-checked codenames (local editable state)
  const [selections, setSelections] = useState<Record<number, Set<string>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    Promise.all([rolesApi.list(), permissionsApi.list()])
      .then(([r, p]) => {
        setRoles(r.results)
        setPermissions(p)
        const initial: Record<number, Set<string>> = {}
        r.results.forEach((role) => { initial[role.id] = new Set(role.permissions.map((perm) => perm.codename)) })
        setSelections(initial)
      })
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(load, [load])

  function toggle(roleId: number, codename: string) {
    if (!canManage) return
    setSelections((prev) => {
      const next = new Set(prev[roleId])
      if (next.has(codename)) next.delete(codename)
      else next.add(codename)
      return { ...prev, [roleId]: next }
    })
  }

  function isDirty(role: Role): boolean {
    const original = new Set(role.permissions.map((p) => p.codename))
    const current = selections[role.id] ?? original
    if (original.size !== current.size) return true
    for (const c of original) if (!current.has(c)) return true
    return false
  }

  async function handleSave(role: Role) {
    setSavingRoleId(role.id)
    try {
      const updated = await rolesApi.update(role.id, { permission_codes: Array.from(selections[role.id] ?? []) })
      showSuccess(`${role.name} permissions updated.`)
      setRoles((prev) => prev.map((r) => (r.id === role.id ? updated : r)))
    } catch (err) {
      // Owner-safety block ("Cannot remove MANAGE_USERS from this role...")
      // surfaces here verbatim from the backend.
      showError(extractErrorMessage(err))
    } finally {
      setSavingRoleId(null)
    }
  }

  async function handleCreateRole() {
    if (!newRoleName.trim()) return
    setIsCreating(true)
    try {
      await rolesApi.create({ name: newRoleName.trim() })
      showSuccess('Role created.')
      setNewRoleName('')
      setCreateOpen(false)
      load()
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading roles…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  const groups = groupPermissions(permissions)

  return (
    <div>
      <PageHeader
        title="Roles"
        action={canManage ? <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Add Role</Button> : undefined}
      />
      <AdminTabs />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {roles.map((r) => (
          <div key={r.id} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-ink-900">{r.name}</p>
            <p className="text-xs text-ink-500">{r.permissions.length} permissions</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <th className="sticky left-0 bg-surface px-4 py-3">Permission</th>
              {roles.map((r) => (
                <th key={r.id} className="px-4 py-3 text-center">{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {groups.map((group) => (
              <Fragment key={group.label}>
                <tr className="bg-surface-muted">
                  <td colSpan={roles.length + 1} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {group.label}
                  </td>
                </tr>
                {group.items.map((perm) => (
                  <tr key={perm.codename}>
                    <td className="sticky left-0 bg-surface px-4 py-2 font-mono text-xs text-ink-700">{perm.codename}</td>
                    {roles.map((role) => (
                      <td key={role.id} className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          disabled={!canManage}
                          checked={selections[role.id]?.has(perm.codename) ?? false}
                          onChange={() => toggle(role.id, perm.codename)}
                          className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500 disabled:opacity-40"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && roles.some((r) => isDirty(r)) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {roles.filter((r) => isDirty(r)).map((r) => (
            <Button key={r.id} onClick={() => handleSave(r)} disabled={savingRoleId === r.id} className="text-xs !px-3 !py-1.5">
              {savingRoleId === r.id ? 'Saving…' : `Save ${r.name}`}
            </Button>
          ))}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-4 text-sm font-semibold text-ink-900">Add role</p>
            <FormField label="Role name" htmlFor="new_role_name" required>
              <input id="new_role_name" className={inputClasses()} value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} autoFocus />
            </FormField>
            <p className="mt-2 text-xs text-ink-500">New roles start with no permissions — assign them in the matrix below after creating.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={isCreating}>Cancel</Button>
              <Button onClick={handleCreateRole} disabled={isCreating || !newRoleName.trim()}>{isCreating ? 'Creating…' : 'Create'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
