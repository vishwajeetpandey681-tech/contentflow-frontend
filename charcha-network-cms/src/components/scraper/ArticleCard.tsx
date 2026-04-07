'use client'

import { useState, useEffect } from 'react'
import { Check, X, RotateCw, RotateCcw, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Loader2, Pencil, Unlink, Lock, Star, Circle, Globe, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { timeAgo } from '@/lib/utils'
import { useContentWorkspace } from '@/lib/content-workspace'
import { getArticleUrl } from '@/lib/config'
import { useAuthStore } from '@/lib/auth-store'
import type { ScraperArticle, ArticleStatus, RewriteStatus } from '@/types/article'
import { RejectModal } from './RejectModal'
import toast from 'react-hot-toast'

interface ArticleCardProps {
  article: ScraperArticle
  onApprove: () => void
  onReject: (reason?: string) => void
  onRestore?: () => void
  onRefresh: () => void
  onRefreshStats?: () => void
  onRetryRewrite?: (id: string) => void
  onUpdatePost?: (id: string) => void
  onUnlink?: (id: string) => void
  onUnpublish?: (id: string) => void
  showActions?: boolean
  showPublishedActions?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onMarkRead?: (id: string, read: boolean) => void
  onMarkStar?: (id: string, starred: boolean) => void
  onRewriteWithTrend?: (id: string, trendKeyword: string, trendTraffic: string) => void
}

export function ArticleCard({
  article,
  onApprove,
  onReject,
  onRestore,
  onRefresh,
  onRefreshStats,
  onRetryRewrite,
  onUpdatePost,
  onUnlink,
  onUnpublish,
  showActions = false,
  showPublishedActions = false,
  selected = false,
  onToggleSelect,
  onMarkRead,
  onMarkStar,
  onRewriteWithTrend,
}: ArticleCardProps) {
  const router = useRouter()
  const { apis, routePrefix, wordpressEnabled } = useContentWorkspace()
  const inboxBase = routePrefix.inbox
  const currentUserId = useAuthStore(s => s.cmsUser?.id)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [localArticle, setLocalArticle] = useState<ScraperArticle>(article)
  const [fetchingFull, setFetchingFull] = useState(false)

  useEffect(() => {
    setLocalArticle(article)
  }, [article])

  const handleFetchFull = async () => {
    if (localArticle.fullContent || fetchingFull) return
    const hasValidUrl = typeof localArticle.url === 'string' && localArticle.url.startsWith('http')
    if (!hasValidUrl) {
      toast.error('No URL available to fetch')
      return
    }
    setFetchingFull(true)
    try {
      const res = await apis.inbox.fetchFull(localArticle.id)
      setLocalArticle(res.data?.data ?? localArticle)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch article')
    } finally {
      setFetchingFull(false)
    }
  }

  const handleReject = (reason?: string) => {
    onReject(reason)
    setRejectOpen(false)
  }

  const statusClass: Record<string, string> = {
    PENDING_REVIEW: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    FETCH_FAILED: 'failed',
    EXTRACTION_FAILED: 'failed',
    EXPORTED: 'failed',
  }
  const statusLabel: Record<string, string> = {
    PENDING_REVIEW: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    FETCH_FAILED: 'Fetch Failed',
    EXTRACTION_FAILED: 'Extract Failed',
    EXPORTED: 'Exported',
  }
  const statusStyles: Record<string, React.CSSProperties> = {
    pending: { background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.2)' },
    approved: { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)' },
    rejected: { background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' },
    failed: { background: 'rgba(255,255,255,0.04)', color: 'var(--text-dim)', border: '1px solid var(--border)' },
  }

  const rewriteStatus: RewriteStatus = article.rewriteStatus ?? 'IDLE'
  const isApproved = article.status === 'APPROVED'
  const hasValidUrl = typeof article.url === 'string' && article.url.startsWith('http')

  const displayArticle = localArticle.fullContent ? localArticle : article

  return (
    <>
      <div
        className="article-card"
        style={{
          background: 'var(--card)',
          border: '1px solid',
          borderColor: expanded ? 'rgba(124,58,237,0.35)' : 'var(--border)',
          borderRadius: 10,
          marginBottom: 6,
          overflow: 'hidden',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: expanded ? '0 0 0 1px rgba(124,58,237,0.1)' : 'none',
        }}
        onMouseEnter={e => {
          if (!expanded) {
            e.currentTarget.style.borderColor = 'var(--border-light)'
          }
        }}
        onMouseLeave={e => {
          if (!expanded) {
            e.currentTarget.style.borderColor = 'var(--border)'
          }
        }}
      >
        <div
          className="flex flex-row gap-2.5 p-3 md:gap-3 md:p-3.5"
          style={{ alignItems: 'flex-start', cursor: 'pointer' }}
          onClick={() => setExpanded(e => !e)}
        >
          {showActions && onToggleSelect && (
            <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, paddingTop: 2 }}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect()}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 16, height: 16 }}
              />
            </div>
          )}
          <div
            className="h-14 w-14 shrink-0 md:h-[60px] md:w-[60px]"
            style={{
              borderRadius: 8,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {article.image ? (
              <img
                src={article.image}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              '📰'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
            <div
              title={[article.title, article.description ? article.description.slice(0, 300) : ''].filter(Boolean).join('\n\n')}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: (article.isRead === true ? 'var(--text-dim)' : 'var(--text)'),
                lineHeight: 1.45,
                marginBottom: 5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
                letterSpacing: '-0.1px',
                flex: 1,
                minWidth: 0,
              }}
            >
              {article.title}
            </div>
            {(onMarkStar != null || onMarkRead != null) && (
              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                {onMarkRead != null && (
                  <button
                    type="button"
                    onClick={() => onMarkRead(article.id, !article.isRead)}
                    title={article.isRead ? 'Mark unread' : 'Mark read'}
                    style={{
                      padding: 4,
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      color: article.isRead ? 'var(--accent-light)' : 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    <Circle size={14} fill={article.isRead ? 'currentColor' : 'transparent'} />
                  </button>
                )}
                {onMarkStar != null && (
                  <button
                    type="button"
                    onClick={() => onMarkStar(article.id, !article.isStarred)}
                    title={article.isStarred ? 'Unstar' : 'Star'}
                    style={{
                      padding: 4,
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      color: article.isStarred ? 'var(--amber)' : 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    <Star size={14} fill={article.isStarred ? 'currentColor' : 'transparent'} />
                  </button>
                )}
              </div>
            )}
          </div>
            {article.description && (
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-dim)',
                  lineHeight: 1.45,
                  marginBottom: 6,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: 'hidden',
                }}
              >
                {article.description}
              </div>
            )}
            {/* Trending badge */}
            {article.isTrending && article.trendKeyword && (
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 5,
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.15))',
                    color: '#f97316',
                    border: '1px solid rgba(249,115,22,0.35)',
                    fontFamily: 'Geist Mono, monospace',
                    fontWeight: 600,
                  }}
                >
                  🔥 {article.trendKeyword}
                  {article.trendTraffic && (
                    <span style={{ opacity: 0.9, fontWeight: 500 }}> · {article.trendTraffic}</span>
                  )}
                </span>
                {onRewriteWithTrend && article.trendKeyword && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRewriteWithTrend(article.id, article.trendKeyword!, article.trendTraffic || 'Trending')
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      fontSize: 10,
                      fontWeight: 600,
                      background: 'var(--accent-glow)',
                      color: 'var(--accent-light)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontFamily: 'Geist Mono, monospace',
                    }}
                  >
                    <Zap size={10} />
                    Rewrite with trend keyword
                  </button>
                )}
              </div>
            )}
            {/* Meta badges row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {article.assignedTo && article.assignedToName && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 5,
                    background: article.assignedTo === currentUserId ? 'var(--green-bg)' : 'var(--surface)',
                    color: article.assignedTo === currentUserId ? 'var(--green)' : 'var(--text-muted)',
                    border: article.assignedTo === currentUserId ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border)',
                    fontFamily: 'Geist Mono, monospace',
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: article.assignedTo === currentUserId ? 'var(--green)' : 'var(--text-dim)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 7,
                      fontWeight: 600,
                    }}
                  >
                    {(article.assignedToName || '?').charAt(0).toUpperCase()}
                  </span>
                  Assigned to {article.assignedToName}
                </span>
              )}
              {article.lockedBy && article.lockedBy !== currentUserId && article.lockedByName && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 5,
                    background: 'var(--amber-bg)',
                    color: 'var(--amber)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    fontFamily: 'Geist Mono, monospace',
                  }}
                >
                  <Lock size={10} />
                  {article.lockedByName} is editing
                </span>
              )}
              {article.source?.name && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    border: '1px solid rgba(124,58,237,0.25)',
                    color: 'var(--accent-light)',
                    background: 'var(--accent-glow)',
                    fontFamily: 'Geist Mono, monospace',
                    fontWeight: 600,
                  }}
                >
                  {article.source.name}
                </span>
              )}
              {article.publishedToWebsite && (
                article.websiteSlug ? (
                  <a
                    href={getArticleUrl(article.websiteSlug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '1px solid rgba(33,150,243,0.3)',
                      color: '#1976d2',
                      background: 'rgba(33,150,243,0.1)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <Globe size={10} /> On Website
                  </a>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '1px solid rgba(33,150,243,0.3)',
                      color: '#1976d2',
                      background: 'rgba(33,150,243,0.1)',
                      fontWeight: 600,
                    }}
                  >
                    <Globe size={10} /> On Website
                  </span>
                )
              )}
              {article.category && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    color: 'var(--text-dim)',
                    background: 'var(--surface)',
                    fontFamily: 'Geist Mono, monospace',
                  }}
                >
                  {article.category}
                </span>
              )}
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  fontFamily: 'Geist Mono, monospace',
                }}
              >
                {timeAgo(article.publishedAt || article.createdAt)}
              </span>
              {article.wordCount > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'Geist Mono, monospace' }}>
                  · {article.wordCount}w
                </span>
              )}
              {!article.fullContent && article.description && hasValidUrl && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    border: '1px dashed var(--border)',
                    color: 'var(--text-dim)',
                    fontFamily: 'Geist Mono, monospace',
                  }}
                >
                  snippet
                </span>
              )}
            </div>
            {/* Rewrite badge — Approved tab only */}
            {isApproved && rewriteStatus !== 'IDLE' && (
              <div style={{ marginTop: 8 }}>
                {rewriteStatus === 'RUNNING' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'var(--amber-bg)',
                      color: 'var(--amber)',
                      border: '1px solid rgba(245,158,11,0.2)',
                      fontFamily: 'Geist Mono, monospace',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', animation: 'shimmer 1s ease-in-out infinite' }} />
                    Rewriting…
                  </span>
                )}
                {rewriteStatus === 'DONE' && (
                  <Link
                    href={`${inboxBase}/${article.id}/rewrite/`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background:
                        wordpressEnabled && article.wpPostId
                          ? 'rgba(34,211,238,0.15)'
                          : !wordpressEnabled && (article.publishedToWebsite || article.websiteSlug)
                            ? 'rgba(34,211,238,0.15)'
                            : 'var(--green-bg)',
                      color:
                        wordpressEnabled && article.wpPostId
                          ? 'var(--cyan)'
                          : !wordpressEnabled && (article.publishedToWebsite || article.websiteSlug)
                            ? 'var(--cyan)'
                            : 'var(--green)',
                      border:
                        wordpressEnabled && article.wpPostId
                          ? '1px solid rgba(34,211,238,0.2)'
                          : !wordpressEnabled && (article.publishedToWebsite || article.websiteSlug)
                            ? '1px solid rgba(34,211,238,0.2)'
                            : '1px solid rgba(34,197,94,0.2)',
                      fontFamily: 'Geist Mono, monospace',
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {wordpressEnabled
                      ? article.wpPostId
                        ? '✓ Published'
                        : '✓ Ready to Publish'
                      : article.publishedToWebsite || article.websiteSlug
                        ? '✓ On site'
                        : '✓ Ready to publish'}
                  </Link>
                )}
                {rewriteStatus === 'FAILED' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 10,
                      fontFamily: 'Geist Mono, monospace',
                    }}
                  >
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'var(--red-bg)',
                        color: 'var(--red)',
                        border: '1px solid rgba(239,68,68,0.2)',
                      }}
                    >
                      <AlertTriangle size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      Rewrite Failed
                    </span>
                    {onRetryRewrite && (
                      <button
                        onClick={() => onRetryRewrite(article.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          fontSize: 10,
                          background: 'transparent',
                          color: 'var(--warning)',
                          border: '1px solid var(--warning)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontFamily: 'Geist Mono, monospace',
                        }}
                      >
                        Retry
                      </button>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="article-card-actions flex flex-col gap-1" style={{ alignItems: 'flex-end', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 6,
                fontWeight: 600,
                fontFamily: 'Geist Mono, monospace',
                letterSpacing: 0.3,
                ...statusStyles[statusClass[article.status] || 'failed'],
              }}
            >
              {statusLabel[article.status] || article.status}
            </span>
            {article.wpPostId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(0,229,160,0.12)',
                    color: '#00e5a0',
                    border: '1px solid rgba(0,229,160,0.25)',
                    fontFamily: 'Geist Mono, monospace',
                    fontWeight: 600,
                  }}
                >
                  <Globe size={9} style={{ display: 'inline' }} />
                  🌐 Published
                </span>
                {article.wpPostUrl && (
                  <a
                    href={article.wpPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 9,
                      color: 'var(--text-dim)',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={8} /> View Live
                  </a>
                )}
              </div>
            )}
            {/* REJECTED: Restore to pending */}
            {article.status === 'REJECTED' && onRestore && (
              <div style={{ marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => onRestore()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 10px',
                    background: 'var(--surface)',
                    color: 'var(--accent-light)',
                    border: '1px solid rgba(124,58,237,0.35)',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={12} />
                  Restore to pending
                </button>
              </div>
            )}
            {/* PENDING: Approve + Reject */}
            {showActions && (
              <div className="flex gap-1" style={{ marginTop: 4 }}>
                <button
                  onClick={onApprove}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 10px',
                    background: 'var(--green-bg)',
                    color: 'var(--green)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Check size={12} />
                  Approve
                </button>
                <button
                  onClick={() => setRejectOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 10px',
                    background: 'var(--red-bg)',
                    color: 'var(--red)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <X size={12} />
                  Reject
                </button>
              </div>
            )}
            {/* PUBLISHED: Update post & Unlink/Unpublish (WordPress — not used in Charcha) */}
            {wordpressEnabled && showPublishedActions && article.wpPostId && onUpdatePost && (
              <div className="flex gap-1" style={{ marginTop: 4 }}>
                <button
                  onClick={() => onUpdatePost(article.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 10px',
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-light)',
                    border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Pencil size={12} />
                  Update
                </button>
                {onUnpublish && (
                  <button
                    onClick={() => onUnpublish(article.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                      background: 'var(--red-bg)', color: 'var(--red)',
                      border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    <Unlink size={12} /> Unpublish
                  </button>
                )}
                {onUnlink && !onUnpublish && (
                <button
                  onClick={() => onUnlink(article.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 10px',
                    background: 'var(--surface)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  <Unlink size={12} />
                  Unlink
                </button>
                )}
              </div>
            )}
            {/* APPROVED: action button by rewrite status */}
            {isApproved && !showActions && !showPublishedActions && (
              <div style={{ marginTop: 4 }}>
                {rewriteStatus === 'IDLE' && (
                  <button
                    onClick={() => router.push(`${inboxBase}/${article.id}/rewrite/`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      background: 'var(--accent-glow)',
                      color: 'var(--accent-light)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Review & Publish →
                  </button>
                )}
                {rewriteStatus === 'RUNNING' && (
                  <button
                    onClick={() => router.push(`${inboxBase}/${article.id}/rewrite/`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      background: 'var(--surface)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    View Progress →
                  </button>
                )}
                {rewriteStatus === 'DONE' && (
                  <button
                    onClick={() => router.push(`${inboxBase}/${article.id}/rewrite/`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      background: 'var(--accent-glow)',
                      color: 'var(--accent-light)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Review & Publish →
                  </button>
                )}
                {rewriteStatus === 'FAILED' && onRetryRewrite && (
                  <button
                    onClick={() => onRetryRewrite(article.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      background: 'transparent',
                      color: 'var(--warning)',
                      border: '1px solid var(--warning)',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCw size={12} />
                    Retry Rewrite
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); setExpanded(e2 => !e2); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {expanded && (
          <div
            style={{
              padding: '0 14px 14px',
              borderTop: '1px solid var(--border)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {fetchingFull ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />
                Fetching full article...
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text)',
                    lineHeight: 1.7,
                    maxHeight: 320,
                    overflowY: 'auto',
                    marginTop: 12,
                    marginBottom: 12,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {displayArticle.fullContent || displayArticle.description || (
                    <span style={{ color: 'var(--text-dim)' }}>No content yet.</span>
                  )}
                </div>
                {!displayArticle.fullContent && hasValidUrl && (
                  <button
                    onClick={handleFetchFull}
                    disabled={fetchingFull}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 12,
                      padding: '8px 14px',
                      background: 'var(--accent-glow)',
                      color: 'var(--accent-light)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: fetchingFull ? 'not-allowed' : 'pointer',
                      opacity: fetchingFull ? 0.7 : 1,
                    }}
                  >
                    {fetchingFull ? (
                      <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                    {fetchingFull ? 'Fetching...' : 'Fetch full article'}
                  </button>
                )}
                {hasValidUrl && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11,
                      color: 'var(--cyan)',
                      textDecoration: 'none',
                      fontFamily: 'Geist Mono, monospace',
                    }}
                  >
                    <ExternalLink size={11} />
                    Open URL
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <RejectModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
      />
    </>
  )
}
