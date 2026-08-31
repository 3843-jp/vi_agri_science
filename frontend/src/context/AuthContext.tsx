import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import { tokenStore } from '../api/tokenStore'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (code: string) => boolean
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  // On first mount: if a token already exists (page refresh), fetch the
  // current user's profile+permissions from /api/auth/me/ rather than
  // trusting anything cached — permissions could have changed server-side.
  useEffect(() => {
    const existingToken = tokenStore.getAccess() ?? localStorage.getItem('via_access_token')
    if (!existingToken) {
      setIsLoading(false)
      return
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setIsLoading(false))
  }, [])

  // The axios interceptor dispatches this when a token refresh fails, so
  // the UI reacts (redirect to /login) without a circular import between
  // the axios layer and this context.
  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const data = await authApi.login(username, password)
    tokenStore.setTokens(data.access, data.refresh)
    setUser(data.user)
  }, [])

  const hasPermission = useCallback(
    (code: string) => {
      if (!user) return false
      if (user.is_superuser) return true
      return user.permissions.includes(code)
    },
    [user],
  )

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, logout, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  )
}
