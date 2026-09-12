export interface ProductCategory {
  id: number
  name: string
}

export interface Unit {
  id: number
  name: string
  abbreviation: string
}

export interface Product {
  id: number
  sku: string
  name: string
  category: number
  category_name: string
  brand: string
  unit: number
  unit_name: string
  purchase_price: string
  selling_price: string
  minimum_stock_level: string
  supplier: number | null
  description: string
  is_active: boolean
  current_stock: number
  is_low_stock: boolean
}
