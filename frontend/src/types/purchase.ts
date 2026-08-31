export interface Supplier {
  id: number
  name: string
  phone: string
  address: string
  gst_number: string
  is_active: boolean
}

export interface PurchaseItem {
  id: number
  product: number
  product_name: string
  quantity: string
  purchase_price: string
  line_total: string
}

export interface Purchase {
  id: number
  supplier: number
  supplier_name: string
  invoice_reference: string
  purchase_date: string
  notes: string
  total_amount: string
  recorded_by: number | null
  items: PurchaseItem[]
  created_at: string
}

// Shape sent to POST /api/purchases/
export interface PurchaseItemInput {
  product: number
  quantity: string | number
  purchase_price: string | number
}

export interface PurchaseInput {
  supplier: number
  invoice_reference?: string
  purchase_date: string
  notes?: string
  items_input: PurchaseItemInput[]
}
