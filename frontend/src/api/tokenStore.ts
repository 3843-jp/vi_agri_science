/**
 * Centralized token storage. Access token is kept in memory (fast, and
 * never touches localStorage) and mirrored to localStorage only so a page
 * refresh doesn't force a re-login — the axios interceptor always reads
 * the in-memory copy first. Kept as one small module so the storage
 * strategy (e.g. moving to an httpOnly cookie issued by the backend) can
 * be changed in one place later without touching every component.
 */

const ACCESS_KEY = 'via_access_token'
const REFRESH_KEY = 'via_refresh_token'

let accessTokenMemory: string | null = localStorage.getItem(ACCESS_KEY)

export const tokenStore = {
  getAccess(): string | null {
    return accessTokenMemory
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
  setTokens(access: string, refresh?: string) {
    accessTokenMemory = access
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    accessTokenMemory = null
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}
