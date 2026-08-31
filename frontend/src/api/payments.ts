import { api } from './axios'
import type { Payment, PaymentInput, Paginated } from '../types'

export const paymentsApi = {
  list: (params?: { customer?: number; sale?: number; status?: string; method?: string; date_from?: string; date_to?: string; page?: number }) =>
    api.get<Paginated<Payment>>('/payments/', { params }).then((r) => r.data),

  create: (data: PaymentInput) => api.post<Payment>('/payments/', data).then((r) => r.data),

  reverse: (id: number, reason: string) =>
    api.post<Payment>(`/payments/${id}/reverse/`, { reason }).then((r) => r.data),
}
