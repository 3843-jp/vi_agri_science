import { useState } from 'react'
import { Plus, UserCog, RotateCcw, Pencil } from 'lucide-react'
import { usersApi } from '../../api/admin'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { extractErrorMessage } from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import type { User } from '../../types'
import { PageHeader, StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { SearchBar } from '../../components/ui/SearchBar'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { AdminTabs } from '../../components/admin/AdminTabs'
import { UserForm, type UserFormValues } from '../../components/admin/UserForm'

export function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth()
  const { showSuccess, showError } = useToast()
  const { items, count, totalPages, currentPage, pageSize, isLoading, error, setPage, handleSearch, reload } =
    usePaginatedList(usersApi.list)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const canManage = hasPermission('MANAGE_USERS')

  async function handleCreate(values: UserFormValues) {
    setIsSubmitting(true)
    try {
      await usersApi.create({
        username: values.username, password: values.password, first_name: values.first_name,
        last_name: values.last_name, email: values.email, phone: values.phone, role: values.role || undefined,
      })
      showSuccess('User created.')
      setCreateOpen(false)
      reload()
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEdit(values: UserFormValues) {
    if (!editTarget) return
    setIsSubmitting(true)
    try {
      await usersApi.update(editTarget.id, {
        first_name: values.first_name, last_name: values.last_name,
        email: values.email, phone: values.phone, role: values.role || undefined,
      })
      showSuccess('User updated.')
      setEditTarget(null)
      reload()
    } catch (err) {
      showError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setIsDeactivating(true)
    try {
      await usersApi.deactivate(deactivateTarget.id)
      showSuccess('User deactivated.')
      setDeactivateTarget(null)
      reload()
    } catch (err) {
      // Owner-safety block from the backend surfaces here verbatim —
      // e.g. "Cannot deactivate this user: they are the last account..."
      showError(extractErrorMessage(err))
      setIsDeactivating(false)
    }
  }

  async function handleReactivate(u: User) {
    try {
      await usersApi.reactivate(u.id)
      showSuccess(`${u.username} can log in again.`)
      reload()
    } catch (err) {
      showError(extractErrorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        action={canManage ? <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Add User</Button> : undefined}
      />
      <AdminTabs />

      <div className="mb-4">
        <SearchBar placeholder="Search by username, name, email…" onSearch={handleSearch} />
      </div>

      {isLoading ? (
        <LoadingState label="Loading users…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState title="No users found." />
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-medium text-ink-900">{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3 text-ink-700">{u.username}</td>
                    <td className="px-4 py-3 text-ink-500">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-ink-700">{u.role_name ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.is_active ? 'active' : 'inactive'} /></td>
                    <td className="px-4 py-3 text-ink-500">{new Date(u.date_joined).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-ink-500">{u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN') : 'Never'}</td>
                    <td className="px-4 py-3 text-right">
                      {canManage && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditTarget(u)} className="text-ink-500 hover:text-brand-700" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                          {u.is_active ? (
                            <button
                              onClick={() => setDeactivateTarget(u)}
                              disabled={u.id === currentUser?.id}
                              className="text-ink-500 hover:text-status-danger disabled:opacity-30"
                              title={u.id === currentUser?.id ? "You can't deactivate your own account" : 'Deactivate'}
                            >
                              <UserCog className="h-4 w-4" />
                            </button>
                          ) : (
                            <button onClick={() => handleReactivate(u)} className="text-ink-500 hover:text-brand-700" title="Reactivate">
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col divide-y divide-line lg:hidden">
            {items.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <UserCog className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{u.username}</p>
                    <p className="text-xs text-ink-500">{u.role_name ?? 'No role'}</p>
                  </div>
                </div>
                <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
              </div>
            ))}
          </div>

          <div className="px-4 pb-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} count={count} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-4 text-sm font-semibold text-ink-900">Add user</p>
            <UserForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} isSubmitting={isSubmitting} />
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditTarget(null)} />
          <div className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl">
            <p className="mb-4 text-sm font-semibold text-ink-900">Edit user</p>
            <UserForm initial={editTarget} isEdit onSubmit={handleEdit} onCancel={() => setEditTarget(null)} isSubmitting={isSubmitting} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate this user?"
        description="The user will no longer be able to log in, but their historical transactions and audit records will remain."
        confirmLabel="Deactivate"
        danger
        isSubmitting={isDeactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  )
}
