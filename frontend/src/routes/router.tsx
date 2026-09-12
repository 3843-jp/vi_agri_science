import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { ReportsPage } from '../pages/ReportsPage'
import { AnalyticsPage } from '../pages/AnalyticsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { CustomersListPage } from '../pages/customers/CustomersListPage'
import { CustomerNewPage } from '../pages/customers/CustomerNewPage'
import { CustomerDetailPage } from '../pages/customers/CustomerDetailPage'
import { ProductsListPage } from '../pages/products/ProductsListPage'
import { ProductNewPage } from '../pages/products/ProductNewPage'
import { ProductDetailPage } from '../pages/products/ProductDetailPage'
import { SuppliersListPage } from '../pages/suppliers/SuppliersListPage'
import { SupplierNewPage } from '../pages/suppliers/SupplierNewPage'
import { SupplierDetailPage } from '../pages/suppliers/SupplierDetailPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { UsersPage } from '../pages/admin/UsersPage'
import { RolesPage } from '../pages/admin/RolesPage'
import { PermissionsPage } from '../pages/admin/PermissionsPage'
import { AuditLogsPage } from '../pages/admin/AuditLogsPage'
import { SettingsPage } from '../pages/admin/SettingsPage'
import { SalesListPage } from '../pages/sales/SalesListPage'
import { SaleNewPage } from '../pages/sales/SaleNewPage'
import { SaleDetailPage } from '../pages/sales/SaleDetailPage'
import { PaymentsListPage } from '../pages/payments/PaymentsListPage'
import { InventoryListPage } from '../pages/inventory/InventoryListPage'
import { PurchasesListPage } from '../pages/purchases/PurchasesListPage'
import { PurchaseNewPage } from '../pages/purchases/PurchaseNewPage'
import { PurchaseDetailPage } from '../pages/purchases/PurchaseDetailPage'
import { ExpensesListPage } from '../pages/expenses/ExpensesListPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },

          { path: '/customers', element: <CustomersListPage /> },
          { path: '/customers/new', element: <CustomerNewPage /> },
          { path: '/customers/:id', element: <CustomerDetailPage /> },

          { path: '/products', element: <ProductsListPage /> },
          { path: '/products/new', element: <ProductNewPage /> },
          { path: '/products/:id', element: <ProductDetailPage /> },

          { path: '/suppliers', element: <SuppliersListPage /> },
          { path: '/suppliers/new', element: <SupplierNewPage /> },
          { path: '/suppliers/:id', element: <SupplierDetailPage /> },

          { path: '/sales', element: <SalesListPage /> },
          { path: '/sales/new', element: <SaleNewPage /> },
          { path: '/sales/:id', element: <SaleDetailPage /> },

          { path: '/payments', element: <PaymentsListPage /> },

          { path: '/inventory', element: <InventoryListPage /> },

          { path: '/purchases', element: <PurchasesListPage /> },
          { path: '/purchases/new', element: <PurchaseNewPage /> },
          { path: '/purchases/:id', element: <PurchaseDetailPage /> },

          { path: '/expenses', element: <ExpensesListPage /> },

          { path: '/reports', element: <ReportsPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },

          { path: '/admin', element: <AdminDashboardPage /> },
          { path: '/admin/users', element: <UsersPage /> },
          { path: '/admin/roles', element: <RolesPage /> },
          { path: '/admin/permissions', element: <PermissionsPage /> },
          { path: '/admin/audit-logs', element: <AuditLogsPage /> },
          { path: '/admin/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
