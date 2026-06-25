import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Breadcrumbs } from './Breadcrumbs'
import { getUnreadCount } from '../../api/alerts'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unread, setUnread] = useState<number>(0)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getUnreadCount()
        if (!cancelled) setUnread(data.unread_count ?? 0)
      } catch {
        if (!cancelled) setUnread(0)
      }
    }
    load()
    const interval = window.setInterval(load, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return (
    <div className="h-screen w-full bg-slate-50 text-ink-100 flex overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadAlerts={unread}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} unreadAlerts={unread} />
        <main className="flex-1 min-h-0 px-4 lg:px-8 py-6 overflow-y-auto overflow-x-hidden bg-slate-50 scrollbar-thin">
          <div className="max-w-7xl mx-auto space-y-6">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
