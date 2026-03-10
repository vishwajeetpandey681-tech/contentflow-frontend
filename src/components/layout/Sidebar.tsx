'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Rss, Inbox, Settings, Newspaper, Zap, LogOut, X, User, Users, FolderOpen } from 'lucide-react'
import { useSources } from '@/hooks/useSources'
import { useStats } from '@/hooks/useStats'
import { useAuthStore } from '@/lib/auth-store'

const navItems: Array<{
  section: string
  items: Array<{ label: string; href: string; icon: typeof Rss; soon?: boolean; badge?: 'sources' | 'pending' }>
}> = [
  {
    section: 'Scraper',
    items: [
      { label: 'Sources', href: '/scraper/',       icon: Rss,       badge: 'sources' },
      { label: 'Inbox',   href: '/scraper/inbox/', icon: Inbox,     badge: 'pending' },
    ],
  },
  {
    section: 'Publishing',
    items: [
      { label: 'File Manager', href: '/files/', icon: FolderOpen },
      { label: 'WordPress', href: '/wordpress/', icon: Newspaper },
      { label: 'Social',    href: '/social',    icon: Zap, soon: true },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Settings', href: '/settings/', icon: Settings },
      { label: 'Profile', href: '/profile/', icon: User },
      { label: 'Team', href: '/team/', icon: Users },
    ],
  },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const path = usePathname()
  const router = useRouter()
  const prevPathRef = useRef(path)

  useEffect(() => {
    if (onClose && prevPathRef.current !== path) {
      prevPathRef.current = path
      onClose()
    }
  }, [path, onClose])

  const { sources = [] } = useSources()
  const { stats = { pending: 0, approved: 0, rejected: 0, failed: 0 } } = useStats()
  const user = useAuthStore(s => s.user)
  const clearAuth = useAuthStore(s => s.clearAuth)

  return (
    <aside style={{
      width: 'var(--sidebar)',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Logo row */}
      <div style={{
        height: 'var(--topbar)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Logo mark */}
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          color: '#fff',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
          letterSpacing: '-0.5px',
        }}>CF</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text)', lineHeight: 1 }}>
            CSR Studio
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            marginTop: 2,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '1.5px',
            padding: '1px 5px',
            borderRadius: 4,
            background: 'var(--accent-glow)',
            color: 'var(--accent-light)',
            border: '1px solid rgba(124,58,237,0.25)',
            fontFamily: 'Geist Mono, monospace',
          }}>BETA</div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflow: 'auto', padding: '12px 8px 8px' }}>
        {navItems.map(group => (
          <div key={group.section} style={{ marginBottom: 20 }}>
            {/* Section label */}
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              padding: '0 10px 6px',
              fontFamily: 'Geist Mono, monospace',
            }}>
              {group.section}
            </div>

            {group.items.map(item => {
              const active = path === item.href ||
                (item.href !== '/scraper/' && path.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.soon ? '#' : item.href}
                  style={{ textDecoration: 'none', display: 'block' }}
                  onClick={e => item.soon && e.preventDefault()}
                >
                  <div
                    className="sidebar-nav-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 10px',
                      minHeight: 40,
                      borderRadius: 8,
                      cursor: item.soon ? 'not-allowed' : 'pointer',
                      color: active
                        ? 'var(--accent-light)'
                        : item.soon ? 'var(--text-dim)' : 'var(--text-muted)',
                      background: active
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.1) 100%)'
                        : 'transparent',
                      border: active
                        ? '1px solid rgba(124,58,237,0.25)'
                        : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      opacity: item.soon ? 0.45 : 1,
                      position: 'relative',
                      marginBottom: 2,
                    }}
                  >
                    {/* Active accent bar */}
                    {active && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 18,
                        background: 'linear-gradient(180deg, var(--accent-light), var(--accent))',
                        borderRadius: '0 3px 3px 0',
                      }} />
                    )}

                    <Icon
                      size={15}
                      style={{
                        flexShrink: 0,
                        opacity: active ? 1 : 0.75,
                      }}
                    />

                    <span style={{
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      flex: 1,
                      minWidth: 0,
                    }}>
                      {item.label}
                    </span>

                    {(item.badge === 'sources' && sources.length > 0) ? (
                      <span style={{
                        fontSize: 10,
                        padding: '1px 7px',
                        borderRadius: 20,
                        background: 'var(--accent-glow)',
                        color: 'var(--accent-light)',
                        fontFamily: 'Geist Mono, monospace',
                        fontWeight: 600,
                        border: '1px solid rgba(124,58,237,0.2)',
                      }}>{sources.length}</span>
                    ) : (item.badge === 'pending' && (stats.pending ?? 0) > 0) ? (
                      <span style={{
                        fontSize: 10,
                        padding: '1px 7px',
                        borderRadius: 20,
                        background: 'var(--amber-bg)',
                        color: 'var(--amber)',
                        fontFamily: 'Geist Mono, monospace',
                        fontWeight: 600,
                        border: '1px solid rgba(245,158,11,0.2)',
                      }}>{stats.pending}</span>
                    ) : item.soon ? (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: 'var(--surface)',
                        color: 'var(--text-dim)',
                        fontFamily: 'Geist Mono, monospace',
                        letterSpacing: '0.5px',
                      }}>SOON</span>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div style={{
        padding: '10px 8px',
        borderTop: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.1)',
      }}>
        <Link
          href="/profile/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 8,
            marginBottom: 6,
            textDecoration: 'none',
            color: 'inherit',
            transition: 'background 0.15s',
          }}
          className="hover:opacity-90"
        >
          {/* Avatar */}
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}>
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
              {user?.name || 'User'}
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--text-dim)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user?.email || ''}
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => {
            clearAuth()
            router.push('/login/')
          }}
          className="sidebar-signout-btn"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 10px',
            minHeight: 36,
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 7,
            color: 'var(--text-dim)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <LogOut size={13} />
          Sign out
        </button>

        <div style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
          fontSize: 10,
          color: 'var(--text-dim)',
          textAlign: 'center',
          lineHeight: 1.4,
        }}>
          Idea & developed by <strong style={{ color: 'var(--text-muted)' }}>Vishwajeet Pandey</strong>
        </div>
      </div>
    </aside>
  )
}
