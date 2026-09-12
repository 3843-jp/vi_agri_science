import {
  LayoutDashboard, ShoppingCart, Wallet, Users, Package, Boxes,
  Truck, Building2, Receipt, BarChart3, TrendingUp, UserCog,
  ShieldCheck, ScrollText, Settings, LayoutGrid,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Permission codename required to see this item. undefined = always visible to any authenticated user. */
  permission?: string
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

// Mirrors Section 4's sidebar grouping exactly. Each entry's `permission`
// matches a real codename from accounts/permissions_catalog.py — nothing
// invented. Frontend visibility here is UX only; the backend re-checks
// every request regardless (accounts/permissions.py::HasPermissionCode).
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Sales', to: '/sales', icon: ShoppingCart, permission: 'VIEW_SALE' },
      { label: 'Payments', to: '/payments', icon: Wallet, permission: 'VIEW_PAYMENT' },
    ],
  },
  {
    title: 'Customers',
    items: [{ label: 'Customers', to: '/customers', icon: Users, permission: 'VIEW_CUSTOMER' }],
  },
  {
    title: 'Catalog & Stock',
    items: [
      { label: 'Products', to: '/products', icon: Package, permission: 'VIEW_PRODUCT' },
      { label: 'Inventory', to: '/inventory', icon: Boxes, permission: 'VIEW_INVENTORY' },
      { label: 'Purchases', to: '/purchases', icon: Truck, permission: 'VIEW_PURCHASE' },
      { label: 'Suppliers', to: '/suppliers', icon: Building2, permission: 'VIEW_SUPPLIER' },
    ],
  },
  {
    title: 'Finance',
    items: [{ label: 'Expenses', to: '/expenses', icon: Receipt, permission: 'VIEW_EXPENSE' }],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Reports', to: '/reports', icon: BarChart3, permission: 'VIEW_REPORT' },
      { label: 'Analytics', to: '/analytics', icon: TrendingUp, permission: 'VIEW_REPORT' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Admin Dashboard', to: '/admin', icon: LayoutGrid, permission: 'MANAGE_USERS' },
      { label: 'Users', to: '/admin/users', icon: UserCog, permission: 'MANAGE_USERS' },
      { label: 'Roles', to: '/admin/roles', icon: ShieldCheck, permission: 'MANAGE_ROLES' },
      { label: 'Permissions', to: '/admin/permissions', icon: ShieldCheck, permission: 'MANAGE_ROLES' },
      { label: 'Audit Logs', to: '/admin/audit-logs', icon: ScrollText, permission: 'VIEW_AUDIT_LOG' },
      { label: 'Settings', to: '/admin/settings', icon: Settings, permission: 'MANAGE_SETTINGS' },
    ],
  },
]
