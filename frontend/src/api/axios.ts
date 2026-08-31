import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { tokenStore } from './tokenStore'
import type { ApiErrorShape } from '../types'

// In dev, Vite's proxy (vite.config.ts) forwards /api to Django on :8000.
// In production this should be set to the deployed API origin.
export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Normalized, always-a-string error message safe to show in the UI —
 * never a raw stack trace, matching core/exceptions.py's contract. */
export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined
    if (err.response?.status === 401) return 'Your session has expired. Please log in again.'
    if (err.response?.status === 403) return "You don't have permission to perform this action."
    if (err.response?.status === 404) return 'The requested record could not be found.'
    if (err.response?.status === 409) {
      return 'Unable to complete this operation because the record was changed or conflicts with another operation.'
    }
    if (!err.response) return 'Network error. Please check your connection and try again.'
    if (data?.detail) {
      if (typeof data.detail === 'string') return data.detail
      if (Array.isArray(data.detail)) return data.detail.join(' ')
      // field-error object, e.g. { "items_input": ["..."] }
      const firstKey = Object.keys(data.detail)[0]
      const firstVal = data.detail[firstKey]
      return Array.isArray(firstVal) ? firstVal.join(' ') : String(firstVal)
    }
    return 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

// --- Refresh-on-401 handling -------------------------------------------
// If a request fails with 401 (expired access token), try ONE silent
// refresh using the refresh token, replay the original request, and only
// log the user out if the refresh itself fails.

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh()
  if (!refresh) return null
  try {
    const res = await axios.post('/api/auth/refresh/', { refresh })
    const newAccess = res.data.access as string
    tokenStore.setTokens(newAccess)
    return newAccess
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login/') || originalRequest?.url?.includes('/auth/refresh/')

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isAuthEndpoint) {
      originalRequest._retried = true

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }
      const newAccess = await refreshPromise

      if (newAccess) {
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return api(originalRequest)
      }

      // Refresh failed — clear tokens and force a re-login. A custom event
      // is used instead of importing AuthContext here, to avoid a circular
      // dependency between the axios layer and the React context layer.
      tokenStore.clear()
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }

    return Promise.reject(error)
  },
)
