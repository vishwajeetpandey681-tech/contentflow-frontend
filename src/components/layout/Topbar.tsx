'use client'

import { usePathname } from 'next/navigation'
import { Menu, PanelLeft, PanelLeftClose, ChevronRight } from 'lucide-react'
import { BackendStatus } from '@/components/BackendStatus'
import { useUIStore } from '@/lib/ui-store'

const pageMeta: Record<string, { title: string; sub: string; section?: string }> = {
  '/scraper/':        { title: 'Sources',   sub: 'Manage your RSS feeds and listing pages', section: 'Scraper' },
  '/scraper/inbox/':  { title: 'Inbox',     sub: 'Review and approve pulled articles',      section: 'Scraper' },
  '/wordpress/':      { title: 'WordPress', sub: 'Your connected WordPress sites',          section: 'Publishing' },
  '/settings/':       { title: 'Settings',  sub: 'Configure your instance',     section: 'System' },
}

export default function Topbar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const path = usePathname()
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed)
  const setSidebarCollapsed = useUIStore(s => s.setSidebarCollapsed)
  const isRewritePage = path?.startsWith('/scraper/inbox/') && path !== '/scraper/inbox/'
  const meta = isRewritePage
    ? { title: 'AI Rewrite', sub: 'Review and publish rewritten article', section: 'Inbox' }
    : pageMeta[path] ?? { title: 'CSR Studio', sub: '', section: undefined }

  return (
    <div
      className="flex h-[var(--topbar)] min-h-12 shrink-0 items-center gap-2 px-3"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Hamburger — mobile only */}
      {onOpenMobileMenu && (
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:hidden"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <Menu size={16} />
        </button>
      )}

      {/* Desktop sidebar toggle */}
      <button
        type="button"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        className="hidden h-8 w-8 items-center justify-center rounded-lg lg:flex"
        style={{
          background: 'transparent',
          color: 'var(--text-dim)',
          border: '1px solid transparent',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--card)'
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.color = 'var(--text-dim)'
        }}
      >
        {sidebarCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
      </button>

      {/* Breadcrumb + page title */}
      <div className="min-w-0 flex-1 flex items-center gap-1.5">
        {meta.section && (
          <>
            <span
              className="hidden text-[11px] lg:block"
              style={{ color: 'var(--text-dim)', fontWeight: 500 }}
            >
              {meta.section}
            </span>
            <ChevronRight
              size={12}
              className="hidden lg:block"
              style={{ color: 'var(--border-light)', flexShrink: 0 }}
            />
          </>
        )}
        <div className="min-w-0">
          <div
            className="truncate text-[13px] font-semibold lg:text-[14px]"
            style={{ color: 'var(--text)', letterSpacing: '-0.2px' }}
          >
            {meta.title}
          </div>
          <div
            className="hidden text-[10px] lg:block"
            style={{ color: 'var(--text-dim)', marginTop: 0 }}
          >
            {meta.sub}
          </div>
        </div>
      </div>

      {/* Backend status indicator */}
      <div
        className="flex items-center gap-2"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '5px 10px',
          fontSize: 11,
          color: 'var(--text-dim)',
          flexShrink: 0,
        }}
        title="Backend connected"
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--green)',
            boxShadow: '0 0 0 2px rgba(34,197,94,0.2)',
            animation: 'breathe 2.5s ease-in-out infinite',
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        <span className="hidden font-mono text-[10px] lg:inline" style={{ color: 'var(--text-muted)' }}>
          API
        </span>
        <span className="hidden font-mono text-[10px] xl:inline" style={{ color: 'var(--text-dim)' }}>
          · :4500
        </span>
      </div>

    </div>
  )
}
