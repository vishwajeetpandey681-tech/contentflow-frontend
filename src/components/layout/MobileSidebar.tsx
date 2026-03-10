'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Rss, Inbox, Settings, Newspaper, Zap, LogOut, User, Users, FolderOpen } from 'lucide-react'
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
      { label: 'Sources', href: '/scraper/', icon: Rss, badge: 'sources' },
      { label: 'Inbox', href: '/scraper/inbox/', icon: Inbox, badge: 'pending' },
    ],
  },
  {
    section: 'Publishing',
    items: [
      { label: 'File Manager', href: '/files/', icon: FolderOpen },
      { label: 'WordPress', href: '/wordpress/', icon: Newspaper },
      { label: 'Social', href: '/social', icon: Zap, soon: true },
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

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const path = usePathname()
  const router = useRouter()
  const prevPathRef = useRef(path)
  const { sources = [] } = useSources()
  const { stats = { pending: 0, approved: 0, rejected: 0, failed: 0 } } = useStats()
  const user = useAuthStore(s => s.user)
  const clearAuth = useAuthStore(s => s.clearAuth)

  useEffect(() => {
    if (prevPathRef.current !== path) {
      prevPathRef.current = path
      onClose()
    }
  }, [path, onClose])

  return (
    <Dialog.Root open={open} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[100]"
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
        />
        <Dialog.Content
          className="fixed top-0 left-0 z-[101] flex h-full w-[260px] flex-col overflow-hidden"
          style={{
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
            animation: 'slideInLeft 0.2s ease',
          }}
          onEscapeKeyDown={() => onClose()}
          onPointerDownOutside={() => onClose()}
        >
          <div className="flex h-full w-[260px] flex-col overflow-hidden">
            <div
              className="flex shrink-0 items-center gap-2.5 px-3.5"
              style={{
                height: 'var(--topbar)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-xs font-extrabold"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
                  letterSpacing: '-0.5px',
                }}
              >
                CF
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold tracking-[-0.4px]">CSR Studio</div>
                <div
                  className="inline-flex items-center rounded text-[8px] font-bold font-mono tracking-[1.5px] px-[5px] py-px"
                  style={{
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-light)',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}
                >
                  BETA
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-auto p-2 pt-0">
              {navItems.map(group => (
                <div key={group.section} className="mb-4">
                  <div
                    className="px-2 py-1 pt-2 font-mono text-[10px] uppercase tracking-wider"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    {group.section}
                  </div>
                  {group.items.map(item => {
                    const active =
                      path === item.href || (item.href !== '/scraper/' && path.startsWith(item.href))
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.soon ? '#' : item.href}
                        className="block no-underline"
                        onClick={e => item.soon && e.preventDefault()}
                      >
                        <div
                          className="mobile-sidebar-nav-item relative flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-all"
                          style={{
                            color: active ? 'var(--accent-light)' : item.soon ? 'var(--text-dim)' : 'var(--text-muted)',
                            background: active
                              ? 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.1) 100%)'
                              : 'transparent',
                            border: active ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
                            opacity: item.soon ? 0.45 : 1,
                            marginBottom: 2,
                          }}
                        >
                          {active && (
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r"
                              style={{ width: 3, height: 18, background: 'linear-gradient(180deg, var(--accent-light), var(--accent))' }}
                            />
                          )}
                          <Icon size={14} className="shrink-0" />
                          <span className="text-[13px] font-medium">{item.label}</span>
                          {(item.badge === 'sources' && sources.length > 0) ? (
                            <span
                              className="ml-auto rounded-full px-1.5 py-0.5 font-mono text-[10px]"
                              style={{
                                background: 'var(--accent-glow)',
                                color: 'var(--accent-light)',
                              }}
                            >
                              {sources.length}
                            </span>
                          ) : (item.badge === 'pending' && (stats.pending ?? 0) > 0) ? (
                            <span
                              className="ml-auto rounded-full px-1.5 py-0.5 font-mono text-[10px]"
                              style={{
                                background: 'var(--amber-bg)',
                                color: 'var(--amber)',
                              }}
                            >
                              {stats.pending}
                            </span>
                          ) : item.soon ? (
                            <span className="ml-auto font-mono text-[9px]" style={{ color: 'var(--text-dim)' }}>
                              SOON
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>

            <div
              className="shrink-0 p-2"
              style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}
            >
              <Link
                href="/profile/"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 mb-1.5 no-underline"
                style={{ color: 'inherit' }}
              >
                <div
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-[12px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                    color: '#fff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold leading-tight">{user?.name || 'User'}</div>
                  <div className="truncate text-[10px]" style={{ color: 'var(--text-dim)' }}>
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
                className="sidebar-signout-btn flex w-full min-h-[36px] items-center justify-center gap-1.5 rounded-[7px] border text-[11px] font-medium transition-all"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-dim)',
                }}
              >
                <LogOut size={13} />
                Sign out
              </button>
              <div
                className="mt-3 pt-2 text-center text-[10px] leading-snug"
                style={{ borderTop: '1px solid var(--border)', color: 'var(--text-dim)' }}
              >
                All Right Is Reserved 2026
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
