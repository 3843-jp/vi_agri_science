import { useEffect, useState, type FormEvent } from 'react'
import type { Role, User } from '../../types'
import { rolesApi } from '../../api/admin'
import { FormField } from '../ui/FormField'
import { inputClasses } from '../../utils/inputStyles'
import { Button } from '../ui/Button'
import { isBlank } from '../../utils/validation'

export interface UserFormValues {
  username: string
  password: string
  first_name: string
  last_name: string
  email: string
  phone: string
  role: number | ''
}

const emptyValues: UserFormValues = {
  username: '', password: '', first_name: '', last_name: '', email: '', phone: '', role: '',
}

export function UserForm({
  initial,
  isEdit = false,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initial?: Partial<User>
  isEdit?: boolean
  onSubmit: (values: UserFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [values, setValues] = useState<UserFormValues>({
    ...emptyValues,
    username: initial?.username ?? '',
    first_name: initial?.first_name ?? '',
    last_name: initial?.last_name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    role: initial?.role ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormValues, string>>>({})
  const [roles, setRoles] = useState<Role[]>([])

  useEffect(() => { rolesApi.list().then((r) => setRoles(r.results)) }, [])

  function set<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof UserFormValues, string>> = {}
    if (isBlank(values.username)) next.username = 'Username is required.'
    if (!isEdit && values.password.length < 8) next.password = 'Password must be at least 8 characters.'
    if (!values.role) next.role = 'Role is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Username" htmlFor="username" required error={errors.username}>
        <input
          id="username" className={inputClasses(!!errors.username)} value={values.username}
          onChange={(e) => set('username', e.target.value)} disabled={isEdit}
        />
      </FormField>

      {!isEdit && (
        <FormField label="Password" htmlFor="password" required error={errors.password} hint="At least 8 characters.">
          <input
            id="password" type="password" className={inputClasses(!!errors.password)} value={values.password}
            onChange={(e) => set('password', e.target.value)}
          />
        </FormField>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="First name" htmlFor="first_name">
          <input id="first_name" className={inputClasses()} value={values.first_name} onChange={(e) => set('first_name', e.target.value)} />
        </FormField>
        <FormField label="Last name" htmlFor="last_name">
          <input id="last_name" className={inputClasses()} value={values.last_name} onChange={(e) => set('last_name', e.target.value)} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Email" htmlFor="email" hint="Optional.">
          <input id="email" type="email" className={inputClasses()} value={values.email} onChange={(e) => set('email', e.target.value)} />
        </FormField>
        <FormField label="Phone" htmlFor="phone" hint="Optional.">
          <input id="phone" className={inputClasses()} value={values.phone} onChange={(e) => set('phone', e.target.value)} />
        </FormField>
      </div>

      <FormField label="Role" htmlFor="role" required error={errors.role}>
        <select id="role" className={inputClasses(!!errors.role)} value={values.role} onChange={(e) => set('role', Number(e.target.value))}>
          <option value="" disabled>Select role…</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </FormField>

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}</Button>
      </div>
    </form>
  )
}
