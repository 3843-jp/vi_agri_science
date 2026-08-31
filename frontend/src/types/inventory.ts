export type MovementType =
  | 'OPENING' | 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE' | 'CANCELLATION'

export interface InventoryMovement {
  id: number
  product: number
  product_name: string
  movement_type: MovementType
  quantity: string
  reference_type: string
  reference_id: string
  notes: string
  recorded_by: number | null
  recorded_by_username: string | null
  created_at: string
}

export interface StockAdjustmentInput {
  product: number
  quantity: string | number
  reason: string
}
