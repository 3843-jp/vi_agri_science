import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/** hasPermission("ADD_SALE") style check, backed by the current user's
 * permission codenames from /api/auth/me/. UX-only — the backend remains
 * the real security boundary (accounts/permissions.py::HasPermissionCode
 * is checked on every request regardless of what this hook returns). */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
