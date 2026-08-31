export interface Customer {
  id: number
  name: string
  phone: string
  address: string
  business_name: string
  gst_number: string
  credit_limit: string // DecimalField -> DRF serializes as string
  opening_balance: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

// Only present on the detail (retrieve) endpoint — CustomerDetailSerializer
export interface CustomerDetail extends Customer {
  total_purchases: number
  total_paid: number
  outstanding_balance: number
}
