export interface CartLine {
  key: string // local-only React key, not sent to backend
  productId: number
  productName: string
  sku: string
  unitLabel: string
  currentStock: number
  quantity: string
  unitPrice: string
  discount: string // sales only; purchases ignore this
}

export function lineTotal(line: CartLine): number {
  const qty = Number(line.quantity) || 0
  const price = Number(line.unitPrice) || 0
  const discount = Number(line.discount) || 0
  return qty * price - discount
}
