'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw, Loader2, CheckCircle2, AlertCircle, Clock, Globe, XCircle } from 'lucide-react'
import { publishApi } from '@/lib/api'
import type { WpPublishHistoryEntry } from '@/lib/api'
import { timeAgo } from '@/lib/utils'

interface Props {
  articleId: string
  refreshKey?: number
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  published:   { label: 'Published',  color: '#00e5a0', bg: 'rgba(0,229,160,0.08)',  icon: <CheckCircle2 size={12} /> },
  draft:       { label: 'Draft',      color: 'var(--amber)', bg: 'var(--amber-bg)',  icon: <Clock size={12} /> },
  scheduled:   { label: 'Scheduled',  color: 'var(--cyan)', bg: 'var(--cyan-bg)',    icon: <Clock size={12} /> },
  failed:      { label: 'Failed',     color: 'var(--red)', bg: 'var(--red-bg)',      icon: <AlertCircle size={12} /> },
  unpublished: { label: 'Unpublished', color: 'var(--text-dim)', bg: 'var(--surface)', icon: <XCircle size={12} /> },
  pending:     { label: 'Pending',    color: 'var(--text-dim)', bg: 'var(--surface)', icon: <Loader2 size={12} /> },
}

export function PublishHistory({ articleId, refreshKey }: Props) {
  const [history, setHistory] = useState<WpPublishHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    publishApi.history(articleId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [articleId, refreshKey])

  if (loading) return (
    <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 12 }}>
      <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> Loading history…
    </div>
  )

  if (history.length === 0) return (
    <div style={{ padding: '12px 0', color: 'var(--text-dim)', fontSize: 12 }}>No publish history yet.</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {history.map(entry => {
        const cfg = statusConfig[entry.status] || statusConfig.pending
        return (
          <div key={entry.id} style={{ padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: cfg.bg, color: cfg.color, borderRadius: 20, fontSize: 10, fontWeight: 600 }}>
                {cfg.icon} {cfg.label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Globe size={10} /> {entry.siteLabel || entry.siteId}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                {timeAgo(entry.attemptedAt)}
              </span>
            </div>
            {entry.title && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</div>}
            {entry.error && <div style={{ fontSize: 11, color: 'var(--red)', padding: '4px 8px', background: 'var(--red-bg)', borderRadius: 6 }}>{entry.error}</div>}
            {entry.postUrl && (
              <a href={entry.postUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent-light)', textDecoration: 'none' }}>
                <ExternalLink size={10} /> View on site
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}
