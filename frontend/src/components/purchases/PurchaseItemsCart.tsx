import { Trash2 } from 'lucide-react'
import type { CartLine } from '../../types/cart'
import { inputClasses } from '../../utils/inputStyles'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)
}

export function PurchaseItemsCart({
  lines,
  onUpdate,
  onRemove,
}: {
  lines: CartLine[]
  onUpdate: (key: string, patch: Partial<CartLine>) => void
  onRemove: (key: string) => void
}) {
  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-ink-500">
        No products added yet. Search above to add the first item.
      </div>
    )
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)

  return (
    <div>
      <div className="hidden overflow-x-auto rounded-xl border border-line lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <th className="px-3 py-2.5">Product</th>
              <th className="px-3 py-2.5 w-28">Qty</th>
              <th className="px-3 py-2.5 w-32">Purchase Price</th>
              <th className="px-3 py-2.5 w-28 text-right">Total</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((line) => (
              <tr key={line.key}>
                <td className="px-3 py-2">
                  <p className="font-medium text-ink-900">{line.productName}</p>
                  <p className="text-xs text-ink-500">{line.sku}</p>
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => onUpdate(line.key, { quantity: e.target.value })} className={inputClasses()} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => onUpdate(line.key, { unitPrice: e.target.value })} className={inputClasses()} />
                </td>
                <td className="px-3 py-2 text-right font-medium text-ink-900">
                  {formatCurrency((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0))}
                </td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => onRemove(line.key)} className="text-ink-300 hover:text-status-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 lg:hidden">
        {lines.map((line) => (
          <div key={line.key} className="rounded-xl border border-line p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink-900">{line.productName}</p>
                <p className="text-xs text-ink-500">{line.sku}</p>
              </div>
              <button type="button" onClick={() => onRemove(line.key)} className="shrink-0 text-ink-300 hover:text-status-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-ink-500">Qty</label>
                <input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => onUpdate(line.key, { quantity: e.target.value })} className={inputClasses()} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-ink-500">Purchase Price</label>
                <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => onUpdate(line.key, { unitPrice: e.target.value })} className={inputClasses()} />
              </div>
            </div>
            <p className="mt-2 text-right text-sm font-semibold text-ink-900">
              {formatCurrency((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0))}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs rounded-xl bg-surface-muted p-4 text-sm">
          <div className="flex justify-between py-1 text-ink-700">
            <span>Estimated total</span>
            <span className="font-semibold text-ink-900">{formatCurrency(total)}</span>
          </div>
          <p className="mt-1 text-[11px] text-ink-300">Final total is calculated and confirmed by the server.</p>
        </div>
      </div>
    </div>
  )
}
