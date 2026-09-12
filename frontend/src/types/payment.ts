export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'card' | 'credit' | 'other'
export type PaymentRecordStatus = 'pending' | 'paid' | 'partial' | 'failed' | 'reversed'

export interface Payment {
  id: number
  sale: number
  sale_number: string
  customer: number
  customer_name: string
  amount: string
  method: PaymentMethod
  reference_number: string | null
  status: PaymentRecordStatus
  payment_date: string
  recorded_by: number | null
  recorded_by_username: string | null
  reversal_reason: string
}

// Shape sent to POST /api/payments/
export interface PaymentInput {
  sale: number
  customer: number
  amount: string | number
  method: PaymentMethod
  reference_number?: string
}
