import { api } from './axios'
import type { Expense, ExpenseInput, Paginated } from '../types'

export const expensesApi = {
  list: (params?: { category?: string; status?: string; date_from?: string; date_to?: string; page?: number }) =>
    api.get<Paginated<Expense>>('/expenses/', { params }).then((r) => r.data),

  create: (data: ExpenseInput) => api.post<Expense>('/expenses/', data).then((r) => r.data),

  update: (id: number, data: Partial<ExpenseInput>) =>
    api.patch<Expense>(`/expenses/${id}/`, data).then((r) => r.data),

  cancel: (id: number, reason?: string) =>
    api.post<Expense>(`/expenses/${id}/cancel/`, { reason }).then((r) => r.data),
}
