export interface SaleItem {
  id: number
  product: number
  product_name: string
  quantity: string
  unit_price: string
  discount: string
  line_total: string
}

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overpaid' | 'failed' | 'reversed'
export type SaleStatus = 'confirmed' | 'cancelled'

export interface Sale {
  id: number
  sale_number: string
  customer: number
  customer_name: string
  sale_date: string
  subtotal: string
  discount: string
  total_amount: string
  payment_status: PaymentStatus
  status: SaleStatus
  notes: string
  created_by: number | null
  items: SaleItem[]
  amount_paid: number
  outstanding: number
}

// Shape sent to POST /api/sales/ and PATCH /api/sales/:id/
export interface SaleItemInput {
  product: number
  quantity: string | number
  unit_price?: string | number
  discount?: string | number
}

export interface SaleCreateInput {
  customer: number
  notes?: string
  items_input: SaleItemInput[]
}

// PATCH body — items_input optional (only present when editing line items);
// `reason` is read by the view for the audit log, not a model field.
export interface SaleEditInput {
  notes?: string
  items_input?: SaleItemInput[]
  reason?: string
}
