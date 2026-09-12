import { api } from './axios'
import type { Customer, CustomerDetail, Paginated } from '../types'

export const customersApi = {
  list: (params?: { search?: string; status?: string; page?: number }) =>
    api.get<Paginated<Customer>>('/customers/', { params }).then((r) => r.data),

  retrieve: (id: number) => api.get<CustomerDetail>(`/customers/${id}/`).then((r) => r.data),

  create: (data: Partial<Customer>) => api.post<Customer>('/customers/', data).then((r) => r.data),

  update: (id: number, data: Partial<Customer>) =>
    api.patch<Customer>(`/customers/${id}/`, data).then((r) => r.data),

  deactivate: (id: number) => api.delete(`/customers/${id}/`).then((r) => r.data),
}
