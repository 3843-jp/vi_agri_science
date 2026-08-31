import { api } from './axios'
import type { LoginResponse, User, Permission } from '../types'

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login/', { username, password }).then((r) => r.data),

  me: () => api.get<User>('/auth/me/').then((r) => r.data),

  permissions: () => api.get<Permission[]>('/permissions/').then((r) => r.data),
}
