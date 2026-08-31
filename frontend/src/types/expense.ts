export type ExpenseCategory =
  | 'transport' | 'electricity' | 'salary' | 'rent' | 'loading'
  | 'maintenance' | 'purchase_related' | 'miscellaneous'

export interface Expense {
  id: number
  category: ExpenseCategory
  amount: string
  expense_date: string
  description: string
  status: 'active' | 'cancelled'
  recorded_by: number | null
  recorded_by_username: string | null
}

export interface ExpenseInput {
  category: ExpenseCategory
  amount: string | number
  expense_date: string
  description?: string
}
