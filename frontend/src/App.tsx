import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { router } from './routes/router'
import './api/axios' // installs the JWT/refresh interceptors as a side effect

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}
