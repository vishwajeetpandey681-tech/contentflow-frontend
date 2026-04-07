'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, CheckCheck, Calendar, Filter, Flame } from 'lucide-react'
import { useInbox } from '@/hooks/useInbox'
import { useStats } from '@/hooks/useStats'
import { useSources } from '@/hooks/useSources'
import type { InboxListParams } from '@/lib/api'
import { useContentWorkspace } from '@/lib/content-workspace'
import { InboxStats } from '@/components/scraper/InboxStats'
import { ArticleCard } from '@/components/scraper/ArticleCard'
import { ArticleCardSkeleton } from '@/components/scraper/ArticleCardSkeleton'
import { Spinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import type { ArticleStatus } from '@/types/article'
import { ARTICLE_CATEGORIES } from '@/types/source'

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10)
}

function toDateTimeLocal(d: Date, endOfDay = false) {
  const x = new Date(d)
  if (endOfDay) x.setHours(23, 59, 0, 0)
  else x.setHours(0, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`
}

const DATE_PRESETS = [
  { id: '', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
] as const

const TAB_STATUSES: (ArticleStatus | 'published')[] = ['PENDING_REVIEW', 'APPROVED', 'published', 'REJECTED', 'FETCH_FAILED']

const TAB_LABELS: Record<ArticleStatus | 'published', string> = {
  PENDING_REVIEW: 'Pending',
  APPROVED: 'Approved',
  published: 'Published',
  REJECTED: 'Rejected',
  FETCH_FAILED: 'Failed',
  EXTRACTION_FAILED: 'Failed',
  EXPORTED: 'Exported',
}

const LS_PREFIX = 'charcha'

function readPendingViewFromStorage(): 'all' | 'trending' {
  if (typeof window === 'undefined') return 'all'
  try {
    const v = localStorage.getItem(`${LS_PREFIX}-inbox-pending-view`)
    if (v === 'all' || v === 'trending') return v
    const myOnly = localStorage.getItem(`${LS_PREFIX}-inbox-my-sources-only`)
    const mySourcesOn = myOnly === null || myOnly === '1'
    return mySourcesOn ? 'trending' : 'all'
  } catch {
    return 'all'
  }
}

function InboxTabContent({
  status,
  search,
  limit,
  articles,
  total,
  loading,
  loadingMore,
  error,
  hasMore,
  loadMore,
  onRefresh,
  onApprove,
  onReject,
  onRestore,
  refreshStats,
  onRetryRewrite,
  onUpdatePost,
  onUnlink,
  onUnpublish,
  showPublishedActions,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onMarkRead,
  onMarkStar,
  onRewriteWithTrend,
  wordpressEnabled,
  pendingTrendingOnly = false,
}: {
  status: ArticleStatus | 'published'
  search: string
  limit: number
  articles: import('@/types/article').ScraperArticle[]
  total: number
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  onRefresh: () => void
  onApprove: (id: string) => void
  onReject: (id: string, reason?: string) => void
  onRestore?: (id: string) => void
  refreshStats: () => void
  onRetryRewrite?: (id: string) => void
  onUpdatePost?: (id: string) => void
  onUnlink?: (id: string) => void
  onUnpublish?: (id: string) => void
  showPublishedActions?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAll?: (checked: boolean) => void
  onMarkRead?: (id: string, read: boolean) => void
  onMarkStar?: (id: string, starred: boolean) => void
  onRewriteWithTrend?: (id: string, trendKeyword: string, trendTraffic: string) => void
  wordpressEnabled: boolean
  /** Pending tab + "Trending now" sub-filter — custom empty copy */
  pendingTrendingOnly?: boolean
}) {
  const [loadingHint, setLoadingHint] = useState(false)
  const showActions = status === 'PENDING_REVIEW'

  useEffect(() => {
    if (!loading) {
      setLoadingHint(false)
      return
    }
    const t = setTimeout(() => setLoadingHint(true), 4000)
    return () => clearTimeout(t)
  }, [loading])

  const emptyIcons: Record<string, string> = {
    PENDING_REVIEW: '⏳',
    APPROVED: '✅',
    published: '📤',
    REJECTED: '✕',
    FETCH_FAILED: '⚠️',
  }
  const emptyTitles: Record<string, string> = {
    PENDING_REVIEW: 'No pending articles',
    APPROVED: 'No approved articles',
    published: 'No published articles',
    REJECTED: 'No rejected articles',
    FETCH_FAILED: 'No failed articles',
  }
  const emptySubs: Record<string, string> = {
    PENDING_REVIEW: 'Add a source and click Scrape Now to fetch articles',
    APPROVED: 'Articles will appear here after you process them from the Pending tab',
    published: wordpressEnabled
      ? 'Articles published to WordPress will appear here'
      : 'Articles live on the news site appear here',
    REJECTED: 'Restore any item to Pending to review it again',
    FETCH_FAILED: 'Articles will appear here after you process them from the Pending tab',
  }

  return (
    <div className="inbox-content-area flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
      {error ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            gap: 12,
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          <span style={{ color: 'var(--red)' }}>Failed to load articles</span>
          <span style={{ textAlign: 'center', maxWidth: 280 }}>{error}</span>
          <button
            onClick={() => { onRefresh(); refreshStats(); }}
            style={{
              padding: '8px 16px',
              fontSize: 12,
              background: 'var(--accent-glow)',
              color: 'var(--accent-light)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="p-4 md:p-6">
          {/* Mobile: skeleton cards; Desktop: spinner */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {[1, 2, 3, 4].map(i => <ArticleCardSkeleton key={i} />)}
          </div>
          <div
            className="hidden md:flex flex-col items-center justify-center"
            style={{
              height: 200,
              gap: 10,
              color: 'var(--text-muted)',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Spinner size={18} />
              <span>Loading articles...</span>
            </div>
            {loadingHint && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 11,
                  color: 'var(--text-dim)',
                  textAlign: 'center',
                  maxWidth: 280,
                }}
              >
                Taking longer than usual? Ensure your Charcha API is running and{' '}
                <code style={{ fontSize: 10 }}>NEXT_PUBLIC_CHARCHA_API_URL</code> in <code style={{ fontSize: 10 }}>.env.local</code> points to http://localhost:4500/api.
              </div>
            )}
          </div>
        </div>
      ) : articles.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 280,
            gap: 12,
          }}
        >
          <div style={{ fontSize: 40, opacity: 0.25 }}>{emptyIcons[status] || '📰'}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
            {emptyTitles[status]}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
            {emptySubs[status]}
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 12,
              padding: '8px 0',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Geist Mono, monospace' }}>
                {total > 0 ? `Showing 1–${articles.length} of ${total}` : `${articles.length} articles`}
              </span>
              {showActions && onSelectAll && selectedIds !== undefined && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={articles.length > 0 && articles.every(a => selectedIds.has(a.id))}
                    onChange={e => onSelectAll(e.target.checked)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Select all
                </label>
              )}
            </div>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  background: 'var(--accent-glow)',
                  color: 'var(--accent-light)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: 6,
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                }}
              >
                {loadingMore ? (
                  <>
                    <Spinner size={12} />
                    Loading…
                  </>
                ) : (
                  `Load more (${total - articles.length} left)`
                )}
              </button>
            )}
          </div>
          {status === 'PENDING_REVIEW' && articles.some(a => a.isTrending) && !pendingTrendingOnly && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#f97316',
                }}
              >
                <Flame size={16} />
                TRENDING NOW
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {[...articles]
            .sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0))
            .map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onApprove={() => onApprove(article.id)}
              onReject={reason => onReject(article.id, reason)}
              onRestore={onRestore ? () => onRestore(article.id) : undefined}
              onRefresh={onRefresh}
              onRefreshStats={refreshStats}
              onRetryRewrite={onRetryRewrite}
              onUpdatePost={onUpdatePost}
              onUnlink={onUnlink}
              onUnpublish={onUnpublish}
              onMarkRead={onMarkRead}
              onMarkStar={onMarkStar}
              onRewriteWithTrend={onRewriteWithTrend}
              showActions={showActions}
              showPublishedActions={showPublishedActions}
              selected={selectedIds?.has(article.id)}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(article.id) : undefined}
            />
          ))}
          </div>
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginBottom: 8 }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  fontSize: 12,
                  background: 'var(--surface)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                }}
              >
                {loadingMore ? <Spinner size={16} /> : null}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function InboxPage() {
  const router = useRouter()
  const { apis, routePrefix, mode, wordpressEnabled } = useContentWorkspace()
  const listInbox = useCallback((p: InboxListParams) => apis.inbox.list(p), [apis.inbox])
  const statsFetcher = useCallback(() => apis.inbox.stats().then(r => r.data), [apis.inbox])
  const sourcesListFn = useCallback(() => apis.sources.list().then(r => r.data?.data || r.data || []), [apis.sources])
  const [activeTab, setActiveTab] = useState<ArticleStatus | 'published'>('PENDING_REVIEW')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState(30)
  const [datePreset, setDatePreset] = useState<string>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [approveSelectedLoading, setApproveSelectedLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [sourceIdFilter, setSourceIdFilter] = useState('')
  const [isReadFilter, setIsReadFilter] = useState<boolean | undefined>(undefined)
  const [isStarredFilter, setIsStarredFilter] = useState<boolean | undefined>(undefined)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [batchStatus, setBatchStatus] = useState<{ total: number; pending: number; running: number; done: number; failed: number } | null>(null)
  const batchPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [pendingView, setPendingView] = useState<'all' | 'trending'>('all')
  useEffect(() => {
    setPendingView(readPendingViewFromStorage())
  }, [])

  const setPendingViewPersisted = (v: 'all' | 'trending') => {
    setPendingView(v)
    try {
      localStorage.setItem(`${LS_PREFIX}-inbox-pending-view`, v)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab, pendingView])

  const [activeSourcesOnly, setActiveSourcesOnly] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const v = localStorage.getItem('charcha-inbox-my-sources-only')
      return v === null ? true : v === '1'
    } catch { return true }
  })
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const setActiveSourcesOnlyPersisted = (v: boolean) => {
    setActiveSourcesOnly(v)
    try { localStorage.setItem('charcha-inbox-my-sources-only', v ? '1' : '0') } catch {}
  }

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset)
    const now = new Date()
    if (preset === 'today') {
      setFromDate(toDateTimeLocal(now))
      setToDate(toDateTimeLocal(now, true))
    } else if (preset === '7d') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      setFromDate(toDateTimeLocal(d))
      setToDate(toDateTimeLocal(now, true))
    } else if (preset === '30d') {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      setFromDate(toDateTimeLocal(d))
      setToDate(toDateTimeLocal(now, true))
    } else {
      setFromDate('')
      setToDate('')
    }
  }

  const { stats = { pending: 0, approved: 0, rejected: 0, failed: 0, published: 0 }, refresh: refreshStats } = useStats({
    swrKey: `${mode}-inbox-stats`,
    stats: statsFetcher,
  })
  const { sources } = useSources({
    swrKey: `${mode}-sources`,
    listFn: sourcesListFn,
  })
  const isPublishedTab = activeTab === 'published'
  const trendingOnlyPending =
    !isPublishedTab && activeTab === 'PENDING_REVIEW' && pendingView === 'trending'
  const { articles, total, loading, loadingMore, error, hasMore, loadMore, refresh } = useInbox(
    isPublishedTab ? 'APPROVED' : activeTab,
    debouncedSearch,
    limit,
    category,
    fromDate,
    toDate,
    isPublishedTab,
    activeSourcesOnly,
    sourceIdFilter,
    isReadFilter,
    isStarredFilter,
    trendingOnlyPending,
    { list: listInbox, keyPrefix: mode }
  )

  const handleApprove = async (id: string) => {
    try {
      await apis.inbox.approve(id)
      toast.success('Approved — choose language & start rewrite on next page')
      refresh()
      refreshStats()
      router.push(`${routePrefix.inbox}/${id}/rewrite/`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed')
    }
  }

  const handleRetryRewrite = async (id: string) => {
    router.push(`${routePrefix.inbox}/${id}/rewrite/`)
  }

  const handleUpdatePost = (id: string) => {
    router.push(`${routePrefix.inbox}/${id}/rewrite/`)
  }

  const handleUnlink = async (id: string) => {
    try {
      await apis.inbox.unlinkWpPublish(id)
      toast.success('Unlinked from WordPress')
      refresh()
      refreshStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unlink failed')
    }
  }

  const handleUnpublish = async (id: string) => {
    if (!confirm('Unpublish this post from WordPress? It will be moved to Trash on your WordPress site.')) return
    try {
      await apis.publish.unpublish(id)
      toast.success('Post unpublished from WordPress')
      refresh()
      refreshStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unpublish failed')
    }
  }

  const handleReject = async (id: string, reason?: string) => {
    try {
      await apis.inbox.reject(id, reason)
      toast.success('Article rejected')
      refresh()
      refreshStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reject failed')
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await apis.inbox.restore(id)
      toast.success('Restored to Pending')
      refresh()
      refreshStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed')
    }
  }

  const handleApproveSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.error('Select articles to approve')
      return
    }
    setApproveSelectedLoading(true)
    try {
      await Promise.all(ids.map(id => apis.inbox.approve(id)))
      toast.success(`Approved ${ids.length} article${ids.length === 1 ? '' : 's'}`)
      setSelectedIds(new Set())
      refresh()
      refreshStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setApproveSelectedLoading(false)
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (activeTab !== 'PENDING_REVIEW') return
    setSelectedIds(checked ? new Set(articles.map(a => a.id)) : new Set())
  }

  const handleMarkRead = async (id: string, read: boolean) => {
    try {
      await apis.inbox.markRead(id, read)
      refresh()
    } catch { /* ignore */ }
  }
  const handleMarkStar = async (id: string, starred: boolean) => {
    try {
      await apis.inbox.markStar(id, starred)
      refresh()
    } catch { /* ignore */ }
  }

  const handleRewriteWithTrend = async (id: string, trendKeyword: string, trendTraffic: string) => {
    if (activeTab === 'PENDING_REVIEW') {
      try {
        await apis.inbox.approve(id)
        toast.success('Approved — optimizing for trend keyword')
        refresh()
        refreshStats()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Approve failed')
        return
      }
    }
    const params = new URLSearchParams({ trendKeyword, trendTraffic })
    router.push(`${routePrefix.inbox}/${id}/rewrite/?${params.toString()}`)
  }

  const handleBulk = async (action: 'delete' | 'rewrite' | 'markRead' | 'markUnread' | 'star' | 'unstar') => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (action === 'rewrite') {
      try {
        await apis.rewrite.batch.queue(ids)
        setSelectedIds(new Set())
        setBatchStatus({ total: ids.length, pending: ids.length, running: 0, done: 0, failed: 0 })
        toast.success(`Queued ${ids.length} article(s) for rewrite`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to queue batch')
      }
      return
    }
    setBulkLoading(true)
    try {
      const res = await apis.inbox.bulk(action, ids)
      const d = res.data?.data
      const processed = (d as { processed?: number })?.processed ?? 0
      const errors = (d as { errors?: { id: string; error: string }[] })?.errors ?? []
      if (errors.length > 0) toast.error(`${processed} done, ${errors.length} failed`)
      else toast.success(processed > 0 ? `${action} applied to ${processed} article(s)` : 'Done')
      setSelectedIds(new Set())
      refresh()
      refreshStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk action failed')
    } finally {
      setBulkLoading(false)
    }
  }

  useEffect(() => {
    if (!batchStatus || (batchStatus.pending === 0 && batchStatus.running === 0)) return
    const poll = () => {
      apis.rewrite.batch.status().then((d) => {
        setBatchStatus({ total: d.total, pending: d.pending, running: d.running, done: d.done, failed: d.failed })
        if (d.running === 0 && d.pending === 0) {
          if (batchPollRef.current) clearInterval(batchPollRef.current)
          batchPollRef.current = null
          setBatchStatus(null)
          refresh()
          refreshStats()
          toast.success(`Batch complete: ${d.done} done${d.failed > 0 ? `, ${d.failed} failed` : ''}`)
        }
      }).catch(() => {})
    }
    batchPollRef.current = setInterval(poll, 2000)
    poll()
    return () => { if (batchPollRef.current) clearInterval(batchPollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit full batchStatus to avoid resetting interval every poll tick; pending/running + APIs suffice
  }, [batchStatus?.pending, batchStatus?.running, apis.rewrite.batch, refresh, refreshStats])

  const handleSearch = (v: string) => {
    setSearch(v)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(v), 350)
  }

  const countColors: Record<string, string> = {
    PENDING_REVIEW: 'var(--amber)',
    APPROVED: 'var(--green)',
    published: 'var(--cyan)',
    REJECTED: 'var(--red)',
    FETCH_FAILED: 'var(--text-dim)',
  }
  const countBgs: Record<string, string> = {
    PENDING_REVIEW: 'var(--amber-bg)',
    APPROVED: 'var(--green-bg)',
    published: 'rgba(34,211,238,0.15)',
    REJECTED: 'var(--red-bg)',
    FETCH_FAILED: 'rgba(255,255,255,0.04)',
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg)' }}>
      <InboxStats stats={stats} publishedSub={wordpressEnabled ? 'On WordPress' : 'On news site'} />

      {/* Tabs bar - overflow-x scroll, no wrap */}
      <div className="flex shrink-0 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="inbox-tabs-scroll flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
          {TAB_STATUSES.map(status => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className="flex min-w-fit shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-3"
              style={{
                minHeight: 44,
                fontSize: 12,
                fontWeight: 500,
                color: activeTab === status ? 'var(--text)' : 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: '2px solid',
                borderBottomColor: activeTab === status ? 'var(--accent-light)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {TAB_LABELS[status]}
              {(status === 'PENDING_REVIEW' ? stats.pending : status === 'APPROVED' ? stats.approved : status === 'published' ? (stats.published ?? 0) : status === 'REJECTED' ? stats.rejected : stats.failed) > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontFamily: 'Geist Mono, monospace',
                    background: countBgs[status],
                    color: countColors[status],
                    border: `1px solid ${countColors[status]}22`,
                  }}
                >
                  {status === 'PENDING_REVIEW' ? stats.pending : status === 'APPROVED' ? stats.approved : status === 'published' ? (stats.published ?? 0) : status === 'REJECTED' ? stats.rejected : stats.failed}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l p-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => { refresh(); refreshStats(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              minHeight: 44,
              background: 'transparent',
              color: 'var(--text-muted)',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          {activeTab === 'PENDING_REVIEW' && articles.length > 0 && (
            <button
              onClick={handleApproveSelected}
              disabled={approveSelectedLoading || selectedIds.size === 0}
              className="hidden md:flex"
              style={{
                alignItems: 'center',
                gap: 6,
                padding: '8px 10px',
                minHeight: 44,
                background: 'var(--green-bg)',
                color: 'var(--green)',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: approveSelectedLoading || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                opacity: approveSelectedLoading || selectedIds.size === 0 ? 0.6 : 1,
              }}
            >
              <CheckCheck size={13} />
              Approve Selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {activeTab === 'PENDING_REVIEW' && (
        <div
          className="flex shrink-0 items-center gap-2 border-b px-3 py-2 md:px-4"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pending
          </span>
          <div
            className="inline-flex overflow-hidden rounded-lg"
            style={{ border: '1px solid var(--border)' }}
          >
            <button
              type="button"
              onClick={() => setPendingViewPersisted('all')}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: pendingView === 'all' ? 'var(--accent-glow)' : 'transparent',
                color: pendingView === 'all' ? 'var(--accent-light)' : 'var(--text-muted)',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setPendingViewPersisted('trending')}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                borderLeft: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: pendingView === 'trending' ? 'rgba(249,115,22,0.12)' : 'transparent',
                color: pendingView === 'trending' ? '#f97316' : 'var(--text-muted)',
              }}
            >
              <Flame size={14} />
              Trending now
            </button>
          </div>
        </div>
      )}

      {/* Toolbar — mobile: search row + Approve All row; desktop: single row */}
      <div
        className="flex shrink-0 flex-col gap-2 border-b p-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:p-4"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {/* Row 1: Search full-width + Filter (mobile) */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:order-2 md:flex-1">
          <div className="relative min-w-0 flex-1" style={{ maxWidth: 340 }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full rounded-lg border py-1.5 pl-8 pr-2.5 text-xs md:py-2"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen(o => !o)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:hidden"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <Filter size={14} />
          </button>
        </div>
        {/* Approve Selected bar — mobile only, Pending tab */}
        {activeTab === 'PENDING_REVIEW' && articles.length > 0 && (
          <div
            className="flex w-full items-center justify-end md:hidden"
            style={{ background: 'var(--accent-subtle)', padding: '8px 12px', borderRadius: 8 }}
          >
            <button
              onClick={handleApproveSelected}
              disabled={approveSelectedLoading || selectedIds.size === 0}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: 'var(--green-bg)',
                color: 'var(--green)',
                border: '1px solid rgba(34,197,94,0.2)',
                opacity: approveSelectedLoading || selectedIds.size === 0 ? 0.6 : 1,
              }}
            >
              <CheckCheck size={13} />
              Approve Selected ({selectedIds.size})
            </button>
          </div>
        )}
        {/* Filters — collapsible on mobile */}
        <div className={`flex flex-wrap items-center gap-2 ${filterOpen ? 'flex' : 'hidden'} md:flex`}>
        <div className="flex items-center gap-1.5">
          <Calendar size={12} style={{ color: 'var(--text-dim)' }} />
          <select
            value={datePreset}
            onChange={e => applyDatePreset(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: 11,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              minWidth: 100,
            }}
          >
            {DATE_PRESETS.map(p => (
              <option key={p.id || 'all'} value={p.id}>{p.label}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setDatePreset(''); }}
            style={{
              padding: '6px 8px',
              fontSize: 11,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              maxWidth: 165,
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>–</span>
          <input
            type="datetime-local"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setDatePreset(''); }}
            style={{
              padding: '6px 8px',
              fontSize: 11,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              maxWidth: 165,
            }}
          />
        </div>
        <label
          className="flex items-center gap-2 cursor-pointer"
          style={{ fontSize: 11, color: 'var(--text-muted)' }}
          title="Show only articles from sources you have enabled (identity-based inbox)"
        >
          <input
            type="checkbox"
            checked={activeSourcesOnly}
            onChange={e => setActiveSourcesOnlyPersisted(e.target.checked)}
          />
          My sources only
        </label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{
            padding: '6px 10px',
            fontSize: 11,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
            minWidth: 120,
          }}
        >
          <option value="">All categories</option>
          {ARTICLE_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={sourceIdFilter}
          onChange={e => setSourceIdFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            fontSize: 11,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
            minWidth: 120,
          }}
        >
          <option value="">All sources</option>
          {sources.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={isReadFilter === undefined ? '' : isReadFilter ? 'read' : 'unread'}
          onChange={e => { const v = e.target.value; setIsReadFilter(v === '' ? undefined : v === 'read'); }}
          style={{ padding: '6px 10px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', minWidth: 90 }}
        >
          <option value="">All read</option>
          <option value="read">Read</option>
          <option value="unread">Unread</option>
        </select>
        <select
          value={isStarredFilter === undefined ? '' : isStarredFilter ? 'starred' : 'no'}
          onChange={e => { const v = e.target.value; setIsStarredFilter(v === '' ? undefined : v === 'starred'); }}
          style={{ padding: '6px 10px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', minWidth: 90 }}
        >
          <option value="">All starred</option>
          <option value="starred">Starred</option>
          <option value="no">Not starred</option>
        </select>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Show</span>
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
            }}
          >
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Geist Mono, monospace' }}>
            {total > 0 ? `${articles.length} of ${total}` : `${articles.length} articles`}
          </span>
        </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 px-3 py-2 md:px-4"
          style={{ background: 'var(--accent-subtle)', borderBottom: '1px solid var(--border)' }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 8 }}>{selectedIds.size} selected</span>
          <button type="button" onClick={() => handleBulk('markRead')} disabled={bulkLoading} style={{ padding: '4px 10px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: bulkLoading ? 'not-allowed' : 'pointer' }}>Mark read</button>
          <button type="button" onClick={() => handleBulk('markUnread')} disabled={bulkLoading} style={{ padding: '4px 10px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: bulkLoading ? 'not-allowed' : 'pointer' }}>Mark unread</button>
          <button type="button" onClick={() => handleBulk('star')} disabled={bulkLoading} style={{ padding: '4px 10px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: bulkLoading ? 'not-allowed' : 'pointer' }}>Star</button>
          <button type="button" onClick={() => handleBulk('unstar')} disabled={bulkLoading} style={{ padding: '4px 10px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: bulkLoading ? 'not-allowed' : 'pointer' }}>Unstar</button>
          <button type="button" onClick={() => handleBulk('rewrite')} disabled={bulkLoading} style={{ padding: '4px 10px', fontSize: 11, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, cursor: bulkLoading ? 'not-allowed' : 'pointer' }}>Rewrite all</button>
          <button type="button" onClick={() => handleBulk('delete')} disabled={bulkLoading} style={{ padding: '4px 10px', fontSize: 11, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: bulkLoading ? 'not-allowed' : 'pointer' }}>Delete</button>
        </div>
      )}

      {batchStatus != null && batchStatus.total > 0 && (
        <div style={{ padding: '8px 12px', background: 'var(--accent-subtle)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Batch rewrite: {batchStatus.done + batchStatus.failed}/{batchStatus.total} ({batchStatus.running ? '1 running…' : 'queued'})</span>
          <div style={{ flex: 1, minWidth: 120, height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${batchStatus.total ? ((batchStatus.done + batchStatus.failed) / batchStatus.total) * 100 : 0}%`, height: '100%', background: 'var(--green)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {/* List - render based on active tab */}
      {TAB_STATUSES.map(tab => (
        activeTab === tab && (
          <InboxTabContent
            key={tab}
            status={tab}
            search={debouncedSearch}
            limit={limit}
            articles={articles}
            total={total}
            loading={loading}
            loadingMore={loadingMore}
            error={error}
            hasMore={hasMore}
            loadMore={loadMore}
            onRefresh={refresh}
            onApprove={handleApprove}
            onReject={handleReject}
            onRestore={tab === 'REJECTED' ? handleRestore : undefined}
            refreshStats={refreshStats}
            onRetryRewrite={handleRetryRewrite}
            onUpdatePost={wordpressEnabled ? handleUpdatePost : undefined}
            onUnlink={wordpressEnabled ? handleUnlink : undefined}
            onUnpublish={wordpressEnabled ? handleUnpublish : undefined}
            showPublishedActions={tab === 'published' && wordpressEnabled}
            selectedIds={activeTab === 'PENDING_REVIEW' ? selectedIds : undefined}
            onToggleSelect={activeTab === 'PENDING_REVIEW' ? handleToggleSelect : undefined}
            onSelectAll={activeTab === 'PENDING_REVIEW' ? handleSelectAll : undefined}
            onMarkRead={handleMarkRead}
            onMarkStar={handleMarkStar}
            onRewriteWithTrend={handleRewriteWithTrend}
            wordpressEnabled={wordpressEnabled}
            pendingTrendingOnly={tab === 'PENDING_REVIEW' && pendingView === 'trending'}
          />
        )
      ))}
    </div>
  )
}
