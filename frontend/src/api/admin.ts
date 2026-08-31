import { api } from './axios'
import type { AuditLog, User, Role, Permission, BusinessSettings, Paginated } from '../types'

export const auditApi = {
  list: (params?: { user?: number; action?: string; entity_type?: string; entity_id?: string; date_from?: string; date_to?: string; search?: string; page?: number }) =>
    api.get<Paginated<AuditLog>>('/audit-logs/', { params }).then((r) => r.data),
}

export const usersApi = {
  list: (params?: { search?: string; role?: number; is_active_employee?: boolean; page?: number; page_size?: number }) =>
    api.get<Paginated<User>>('/users/', { params }).then((r) => r.data),

  create: (data: { username: string; password: string; first_name?: string; last_name?: string; email?: string; phone?: string; role?: number }) =>
    api.post<User>('/users/', data).then((r) => r.data),

  update: (id: number, data: Partial<Pick<User, 'first_name' | 'last_name' | 'email' | 'phone' | 'role'>>) =>
    api.patch<User>(`/users/${id}/`, data).then((r) => r.data),

  deactivate: (id: number) => api.delete(`/users/${id}/`).then((r) => r.data),

  reactivate: (id: number) => api.post<User>(`/users/${id}/reactivate/`).then((r) => r.data),
}

export const rolesApi = {
  list: () => api.get<Paginated<Role>>('/roles/').then((r) => r.data),

  create: (data: { name: string; description?: string; permission_codes?: string[] }) =>
    api.post<Role>('/roles/', data).then((r) => r.data),

  update: (id: number, data: { permission_codes?: string[]; name?: string; description?: string }) =>
    api.patch<Role>(`/roles/${id}/`, data).then((r) => r.data),
}

export const permissionsApi = {
  list: () => api.get<Permission[]>('/permissions/').then((r) => r.data),
}

export const businessSettingsApi = {
  get: () => api.get<BusinessSettings>('/settings/business/').then((r) => r.data),
  update: (data: Partial<BusinessSettings>) =>
    api.patch<BusinessSettings>('/settings/business/', data).then((r) => r.data),
}
