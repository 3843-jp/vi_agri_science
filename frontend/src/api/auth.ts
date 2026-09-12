import { api } from './axios'
import type { LoginResponse, User, Permission } from '../types'

export const authApi = {
  csrf: () => api.get('/auth/csrf/').then((r) => r.data.csrfToken),

  login: async (username: string, password: string) => {
    const csrfToken = await authApi.csrf()

    return api.post<LoginResponse>(
      '/auth/login/',
      { username, password },
      {
        headers: {
          'X-CSRFToken': csrfToken,
        },
      }
    ).then((r) => r.data)
  },

  me: () => api.get<User>('/auth/me/').then((r) => r.data),
  refresh: () => api.post<{ access: string }>('/auth/refresh/').then((r) => r.data),
  logout: () => api.post('/auth/logout/').then((r) => r.data),

  permissions: () => api.get<Permission[]>('/permissions/').then((r) => r.data),
}
