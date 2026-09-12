import { api } from './axios'
import type { InventoryMovement, StockAdjustmentInput, Paginated } from '../types'

export const inventoryApi = {
  list: (params?: { product?: number; movement_type?: string; page?: number }) =>
    api.get<Paginated<InventoryMovement>>('/inventory-movements/', { params }).then((r) => r.data),

  adjust: (data: StockAdjustmentInput) =>
    api.post<InventoryMovement>('/inventory/adjust/', data).then((r) => r.data),
}
