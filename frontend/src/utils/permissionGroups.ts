// Mirrors accounts/permissions_catalog.py exactly. Kept as an explicit
// lookup table rather than string-splitting the codename, since a couple
// of real codes (ADD_STOCK, ADJUST_STOCK) belong under "Inventory" rather
// than a literal "Stock" group, and MANAGE_* permissions don't share a
// module prefix pattern with the VIEW/ADD/UPDATE ones.
export const PERMISSION_GROUPS: { label: string; codenames: string[] }[] = [
  { label: 'Customers', codenames: ['VIEW_CUSTOMER', 'ADD_CUSTOMER', 'UPDATE_CUSTOMER', 'DELETE_CUSTOMER'] },
  { label: 'Products', codenames: ['VIEW_PRODUCT', 'ADD_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT'] },
  { label: 'Suppliers', codenames: ['VIEW_SUPPLIER', 'ADD_SUPPLIER', 'UPDATE_SUPPLIER'] },
  { label: 'Sales', codenames: ['VIEW_SALE', 'ADD_SALE', 'UPDATE_SALE', 'CANCEL_SALE'] },
  { label: 'Payments', codenames: ['VIEW_PAYMENT', 'ADD_PAYMENT', 'UPDATE_PAYMENT', 'REVERSE_PAYMENT'] },
  { label: 'Inventory', codenames: ['VIEW_INVENTORY', 'ADD_STOCK', 'ADJUST_STOCK'] },
  { label: 'Purchases', codenames: ['VIEW_PURCHASE', 'ADD_PURCHASE'] },
  { label: 'Expenses', codenames: ['VIEW_EXPENSE', 'ADD_EXPENSE', 'UPDATE_EXPENSE', 'CANCEL_EXPENSE'] },
  { label: 'Reports', codenames: ['VIEW_REPORT', 'EXPORT_REPORT'] },
  { label: 'Audit', codenames: ['VIEW_AUDIT_LOG'] },
  { label: 'Administration', codenames: ['MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_SETTINGS'] },
]

/** Groups a flat permission list by module, appending an "Other" group for
 * any codename not in the known mapping — so a future backend addition
 * never silently disappears from the UI. */
export function groupPermissions<T extends { codename: string }>(permissions: T[]) {
  const used = new Set<string>()
  const groups = PERMISSION_GROUPS.map((g) => {
    const items = permissions.filter((p) => g.codenames.includes(p.codename))
    items.forEach((p) => used.add(p.codename))
    return { label: g.label, items }
  }).filter((g) => g.items.length > 0)

  const other = permissions.filter((p) => !used.has(p.codename))
  if (other.length > 0) groups.push({ label: 'Other', items: other })

  return groups
}
