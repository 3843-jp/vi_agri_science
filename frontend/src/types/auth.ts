// Matches accounts/serializers.py exactly — do not add fields the backend
// doesn't actually return.

export interface Permission {
  id: number
  codename: string
  description: string
}

export interface Role {
  id: number
  name: string
  description: string
  is_system_role: boolean
  permissions: Permission[]
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: number | null
  role_name: string | null
  is_active: boolean
  is_active_employee: boolean
  is_superuser: boolean
  permissions: string[] // codenames, e.g. "ADD_SALE"
  date_joined: string
  last_login: string | null
}

// Response shape of POST /api/auth/login/ (CustomTokenObtainPairSerializer)
export interface LoginResponse {
  access: string
  user: User
}
