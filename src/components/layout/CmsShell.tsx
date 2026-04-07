'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
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
} from 'lucide-react'

/** Trailing slashes match `next.config` `trailingSlash: true`. */
const CMS_NAV: Array<{ label: string; href: string; icon: typeof LayoutDashboard }> = [
  { label: 'Dashboard', href: '/cms/', icon: LayoutDashboard },
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

export default function CmsShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const cmsUser = useAuthStore(s => s.cmsUser)
  const studioToken = useAuthStore(s => s.token)
  const clearCmsAuth = useAuthStore(s => s.clearCmsAuth)

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#0f0606', color: '#fafafa' }}>
      <aside
        style={{
          width: 248,
          flexShrink: 0,
          borderRight: '1px solid rgba(204,0,0,0.2)',
          background: 'linear-gradient(180deg, #1a0808 0%, #0f0606 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(204,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #CC0000, #FF6B00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              📰
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15 }}>Charcha</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>CMS</div>
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
                  color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                  background: active ? 'rgba(204,0,0,0.2)' : 'transparent',
                  border: active ? '1px solid rgba(255,107,0,0.25)' : '1px solid transparent',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon size={16} style={{ opacity: 0.9 }} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: 14, borderTop: '1px solid rgba(204,0,0,0.15)' }}>
          {studioToken && (
            <Link
              href="/scraper/inbox/"
              style={{
                display: 'block',
                marginBottom: 10,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.25)',
                color: '#c4b5fd',
                fontSize: 11,
                fontWeight: 600,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              ✦ Switch to Studio
            </Link>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #CC0000, #FF6B00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {(cmsUser?.name || cmsUser?.email || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{cmsUser?.name}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'capitalize' }}>
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
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.4)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>{children}</main>
    </div>
  )
}
