import { api } from './axios'
import type {
  DashboardData, SalesReportData, PaymentReportData, OutstandingReportData,
  InventoryReportData, PurchaseReportData, ExpenseReportData, BusinessSummaryData,
  ActivityData, BusinessSettings,
} from '../types'

export const dashboardApi = {
  get: (date?: string) =>
    api.get<DashboardData>('/dashboard/', { params: date ? { date } : {} }).then((r) => r.data),
}

interface DateRangeParams {
  start?: string
  end?: string
}

export const reportsApi = {
  sales: (params: DateRangeParams & { customer?: number }) =>
    api.get<SalesReportData>('/reports/sales/', { params }).then((r) => r.data),

  payments: (params: DateRangeParams) =>
    api.get<PaymentReportData>('/reports/payments/', { params }).then((r) => r.data),

  outstanding: () => api.get<OutstandingReportData>('/reports/outstanding/').then((r) => r.data),

  inventory: () => api.get<InventoryReportData>('/reports/inventory/').then((r) => r.data),

  purchases: (params: DateRangeParams) =>
    api.get<PurchaseReportData>('/reports/purchases/', { params }).then((r) => r.data),

  expenses: (params: DateRangeParams) =>
    api.get<ExpenseReportData>('/reports/expenses/', { params }).then((r) => r.data),

  businessSummary: (params: DateRangeParams) =>
    api.get<BusinessSummaryData>('/reports/business-summary/', { params }).then((r) => r.data),

  activity: (params: DateRangeParams & { user?: number; action?: string }) =>
    api.get<ActivityData>('/reports/activity/', { params }).then((r) => r.data),
}

/** Triggers a browser download of a CSV export by navigating to the
 * authenticated endpoint via a temporary link. Axios isn't used here
 * because we want the browser's native file-download handling (and the
 * JWT is attached via a short-lived query-free GET using the same
 * cookie-less bearer scheme through a fetch + blob, since <a href> can't
 * carry an Authorization header). */
export async function downloadCsv(path: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][],
  ).toString()
  const url = `/api${path}${query ? `?${query}` : ''}`
  const response = await api.get(url, { responseType: 'blob' })
  const blob = new Blob([response.data], { type: 'text/csv' })
  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  const filename = path.split('/').filter(Boolean).slice(-2)[0] || 'export'
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
}

export const settingsApi = {
  business: () => api.get<BusinessSettings>('/settings/business/').then((r) => r.data),
}
