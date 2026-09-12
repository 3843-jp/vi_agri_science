import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { tokenStore } from './tokenStore'
import type { ApiErrorShape } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// Store CSRF token in memory
let csrfToken: string | null = null

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Fetch CSRF token from the backend.
 * Backend endpoint:
 * GET /api/auth/csrf/
 */
async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/csrf/`, {
      withCredentials: true,
    })

    csrfToken = response.data.csrfToken
    return csrfToken
  } catch {
    return null
  }
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const method = config.method?.toLowerCase()

  // Add CSRF token for unsafe requests
  if (method && !['get', 'head', 'options'].includes(method)) {
    // Get CSRF token if we don't have one
    if (!csrfToken) {
      await fetchCsrfToken()
    }

    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken
    }
  }

  return config
})

/**
 * Normalized error messages safe for UI.
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

// --------------------------------------------------
// Refresh-on-401 handling
// --------------------------------------------------

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  try {
    // Ensure we have a CSRF token before POSTing
    if (!csrfToken) {
      await fetchCsrfToken()
    }

    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh/`,
      undefined,
      {
        withCredentials: true,
        headers: csrfToken
          ? {
              'X-CSRFToken': csrfToken,
            }
          : {},
      },
    )

    const newAccess = response.data.access as string

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

      tokenStore.clear()
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }

    return Promise.reject(error)
  },
)