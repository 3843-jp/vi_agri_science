import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { tokenStore } from './tokenStore'
import type { ApiErrorShape } from '../types'

/**
 * API base URL from environment variable.
 * Development (Vite proxy): /api
 * Production: https://your-backend-domain.com/api
 * Falls back to /api if not set.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function getCookie(name: string): string | null {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))

  return cookie
    ? decodeURIComponent(cookie.split('=')[1])
    : null
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Add CSRF token for unsafe requests when available.
  // This works locally when the cookie is readable.
  if (
    config.method &&
    !['get', 'head', 'options'].includes(config.method.toLowerCase())
  ) {
    const csrf = getCookie('csrftoken')

    if (csrf) {
      config.headers['X-CSRFToken'] = csrf
    }
  }

  return config
})

/**
 * Normalized, always-a-string error message safe to show in the UI.
 */
export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined

    if (err.response?.status === 401) {
      return 'Your session has expired. Please log in again.'
    }

    if (err.response?.status === 403) {
      return "You don't have permission to perform this action."
    }

    if (err.response?.status === 404) {
      return 'The requested record could not be found.'
    }

    if (err.response?.status === 409) {
      return 'Unable to complete this operation because the record was changed or conflicts with another operation.'
    }

    if (!err.response) {
      return 'Network error. Please check your connection and try again.'
    }

    if (data?.detail) {
      if (typeof data.detail === 'string') {
        return data.detail
      }

      if (Array.isArray(data.detail)) {
        return data.detail.join(' ')
      }

      // Field-error object, e.g.:
      // { "items_input": ["..."] }
      const firstKey = Object.keys(data.detail)[0]
      const firstVal = data.detail[firstKey]

      return Array.isArray(firstVal)
        ? firstVal.join(' ')
        : String(firstVal)
    }

    return 'Something went wrong. Please try again.'
  }

  return 'Something went wrong. Please try again.'
}

// --- Refresh-on-401 handling -------------------------------------------

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  try {
    // Get the CSRF token directly from the backend.
    // Do NOT rely on document.cookie because the backend is on
    // a different domain in production.
    const csrfResponse = await axios.get(
      `${API_BASE_URL}/auth/csrf/`,
      {
        withCredentials: true,
      }
    )

    const csrfToken = csrfResponse.data.csrfToken as string

    // Send refresh cookie automatically and CSRF token explicitly.
    const res = await axios.post(
      `${API_BASE_URL}/auth/refresh/`,
      undefined,
      {
        withCredentials: true,
        headers: {
          'X-CSRFToken': csrfToken,
        },
      }
    )

    const newAccess = res.data.access as string

    tokenStore.setAccess(newAccess)

    return newAccess
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login/') ||
      originalRequest?.url?.includes('/auth/refresh/')

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retried &&
      !isAuthEndpoint
    ) {
      originalRequest._retried = true

      // Only one refresh request should run at a time.
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

      // Refresh failed — clear tokens and force re-login.
      tokenStore.clear()

      window.dispatchEvent(
        new CustomEvent('auth:logout')
      )
    }

    return Promise.reject(error)
  }
)