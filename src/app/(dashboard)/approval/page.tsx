'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, X, Edit3, Loader2, FileText, AlertCircle } from 'lucide-react'
import { approvalApi, type ApprovalStats, type AutoApproveSettings } from '@/lib/api'
import type { ScraperArticle } from '@/types/article'
import toast from 'react-hot-toast'

const REJECT_REASONS = [
  { value: 'Too short', label: 'Too short' },
  { value: 'Inaccurate', label: 'Inaccurate' },
  { value: 'Sensitive content', label: 'Sensitive content' },
  { value: 'Duplicate', label: 'Duplicate' },
  { value: 'Other', label: 'Other' },
]

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatTimeAgo(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  return d.toLocaleDateString()
}

export default function ApprovalPage() {
  const [items, setItems] = useState<ScraperArticle[]>([])
  const [stats, setStats] = useState<ApprovalStats | null>(null)
  const [autoApprove, setAutoApprove] = useState<AutoApproveSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'low' | 'auto' | 'rejected'>('pending')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string; notes: string } | null>(null)
  const [editMode, setEditMode] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const [pendingRes, statsRes, settingsRes] = await Promise.all([
        approvalApi.pending(),
        approvalApi.stats(),
        approvalApi.autoApproveSettings.get().catch(() => ({
          enabled: false,
          threshold: 80,
          trustedSources: ['TOI', 'NDTV', 'Hindu', 'ANI', 'PTI', 'HT', 'ET', 'BBC', 'Reuters', 'Moneycontrol'],
          blockedKeywords: ['death', 'murder', 'riot', 'violence', 'rape', 'bomb', 'terror', 'blast', 'attack'],
          publishDelay: 0,
          notifyOnReject: false,
        })),
      ])
      setItems(pendingRes)
      setStats(statsRes)
      setAutoApprove(settingsRes)
      setSelectedIndex(0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const current = items[selectedIndex]

  const handleApprove = useCallback(async (id: string) => {
    setApproving(id)
    try {
      await approvalApi.approve(id)
      toast.success('Approved')
      setItems(prev => {
        const next = prev.filter(i => i.id !== id)
        setSelectedIndex(i => Math.min(i, Math.max(0, next.length - 1)))
        return next
      })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setApproving(null)
    }
  }, [load])

  const handleReject = async () => {
    if (!rejectModal) return
    const { id, reason, notes } = rejectModal
    setRejecting(id)
    try {
      await approvalApi.reject(id, notes ? `${reason}: ${notes}` : reason)
      toast.success('Rejected')
      setRejectModal(null)
      setItems(prev => prev.filter(i => i.id !== id))
      setSelectedIndex(prev => Math.max(0, Math.min(prev, items.length - 2)))
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setRejecting(null)
    }
  }

  const handleEditSave = async () => {
    if (!editMode || !editDraft) return
    try {
      await approvalApi.edit(editMode, editDraft)
      toast.success('Saved and approved')
      setEditMode(null)
      setEditDraft({})
      setItems(prev => prev.filter(i => i.id !== editMode))
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Edit failed')
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        handleApprove(current.id)
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setRejectModal({ id: current.id, reason: 'Other', notes: '' })
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        const draft: Record<string, string> = {}
        for (const p of current.rewrite?.passes || []) {
          draft[p.id] = p.output || ''
        }
        setEditDraft(draft)
        setEditMode(current.id)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, items.length, handleApprove])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: 20, borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Link
            href="/scraper/inbox/"
            style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}
          >
            <ArrowLeft size={18} style={{ marginRight: 6 }} />
            Back
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Approval Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Auto-Approve</span>
            <div
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: autoApprove?.enabled ? 'var(--accent)' : 'var(--card)',
                border: '1px solid var(--border)',
                position: 'relative',
                cursor: 'pointer',
              }}
              onClick={() => approvalApi.autoApproveSettings.save({ enabled: !autoApprove?.enabled }).then(() => load()).catch(() => {})}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: '#fff',
                  position: 'absolute',
                  top: 2,
                  left: autoApprove?.enabled ? 22 : 2,
                  transition: 'left 0.2s',
                }}
              />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-light)' }}>
              {autoApprove?.enabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Pending', value: stats.pending, color: 'var(--accent)' },
              { label: 'Auto-approved today', value: stats.autoApprovedToday, color: 'var(--cyan)' },
              { label: 'Human reviewed', value: stats.humanReviewed, color: 'var(--text-muted)' },
              { label: 'Rejected', value: stats.rejected, color: 'var(--red)' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  padding: '10px 16px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  minWidth: 120,
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'pending' as const, label: '🔴 Needs Review' },
            { id: 'all' as const, label: 'All' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                background: filter === t.id ? 'var(--accent)' : 'var(--card)',
                color: filter === t.id ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${filter === t.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={36} style={{ color: 'var(--text-dim)' }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>All caught up!</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
              No articles pending review 🎉
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, maxWidth: 900, margin: '0 auto' }}>
            {/* List */}
            <div style={{ width: 200, flexShrink: 0 }}>
              {items.map((item, i) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedIndex(i)}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    background: selectedIndex === i ? 'var(--accent-glow)' : 'var(--card)',
                    border: `1px solid ${selectedIndex === i ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.title?.slice(0, 50) || 'Untitled'}…
                </div>
              ))}
            </div>

            {/* Detail */}
            {current && (
              <div
                key={current.id}
                style={{
                  flex: 1,
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                      Score: {current.approvalScore ?? 0}/100
                    </span>
                    {(current.approvalScore ?? 0) < (autoApprove?.threshold ?? 80) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
                        <AlertCircle size={14} /> NEEDS REVIEW
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    {current.approvalReasons?.map((r, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        {r.startsWith('✓') || r.startsWith('Good') || r.startsWith('Acceptable') || r.startsWith('Has') || r.startsWith('No sensitive') || r.startsWith('Trusted')
                          ? '✓ '
                          : '⚠️ '}
                        {r}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    Source: {current.sourceName || current.source?.name || 'Unknown'} · {formatTimeAgo(current.rewrite?.completedAt || current.createdAt || '')}
                  </div>
                </div>

                {editMode === current.id ? (
                  <div style={{ padding: 20 }}>
                    {current.rewrite?.passes?.map(p => (
                      <div key={p.id} style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{p.label}</label>
                        <textarea
                          value={editDraft[p.id] ?? p.output ?? ''}
                          onChange={e => setEditDraft(prev => ({ ...prev, [p.id]: e.target.value }))}
                          rows={p.id === 'full' ? 12 : 2}
                          style={{
                            width: '100%',
                            padding: 12,
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            color: 'var(--text)',
                            fontSize: 13,
                            resize: 'vertical',
                          }}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button
                        onClick={handleEditSave}
                        style={{
                          padding: '10px 18px',
                          background: 'var(--accent)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Save & Approve
                      </button>
                      <button
                        onClick={() => { setEditMode(null); setEditDraft({}) }}
                        style={{
                          padding: '10px 18px',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>HEADLINE</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
                        {current.rewrite?.passes?.find(p => p.id === 'char65')?.output || current.title}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>FULL REWRITE PREVIEW</div>
                      <div
                        style={{
                          maxHeight: 200,
                          overflowY: 'auto',
                          fontSize: 13,
                          color: 'var(--text)',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          marginBottom: 16,
                        }}
                      >
                        {stripHtml(current.rewrite?.passes?.find(p => p.id === 'full')?.output || '').slice(0, 800)}
                        {(current.rewrite?.passes?.find(p => p.id === 'full')?.output || '').length > 800 && '…'}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>KEYWORDS</div>
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>
                        {current.rewrite?.passes?.find(p => p.id === 'keywords')?.output || '—'}
                      </div>
                    </div>

                    <div style={{ padding: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleApprove(current.id)}
                        disabled={approving === current.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 18px',
                          background: 'var(--accent)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: approving === current.id ? 'not-allowed' : 'pointer',
                          opacity: approving === current.id ? 0.7 : 1,
                        }}
                      >
                        {approving === current.id ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Check size={14} />}
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const draft: Record<string, string> = {}
                          for (const p of current.rewrite?.passes || []) {
                            draft[p.id] = p.output || ''
                          }
                          setEditDraft(draft)
                          setEditMode(current.id)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 18px',
                          background: 'var(--accent-glow)',
                          color: 'var(--accent-light)',
                          border: '1px solid rgba(124,58,237,0.3)',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Edit3 size={14} />
                        Edit & Approve
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: current.id, reason: 'Other', notes: '' })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 18px',
                          background: 'transparent',
                          color: 'var(--red)',
                          border: '1px solid var(--red)',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <X size={14} />
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !rejecting && setRejectModal(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Reject article</div>
            <select
              value={rejectModal.reason}
              onChange={e => setRejectModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 12,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
              }}
            >
              {REJECT_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <textarea
              placeholder="Optional notes..."
              value={rejectModal.notes}
              onChange={e => setRejectModal(prev => prev ? { ...prev, notes: e.target.value } : null)}
              rows={3}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 16,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{ padding: '10px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting === rejectModal.id}
                style={{ padding: '10px 16px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: rejecting ? 'not-allowed' : 'pointer' }}
              >
                {rejecting ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
