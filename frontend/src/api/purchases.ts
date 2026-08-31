import { api } from './axios'
import type { Purchase, PurchaseInput, Supplier, Paginated } from '../types'

export const purchasesApi = {
  list: (params?: { supplier?: number; date_from?: string; date_to?: string; page?: number; page_size?: number }) =>
    api.get<Paginated<Purchase>>('/purchases/', { params }).then((r) => r.data),

  retrieve: (id: number) => api.get<Purchase>(`/purchases/${id}/`).then((r) => r.data),

  create: (data: PurchaseInput) => api.post<Purchase>('/purchases/', data).then((r) => r.data),
}

export const suppliersApi = {
  list: (params?: { search?: string; page?: number }) =>
    api.get<Paginated<Supplier>>('/suppliers/', { params }).then((r) => r.data),

  retrieve: (id: number) => api.get<Supplier>(`/suppliers/${id}/`).then((r) => r.data),

  create: (data: Partial<Supplier>) => api.post<Supplier>('/suppliers/', data).then((r) => r.data),

  update: (id: number, data: Partial<Supplier>) =>
    api.patch<Supplier>(`/suppliers/${id}/`, data).then((r) => r.data),

  // NOTE: SupplierViewSet has no perform_destroy override on the backend,
  // so DELETE would hard-delete the row (unlike Customer/Product, which
  // soft-delete). Deliberately using PATCH{is_active:false} here instead
  // of DELETE to get correct soft-delete behavior without touching
  // backend logic in a frontend-only phase — flagged for a backend fix.
  deactivate: (id: number) => api.patch<Supplier>(`/suppliers/${id}/`, { is_active: false }).then((r) => r.data),
}
