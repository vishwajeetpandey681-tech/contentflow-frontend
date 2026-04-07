'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { useUIStore } from '@/lib/ui-store'
import {
  LogOut,
  LayoutDashboard,
  Newspaper,
  FileEdit,
  Clock,
  Trash2,
  Tags,
  BarChart3,
  Settings,
  Inbox,
  TrendingUp,
  Rss,
} from 'lucide-react'

/** Trailing slashes match `next.config` `trailingSlash: true`. */
const CMS_NAV: Array<{ label: string; href: string; icon: typeof LayoutDashboard }> = [
  { label: 'Dashboard', href: '/cms/', icon: LayoutDashboard },
  { label: 'Sources', href: '/cms/sources/', icon: Rss },
  { label: 'Inbox', href: '/cms/inbox/', icon: Inbox },
  { label: 'Trends', href: '/cms/trends/', icon: TrendingUp },
  { label: 'All Articles', href: '/cms/articles/', icon: Newspaper },
  { label: 'Drafts', href: '/cms/drafts/', icon: FileEdit },
  { label: 'Scheduled', href: '/cms/scheduled/', icon: Clock },
  { label: 'Trash', href: '/cms/trash/', icon: Trash2 },
  { label: 'Categories', href: '/cms/categories/', icon: Tags },
  { label: 'Tags', href: '/cms/tags/', icon: Tags },
  { label: 'Analytics', href: '/cms/analytics/', icon: BarChart3 },
  { label: 'Site Settings', href: '/cms/settings/', icon: Settings },
]

const SCRAPER_TABS = ['active', 'library', 'logs'] as const

export default function CmsShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const cmsUser = useAuthStore(s => s.cmsUser)
  const clearCmsAuth = useAuthStore(s => s.clearCmsAuth)
  const sourcesTab = useUIStore(s => s.sourcesTab)
  const setSourcesTab = useUIStore(s => s.setSourcesTab)
  const sourcesActiveCount = useUIStore(s => s.sourcesActiveCount)
  const isSourcesPage = path === '/cms/sources' || path === '/cms/sources/'

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#030c06', color: '#f0faf3' }}>
      <aside
        style={{
          width: 248,
          flexShrink: 0,
          borderRight: '1px solid rgba(5,150,105,0.2)',
          background: 'linear-gradient(180deg, #071510 0%, #030c06 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(5,150,105,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #059669, #0d9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                boxShadow: '0 2px 12px rgba(5,150,105,0.4)',
              }}
            >
              📰
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: '#f0faf3' }}>Charcha Network</div>
              <div style={{ fontSize: 10, color: 'rgba(240,250,243,0.35)', letterSpacing: '0.06em' }}>CMS</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {CMS_NAV.map(item => {
            const p = path.endsWith('/') ? path : `${path}/`
            const h = item.href
            const active =
              h === '/cms/'
                ? p === '/cms/'
                : p === h || p.startsWith(h)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginBottom: 4,
                  textDecoration: 'none',
                  color: active ? '#f0faf3' : 'rgba(240,250,243,0.5)',
                  background: active ? 'rgba(5,150,105,0.18)' : 'transparent',
                  border: active ? '1px solid rgba(52,211,153,0.25)' : '1px solid transparent',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={16} style={{ opacity: active ? 1 : 0.7, color: active ? '#34d399' : 'inherit' }} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: 14, borderTop: '1px solid rgba(5,150,105,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #059669, #0d9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(5,150,105,0.35)',
              }}
            >
              {(cmsUser?.name || cmsUser?.email || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{cmsUser?.name}</div>
              <div style={{ fontSize: 9, color: 'rgba(240,250,243,0.35)', textTransform: 'capitalize' }}>
                {(cmsUser?.role || 'publisher').replace(/_/g, ' ')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearCmsAuth()
              router.push('/cms/login/')
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px',
              background: 'transparent',
              border: '1px solid rgba(5,150,105,0.2)',
              borderRadius: 8,
              color: 'rgba(240,250,243,0.4)',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isSourcesPage && (
          <div
            style={{
              display: 'flex',
              height: 44,
              flexShrink: 0,
              alignItems: 'stretch',
              borderBottom: '1px solid rgba(5,150,105,0.2)',
              background: '#071510',
            }}
          >
            {SCRAPER_TABS.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setSourcesTab(tab)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  borderBottom: sourcesTab === tab ? '2px solid #34d399' : '2px solid transparent',
                  color: sourcesTab === tab ? '#f0faf3' : 'rgba(240,250,243,0.4)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'color 0.15s',
                }}
              >
                {tab === 'active' ? `Active (${sourcesActiveCount})` : tab === 'library' ? 'Library' : 'Logs'}
              </button>
            ))}
          </div>
        )}
        <main style={{ flex: 1, minWidth: 0, overflow: isSourcesPage ? 'hidden' : 'auto', display: isSourcesPage ? 'flex' : 'block', flexDirection: 'column' }}>{children}</main>
      </div>
    </div>
  )
}
