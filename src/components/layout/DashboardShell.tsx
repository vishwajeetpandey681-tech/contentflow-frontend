'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { MobileSidebar } from './MobileSidebar'
import { useUIStore } from '@/lib/ui-store'

const SCRAPER_TABS = ['active', 'library', 'logs'] as const

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed)
  const path = usePathname()
  const sourcesTab = useUIStore(s => s.sourcesTab)
  const setSourcesTab = useUIStore(s => s.setSourcesTab)
  const sourcesActiveCount = useUIStore(s => s.sourcesActiveCount)
  const isScraperSourcesPage = path === '/scraper' || path === '/scraper/'

  return (
    <div
      className="dashboard-shell flex h-[100dvh] overflow-hidden mobile-bg-mesh"
      style={{ background: 'var(--bg)', position: 'relative' }}
    >
      {/* Desktop sidebar — hidden below lg; collapsible on lg+ */}
      {!sidebarCollapsed && (
        <div
          className="hidden lg:flex lg:w-[260px] xl:w-[var(--sidebar)] lg:shrink-0 lg:overflow-hidden"
          style={{
            transition: 'width 0.2s ease',
            borderRight: '1px solid var(--border)',
          }}
        >
          <Sidebar />
        </div>
      )}

      {/* Mobile drawer — visible below lg when opened */}
      <MobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onOpenMobileMenu={() => setMobileNavOpen(true)} />
        {/* Sources page: Active | Library | Logs — fixed in header, full width end-to-end */}
        {isScraperSourcesPage && (
          <div
            className="flex h-11 shrink-0 items-stretch border-b"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border)',
            }}
          >
            {SCRAPER_TABS.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setSourcesTab(tab)}
                className="flex min-h-[44px] flex-1 items-center justify-center px-4 text-xs font-medium"
                style={{
                  color: sourcesTab === tab ? 'var(--text)' : 'var(--text-muted)',
                  borderBottom: sourcesTab === tab ? '2px solid var(--accent-light)' : '2px solid transparent',
                }}
              >
                {tab === 'active' && `Active (${sourcesActiveCount})`}
                {tab === 'library' && 'Library'}
                {tab === 'logs' && 'Logs'}
              </button>
            ))}
          </div>
        )}
        <main className="flex min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
