import { api } from './axios'
import type { Product, ProductCategory, Unit, Paginated } from '../types'

export const productsApi = {
  list: (params?: { search?: string; category?: number; is_active?: boolean; page?: number }) =>
    api.get<Paginated<Product>>('/products/', { params }).then((r) => r.data),

  retrieve: (id: number) => api.get<Product>(`/products/${id}/`).then((r) => r.data),

  create: (data: Partial<Product> & { opening_stock?: number }) =>
    api.post<Product>('/products/', data).then((r) => r.data),

  update: (id: number, data: Partial<Product>) =>
    api.patch<Product>(`/products/${id}/`, data).then((r) => r.data),

  deactivate: (id: number) => api.delete(`/products/${id}/`).then((r) => r.data),

  categories: () => api.get<ProductCategory[]>('/product-categories/').then((r) => r.data),
  createCategory: (name: string) =>
    api.post<ProductCategory>('/product-categories/', { name }).then((r) => r.data),

  units: () => api.get<Unit[]>('/units/').then((r) => r.data),
  createUnit: (name: string, abbreviation?: string) =>
    api.post<Unit>('/units/', { name, abbreviation }).then((r) => r.data),
}
