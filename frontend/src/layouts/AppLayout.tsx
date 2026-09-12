import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Navbar } from '../components/layout/Navbar'
import { MobileNav } from '../components/layout/MobileNav'

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
