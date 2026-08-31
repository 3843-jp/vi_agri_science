import { api } from './axios'
import type { Sale, SaleCreateInput, SaleEditInput, Paginated } from '../types'

export const salesApi = {
  list: (params?: { customer?: number; status?: string; payment_status?: string; date_from?: string; date_to?: string; page?: number }) =>
    api.get<Paginated<Sale>>('/sales/', { params }).then((r) => r.data),

  retrieve: (id: number) => api.get<Sale>(`/sales/${id}/`).then((r) => r.data),

  create: (data: SaleCreateInput) => api.post<Sale>('/sales/', data).then((r) => r.data),

  update: (id: number, data: SaleEditInput) => api.patch<Sale>(`/sales/${id}/`, data).then((r) => r.data),

  cancel: (id: number, reason: string) =>
    api.post<Sale>(`/sales/${id}/cancel/`, { reason }).then((r) => r.data),
}
