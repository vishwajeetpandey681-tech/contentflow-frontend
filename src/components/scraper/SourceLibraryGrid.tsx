'use client'

import { useState, useMemo } from 'react'
import { sourcesApi } from '@/lib/api'
import { SOURCE_LIBRARY, CHANNELS, LIBRARY_CATEGORIES } from '@/lib/source-library'
import toast from 'react-hot-toast'
import type { LibrarySource } from '@/lib/source-library'

interface SourceLibraryGridProps {
  existingUrls: Set<string>
  onAdded: () => void
}

function groupByChannel(sources: LibrarySource[]): Map<string, LibrarySource[]> {
  const map = new Map<string, LibrarySource[]>()
  for (const s of sources) {
    const list = map.get(s.channel) ?? []
    list.push(s)
    map.set(s.channel, list)
  }
  return map
}

export function SourceLibraryGrid({ existingUrls, onAdded }: SourceLibraryGridProps) {
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [adding, setAdding] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return SOURCE_LIBRARY.filter(s => {
      if (channelFilter && s.channel !== channelFilter) return false
      if (categoryFilter && s.category !== categoryFilter) return false
      return true
    })
  }, [channelFilter, categoryFilter])

  const grouped = useMemo(() => groupByChannel(filtered), [filtered])

  const handleAdd = async (lib: LibrarySource) => {
    if (existingUrls.has(lib.url)) {
      toast.error(`"${lib.name}" is already added`)
      return
    }
    setAdding(lib.url)
    try {
      await sourcesApi.create({
        name: lib.name,
        url: lib.url,
        type: lib.type,
        maxPerRun: 20,
        cronSchedule: '0 */6 * * *',
        channel: lib.channel,
        category: lib.category,
        htmlListingConfig: lib.htmlListingConfig,
        fallbackUrl: lib.fallbackUrl ?? null,
        fallbackHtmlListingConfig: lib.fallbackHtmlListingConfig ?? null,
      })
      toast.success(`"${lib.name}" added`)
      onAdded()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setAdding(null)
    }
  }

  const inputStyle = {
    padding: '8px 12px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: 12,
  } as const

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          style={{ ...inputStyle, minWidth: 140 }}
        >
          <option value="">All channels</option>
          {CHANNELS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ ...inputStyle, minWidth: 140 }}
        >
          <option value="">All categories</option>
          {LIBRARY_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Content - grouped by channel */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 24,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--text-dim)', padding: 48, textAlign: 'center' }}>
            No sources match the selected filters
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {Array.from(grouped.entries()).map(([channel, sources]) => (
              <section key={channel}>
                <h2
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--text-dim)',
                    marginBottom: 16,
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--border-subtle)',
                    fontFamily: 'Geist Mono, monospace',
                  }}
                >
                  —— {channel} ——
                </h2>
                <div className="library-source-grid">
                  {sources.map(lib => {
                    const exists = existingUrls.has(lib.url)
                    return (
                      <div
                        key={lib.url}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          padding: 14,
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                        className="card-hover-effect"
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text)',
                            lineHeight: 1.3,
                            minHeight: 0,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {lib.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
                          <span
                            style={{
                              fontSize: 10,
                              padding: '4px 8px',
                              background: 'var(--surface)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-muted)',
                              fontWeight: 500,
                              flexShrink: 0,
                            }}
                          >
                            {lib.type}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdd(lib)}
                            disabled={exists || adding === lib.url}
                            style={{
                              padding: '6px 12px',
                              fontSize: 11,
                              fontWeight: 600,
                              background: exists ? 'var(--surface)' : 'var(--accent)',
                              color: exists ? 'var(--text-dim)' : '#fff',
                              border: exists ? '1px solid var(--border)' : 'none',
                              borderRadius: 'var(--radius-sm)',
                              cursor: exists || adding === lib.url ? 'not-allowed' : 'pointer',
                              flexShrink: 0,
                              opacity: exists ? 0.8 : 1,
                            }}
                          >
                            {adding === lib.url ? '...' : exists ? 'Added' : 'Add'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
