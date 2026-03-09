'use client'

import { Play, Pause, Trash2 } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import type { ScraperSource } from '@/types/source'

interface SourceCardProps {
  source: ScraperSource
  selected?: boolean
  onSelect: () => void
  onTrigger: (e?: React.MouseEvent) => void
  onToggleActive: (e?: React.MouseEvent) => void
  onDelete: (e?: React.MouseEvent) => void
  isScraping?: boolean
}

export function SourceCard({
  source,
  selected,
  onSelect,
  onTrigger,
  onToggleActive,
  onDelete,
  isScraping = false,
}: SourceCardProps) {
  const counts = source.counts || { pending: 0, approved: 0, rejected: 0, failed: 0, total: 0 }
  const dotColor = source.isBlocked ? '#ef4444' : source.isActive ? '#22c55e' : '#52525b'

  return (
    <div
      className="source-card group"
      onClick={onSelect}
      title={source.url}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 11px',
        background: selected
          ? 'linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(79,70,229,0.07) 100%)'
          : 'var(--card)',
        border: '1px solid',
        borderColor: selected ? 'rgba(124,58,237,0.35)' : 'var(--border)',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontSize: 12,
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.background = 'var(--card-hover)'
          e.currentTarget.style.borderColor = 'var(--border-light)'
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.background = 'var(--card)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }
      }}
    >
      {/* Status dot */}
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          boxShadow: `0 0 5px ${dotColor}80`,
          animation: source.isBlocked || !source.isActive ? 'none' : 'breathe 2.5s ease-in-out infinite',
        }}
      />

      {/* Name */}
      <span
        style={{
          flex: 1,
          fontWeight: 500,
          fontSize: 12,
          color: source.isActive ? 'var(--text)' : 'var(--text-dim)',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {source.name}
      </span>

      {/* Badges — hidden on very narrow, shown in normal flow */}
      <div className="hidden sm:flex items-center gap-1" style={{ flexShrink: 0 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 5px',
            background: 'var(--cyan-bg)',
            color: 'var(--cyan)',
            borderRadius: 4,
            fontFamily: 'Geist Mono, monospace',
            letterSpacing: '0.3px',
          }}
        >
          {source.type === 'HTML_LISTING' ? 'HTML' : source.type}
        </span>
        {source.channel && (
          <span
            style={{
              fontSize: 9,
              padding: '2px 5px',
              background: 'var(--surface)',
              color: 'var(--text-dim)',
              borderRadius: 4,
              fontFamily: 'Geist Mono, monospace',
            }}
          >
            {source.channel}
          </span>
        )}
      </div>

      {/* Mini counts */}
      <div className="hidden md:flex items-center gap-1.5" style={{ flexShrink: 0, fontSize: 10, fontFamily: 'Geist Mono, monospace' }}>
        {counts.pending > 0 && (
          <span style={{ color: 'var(--amber)' }}>{counts.pending}p</span>
        )}
        {counts.approved > 0 && (
          <span style={{ color: 'var(--green)' }}>{counts.approved}✓</span>
        )}
        {counts.failed > 0 && (
          <span style={{ color: 'var(--red)' }}>{counts.failed}✕</span>
        )}
      </div>

      {/* Last scraped */}
      <span
        className="hidden lg:block"
        style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0, fontFamily: 'Geist Mono, monospace', minWidth: 40, textAlign: 'right' }}
        title={source.lastScrapedAt ? timeAgo(source.lastScrapedAt) : 'Never scraped'}
      >
        {source.isBlocked
          ? <span style={{ color: 'var(--red)' }}>blocked</span>
          : source.lastScrapedAt ? timeAgo(source.lastScrapedAt) : '—'}
      </span>

      {/* Actions */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}
      >
        {/* Pull button */}
        <button
          onClick={onTrigger}
          disabled={isScraping || source.isBlocked}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            padding: 0,
            background: source.isBlocked ? 'var(--surface)' : 'var(--accent)',
            color: source.isBlocked ? 'var(--text-dim)' : '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: isScraping || source.isBlocked ? 'not-allowed' : 'pointer',
            opacity: isScraping || source.isBlocked ? 0.4 : 1,
            transition: 'opacity 0.15s',
          }}
          title="Pull now"
        >
          {isScraping ? (
            <span style={{ width: 9, height: 9, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'block' }} />
          ) : (
            <Play size={10} />
          )}
        </button>

        {/* Toggle active */}
        <button
          onClick={onToggleActive}
          style={{
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: source.isActive ? 'var(--green-bg)' : 'var(--surface)',
            color: source.isActive ? 'var(--green)' : 'var(--text-dim)',
            border: `1px solid ${source.isActive ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          title={source.isActive ? 'Pause source' : 'Enable source'}
        >
          {source.isActive ? <Pause size={9} /> : <Play size={9} />}
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          style={{
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: 'var(--text-dim)',
            border: '1px solid transparent',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          title="Delete source"
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--red-bg)'
            e.currentTarget.style.color = 'var(--red)'
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-dim)'
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}
