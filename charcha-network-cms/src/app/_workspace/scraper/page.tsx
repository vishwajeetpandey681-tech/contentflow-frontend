'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Play, Search, Rss, Sparkles, ChevronDown, ChevronUp, FileText, ChevronRight } from 'lucide-react'
import { useSources } from '@/hooks/useSources'
import { useLogs } from '@/hooks/useLogs'
import { sourcesApi, logsApi } from '@/lib/api'
import { SourceCard } from '@/components/scraper/SourceCard'
import { AddSourceForm } from '@/components/scraper/AddSourceForm'
import { EditSourceForm } from '@/components/scraper/EditSourceForm'
import { SourceLibraryGrid } from '@/components/scraper/SourceLibraryGrid'
import { Spinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import { useUIStore } from '@/lib/ui-store'
import type { ScraperSource } from '@/types/source'

function formatLogTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString()
}

export default function ScraperPage() {
  const { sources, loading, error, refresh } = useSources()
  const [logsFromDate, setLogsFromDate] = useState('')
  const [logsToDate, setLogsToDate] = useState('')
  const { logs, refresh: refreshLogs } = useLogs(logsFromDate || undefined, logsToDate || undefined)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [logsExpanded, setLogsExpanded] = useState(true)
  const [scrapingId, setScrapingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const sourcesSubTab = useUIStore(s => s.sourcesTab)
  const setSourcesSubTab = useUIStore(s => s.setSourcesTab)
  const setSourcesActiveCount = useUIStore(s => s.setSourcesActiveCount)
  const [loadingHint, setLoadingHint] = useState(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [cleaningLogs, setCleaningLogs] = useState(false)

  useEffect(() => {
    if (!loading) {
      setLoadingHint(false)
      clearTimeout(hintTimerRef.current)
      return
    }
    hintTimerRef.current = setTimeout(() => setLoadingHint(true), 5000)
    return () => clearTimeout(hintTimerRef.current)
  }, [loading])

  const selected = selectedId ? sources.find(s => s.id === selectedId) : null
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSources = useMemo(() => {
    return sources.filter(s => {
      if (channelFilter && (s.channel || '') !== channelFilter) return false
      if (categoryFilter && (s.category || '') !== categoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const match = (v: string | null | undefined) => v && String(v).toLowerCase().includes(q)
        if (!match(s.name) && !match(s.url) && !match(s.channel) && !match(s.category)) return false
      }
      return true
    })
  }, [sources, channelFilter, categoryFilter, searchQuery])
  const existingUrls = new Set(sources.map(s => s.url))

  useEffect(() => {
    setSourcesActiveCount(filteredSources.length)
  }, [filteredSources.length, setSourcesActiveCount])

  const handleTrigger = async (id: string) => {
    setScrapingId(id)
    try {
      const res = await sourcesApi.trigger(id)
      const d = res.data?.data
      const msg = d?.message || `Pulled ${d?.scraped ?? 0} items`
      toast.success(msg)
      refresh()
      refreshLogs?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scrape failed')
      refreshLogs?.()
    } finally {
      setScrapingId(null)
    }
  }

  const handleToggleActive = async (source: ScraperSource) => {
    try {
      await sourcesApi.updatePrefs(source.id, { isActive: !source.isActive })
      toast.success(source.isActive ? 'Source paused for you' : 'Source enabled for you')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this source? This cannot be undone.')) return
    try {
      await sourcesApi.delete(id)
      toast.success('Source deleted')
      if (selectedId === id) setSelectedId(null)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const inputBase = {
    padding: '8px 12px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: 12,
  } as const

  return (
    <div className="scraper-page flex flex-1 flex-col overflow-hidden lg:flex-row" data-sources-tab={sourcesSubTab} style={{ background: 'var(--bg)' }}>
      {/* Library tab — full-width grid layout */}
      {sourcesSubTab === 'library' && (
        <div className="scraper-library-grid flex flex-1 min-w-0 overflow-hidden">
          <SourceLibraryGrid existingUrls={existingUrls} onAdded={refresh} />
        </div>
      )}

      {/* Middle — Active sources sidebar (only when Active tab) */}
      {sourcesSubTab === 'active' && (
      <div
        className={`scraper-sources-panel ${sourcesOpen ? '' : 'collapsed'}`}
        style={{
          width: 320,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            fontSize: 10,
            color: 'var(--text-dim)',
            background: 'rgba(124,58,237,0.05)',
            borderBottom: '1px solid var(--border)',
            lineHeight: 1.4,
          }}
        >
          Your custom prompts and active toggles are saved per user — other team members have their own.
        </div>
        <button
          type="button"
          onClick={() => setSourcesOpen(v => !v)}
          className="scraper-sources-toggle"
          style={{
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '12px 16px',
            background: 'var(--surface)',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Rss size={18} style={{ color: 'var(--accent-light)' }} />
          Active sources
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>
            ({filteredSources.length}{channelFilter || categoryFilter || searchQuery ? ` / ${sources.length}` : ''} feeds)
          </span>
          <ChevronRight size={16} style={{ marginLeft: 'auto', transform: sourcesOpen ? 'rotate(90deg)' : 'none' }} />
        </button>
        <div className="scraper-sources-inner" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="scraper-sources-header" style={{ padding: 20, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                }}
              >
                <Rss size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {filteredSources.length}{channelFilter || categoryFilter || searchQuery ? ` / ${sources.length}` : ''} feeds
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAdd(s => !s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
              }}
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {sources.length >= 5 && (
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search sources..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  ...inputBase,
                  width: '100%',
                  paddingLeft: 36,
                }}
              />
            </div>
          )}
        </div>

        {showAdd && (
          <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <AddSourceForm
              onSuccess={() => {
                refresh()
                setShowAdd(false)
              }}
              onClose={() => setShowAdd(false)}
              inline
            />
          </div>
        )}

        <div className="scraper-sources-filters" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            style={{ ...inputBase, flex: 1, minWidth: 0 }}
          >
            <option value="">All channels</option>
            {Array.from(new Set(sources.map(s => s.channel).filter(Boolean))).sort().map(c => (
              <option key={c} value={c!}>{c}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ ...inputBase, flex: 1, minWidth: 0 }}
          >
            <option value="">All categories</option>
            {Array.from(new Set(sources.map(s => s.category).filter(Boolean))).sort().map(c => (
              <option key={c} value={c!}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 12 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--text-muted)', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Spinner size={18} />
                <span>Loading sources...</span>
              </div>
              {loadingHint && (
                <div style={{ marginTop: 16, padding: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', maxWidth: 260 }}>
                  Taking longer than usual? Ensure contentflow-backend is running (port 4500) and NEXT_PUBLIC_CHARCHA_API_URL in .env.local matches.
                  <button
                    onClick={() => refresh()}
                    style={{
                      marginTop: 12,
                      padding: '8px 14px',
                      fontSize: 11,
                      background: 'var(--accent-glow)',
                      color: 'var(--accent-light)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24, color: 'var(--red)', fontSize: 12 }}>
              <span>Failed to load sources</span>
              <span style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{error}</span>
              <button
                onClick={() => refresh()}
                style={{
                  padding: '10px 18px',
                  fontSize: 12,
                  background: 'var(--accent-glow)',
                  color: 'var(--accent-light)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : sources.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Rss size={28} style={{ color: 'var(--accent-light)' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>No sources yet</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
                Add from the Library or use Add to create a custom source
              </div>
            </div>
          ) : filteredSources.length === 0 && sources.length > 0 ? (
            <div style={{ padding: 24, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              No sources match the selected filters
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredSources.map(s => (
                <SourceCard
                  key={s.id}
                  source={s}
                  selected={selectedId === s.id}
                  onSelect={() => setSelectedId(s.id)}
                  onTrigger={e => {
                    e?.stopPropagation?.()
                    handleTrigger(s.id)
                  }}
                  onToggleActive={e => {
                    e?.stopPropagation?.()
                    handleToggleActive(s)
                  }}
                  onDelete={e => {
                    e?.stopPropagation?.()
                    handleDelete(s.id)
                  }}
                  isScraping={scrapingId === s.id}
                />
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
      )}

      {/* Right — Detail panel + Logs (hidden when Library tab; on mobile also hidden when Active tab + no selection) */}
      {sourcesSubTab !== 'library' && (
      <div
        className={`scraper-detail-panel ${sourcesSubTab === 'active' && !selected ? 'max-lg:hidden' : ''}`}
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
        }}
      >
        <div className="flex flex-1 overflow-auto">
        {sourcesSubTab === 'logs' ? (
          <div className="flex flex-1 flex-col p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold">Recent logs</h3>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-auto">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No scrape logs yet</div>
              ) : (
                logs.slice(0, 50).map(log => {
                  const is403 = log.error?.includes('403')
                  return (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                      style={{
                        borderColor: is403 ? 'rgba(239,68,68,0.5)' : 'var(--border)',
                        background: is403 ? 'rgba(239,68,68,0.06)' : undefined,
                      }}
                    >
                      <span className="font-mono text-[10px]" style={{ color: 'var(--text-dim)', minWidth: 52 }}>{formatLogTime(log.at)}</span>
                      <span className="font-medium">{log.sourceName}</span>
                      {log.success ? (
                        <>
                          <span style={{ color: 'var(--green)' }}>+{log.scraped}</span>
                          {log.duplicatesSkipped > 0 && <span style={{ color: 'var(--amber)' }}>({log.duplicatesSkipped} dupes skipped)</span>}
                        </>
                      ) : (
                        <>
                          <span style={{ color: 'var(--red)' }}>Failed: {log.error || 'Unknown'}</span>
                          {is403 && (
                            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                              → Try adding the <strong>HTML</strong> version from Source Library
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : selected ? (
          <div className="scraper-detail-content" style={{ padding: 32, maxWidth: 600, margin: '0 auto', width: '100%' }}>
            <div
              className="scraper-detail-header"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 24,
                marginBottom: 28,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.02em' }}>
                  {selected.name}
                </h2>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'Geist Mono, monospace', wordBreak: 'break-all' }}>
                  {selected.url}
                </div>
              </div>
              <button
                onClick={() => handleTrigger(selected.id)}
                disabled={scrapingId === selected.id || selected.isBlocked}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 20px',
                  background: selected.isBlocked ? 'var(--card)' : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)',
                  color: selected.isBlocked ? 'var(--text-dim)' : '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: scrapingId === selected.id || selected.isBlocked ? 'not-allowed' : 'pointer',
                  opacity: scrapingId === selected.id ? 0.6 : 1,
                  boxShadow: selected.isBlocked ? 'none' : '0 4px 12px rgba(124,58,237,0.3)',
                }}
              >
                {scrapingId === selected.id ? (
                  <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <Play size={16} />
                )}
                {scrapingId === selected.id ? 'Pulling…' : 'Pull Now'}
              </button>
            </div>

            <div
              className="scraper-detail-stats"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
                marginBottom: 28,
              }}
            >
              {[
                { label: 'Pending', value: selected.counts?.pending ?? 0, color: 'var(--amber)' },
                { label: 'Approved', value: selected.counts?.approved ?? 0, color: 'var(--green)' },
                { label: 'Rejected', value: selected.counts?.rejected ?? 0, color: 'var(--text-dim)' },
                { label: 'Failed', value: selected.counts?.failed ?? 0, color: 'var(--red)' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    padding: 16,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>

            {selected.isBlocked && (
              <div
                style={{
                  padding: 16,
                  background: 'var(--red-bg)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--red)',
                  fontSize: 13,
                  marginBottom: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span>⛔ {selected.blockedReason || 'Source is blocked'}</span>
                <button
                  type="button"
                  onClick={async e => {
                    e.stopPropagation()
                    try {
                      await sourcesApi.update(selected.id, { isBlocked: false, blockedReason: null })
                      toast.success('Source unblocked')
                      refresh()
                      handleTrigger(selected.id)
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to retry')
                    }
                  }}
                  disabled={scrapingId === selected.id}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: scrapingId === selected.id ? 'not-allowed' : 'pointer',
                    opacity: scrapingId === selected.id ? 0.6 : 1,
                  }}
                >
                  {scrapingId === selected.id ? 'Pulling…' : 'Retry'}
                </button>
              </div>
            )}

            <div
              style={{
                padding: 24,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Sparkles size={16} style={{ color: 'var(--accent-light)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Schedule & settings
                </span>
              </div>
              <EditSourceForm key={selected.id} source={selected} onSuccess={refresh} />
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 48,
              gap: 24,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--accent-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Rss size={36} style={{ color: 'var(--accent-light)' }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Select a source
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
              Choose a source from the list to view stats, pull articles, and edit settings.
            </div>
          </div>
        )}
        </div>

        {/* Recent logs (hidden when Logs tab selected on mobile) */}
        {sourcesSubTab !== 'logs' && (
        <div
          className="scraper-logs"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
            maxHeight: logsExpanded ? 240 : 44,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <button
            onClick={() => setLogsExpanded(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={14} />
              Recent logs
              {logs.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                  ({logs.length})
                </span>
              )}
            </span>
            {logsExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          {logsExpanded && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px', fontSize: 11 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                  type="datetime-local"
                  value={logsFromDate}
                  onChange={e => setLogsFromDate(e.target.value)}
                  placeholder="From"
                  style={{
                    padding: '4px 8px',
                    fontSize: 10,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text)',
                    maxWidth: 165,
                  }}
                />
                <input
                  type="datetime-local"
                  value={logsToDate}
                  onChange={e => setLogsToDate(e.target.value)}
                  placeholder="To"
                  style={{
                    padding: '4px 8px',
                    fontSize: 10,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text)',
                    maxWidth: 165,
                  }}
                />
                {(logsFromDate || logsToDate) && (
                  <button
                    onClick={() => { setLogsFromDate(''); setLogsToDate(''); }}
                    style={{
                      padding: '4px 8px',
                      fontSize: 10,
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (cleaningLogs) return
                    setCleaningLogs(true)
                    try {
                      const result = await logsApi.cleanup(72)
                      toast.success(`Cleaned ${result?.deleted ?? 0} log entries older than 72 h`)
                      refreshLogs?.()
                    } catch {
                      toast.error('Log cleanup failed — backend may not support this endpoint yet')
                    } finally {
                      setCleaningLogs(false)
                    }
                  }}
                  disabled={cleaningLogs}
                  title="Delete scrape logs older than 72 hours to free server storage"
                  style={{
                    padding: '4px 8px',
                    fontSize: 10,
                    background: 'transparent',
                    color: cleaningLogs ? 'var(--text-dim)' : 'var(--red)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    cursor: cleaningLogs ? 'not-allowed' : 'pointer',
                    marginLeft: 'auto',
                    whiteSpace: 'nowrap',
                    opacity: cleaningLogs ? 0.6 : 1,
                  }}
                >
                  {cleaningLogs ? '…cleaning' : '🗑 Clean 72h+ logs'}
                </button>
              </div>
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: 16 }}>No scrape logs yet</div>
              ) : (
                logs.slice(0, 50).map(log => {
                  const is403 = log.error?.includes('403')
                  return (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border-light)',
                        flexWrap: 'wrap',
                        background: is403 ? 'rgba(239,68,68,0.04)' : undefined,
                        margin: is403 ? '0 -8px' : undefined,
                        paddingLeft: is403 ? 12 : undefined,
                        paddingRight: is403 ? 12 : undefined,
                        borderRadius: is403 ? 6 : undefined,
                      }}
                    >
                      <span style={{ color: 'var(--text-dim)', minWidth: 52 }}>{formatLogTime(log.at)}</span>
                      <span style={{ fontWeight: 500, color: 'var(--text)' }}>{log.sourceName}</span>
                      {log.success ? (
                        <>
                          <span style={{ color: 'var(--green)' }}>+{log.scraped}</span>
                          {log.duplicatesSkipped > 0 && (
                            <span style={{ color: 'var(--amber)' }}>({log.duplicatesSkipped} dupes skipped)</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span style={{ color: 'var(--red)' }}>Failed: {log.error || 'Unknown'}</span>
                          {is403 && (
                            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                              → Try <strong>HTML</strong> version from Library
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
        )}
      </div>
      )}
    </div>
  )
}
