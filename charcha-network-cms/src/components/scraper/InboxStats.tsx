'use client'

import type { InboxStats as InboxStatsType } from '@/types/article'

interface InboxStatsProps {
  stats: InboxStatsType
  /** Shown under the Published count (default: WordPress). */
  publishedSub?: string
}

const statConfig = (
  publishedSub: string
): Array<{
  key: 'pending' | 'approved' | 'published' | 'rejected' | 'failed'
  label: string
  sub: string
  color: string
  glow: string
  border: string
}> => [
  {
    key: 'pending' as const,
    label: 'Pending',
    sub: 'Awaiting approval',
    color: 'var(--amber)',
    glow: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.18)',
  },
  {
    key: 'approved' as const,
    label: 'Approved',
    sub: 'Ready to rewrite',
    color: 'var(--green)',
    glow: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.18)',
  },
  {
    key: 'published' as const,
    label: 'Published',
    sub: publishedSub,
    color: 'var(--cyan)',
    glow: 'rgba(6,182,212,0.1)',
    border: 'rgba(6,182,212,0.18)',
  },
  {
    key: 'rejected' as const,
    label: 'Rejected',
    sub: 'Not suitable',
    color: 'var(--red)',
    glow: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.15)',
  },
  {
    key: 'failed' as const,
    label: 'Failed',
    sub: 'Fetch / extract errors',
    color: 'var(--text-muted)',
    glow: 'rgba(255,255,255,0.03)',
    border: 'var(--border)',
  },
]

export function InboxStats({
  stats = { pending: 0, approved: 0, rejected: 0, failed: 0, published: 0 },
  publishedSub = 'On WordPress',
}: InboxStatsProps) {
  const config = statConfig(publishedSub)
  return (
    <div
      className="inbox-stats-mobile-hide grid grid-cols-2 gap-2 border-b p-3 md:grid-cols-4 md:gap-2 md:p-3 lg:grid-cols-5"
      style={{
        borderColor: 'var(--border)',
        flexShrink: 0,
        background: 'var(--surface)',
      }}
    >
      {config.map(({ key, label, sub, color, glow, border }) => {
        const val = stats[key] ?? 0
        const isZero = val === 0
        return (
          <div
            key={key}
            style={{
              padding: '12px 14px',
              background: isZero ? 'var(--card)' : glow,
              border: `1px solid ${isZero ? 'var(--border)' : border}`,
              borderRadius: 10,
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Colored top accent line */}
            {!isZero && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: color,
                borderRadius: '10px 10px 0 0',
                opacity: 0.7,
              }} />
            )}
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '-1px',
                lineHeight: 1,
                marginBottom: 5,
                color: isZero ? 'var(--text-dim)' : color,
                fontFamily: 'Geist Mono, monospace',
              }}
            >
              {val}
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: isZero ? 'var(--text-dim)' : 'var(--text-muted)',
              lineHeight: 1.3,
            }}>
              {label}
            </div>
            <div className="hidden lg:block" style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
              {sub}
            </div>
          </div>
        )
      })}
    </div>
  )
}
