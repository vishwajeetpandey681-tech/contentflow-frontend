'use client'

import { useState, useMemo } from 'react'
import { Plus, Check, Loader2 } from 'lucide-react'
import { sourcesApi } from '@/lib/api'
import {
  SOURCE_LIBRARY, ENGLISH_CHANNELS, HINDI_CHANNELS,
  ENGLISH_CATEGORIES, HINDI_CATEGORIES,
} from '@/lib/source-library'
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

// Category badge colors
const CAT_COLOR: Record<string, { bg: string; color: string }> = {
  General:     { bg: 'rgba(124,58,237,0.1)',  color: '#a78bfa' },
  Politics:    { bg: 'rgba(239,68,68,0.1)',   color: '#f87171' },
  Business:    { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa' },
  Sports:      { bg: 'rgba(16,185,129,0.1)',  color: '#34d399' },
  Newspaper:   { bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24' },
  Digital:     { bg: 'rgba(236,72,153,0.1)',  color: '#f472b6' },
  World:       { bg: 'rgba(6,182,212,0.1)',   color: '#22d3ee' },
  Technology:  { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8' },
  Entertainment: { bg: 'rgba(251,113,133,0.1)', color: '#fb7185' },
  Government:  { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
}
function getCatStyle(cat: string) {
  return CAT_COLOR[cat] ?? { bg: 'var(--surface)', color: 'var(--text-dim)' }
}

export function SourceLibraryGrid({ existingUrls, onAdded }: SourceLibraryGridProps) {
  const [lang, setLang] = useState<'english' | 'hindi'>('english')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [adding, setAdding] = useState<string | null>(null)
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set())

  const langSources = useMemo(() => SOURCE_LIBRARY.filter(s => s.language === lang), [lang])
  const categories = lang === 'hindi' ? HINDI_CATEGORIES : ENGLISH_CATEGORIES
  const channels = lang === 'hindi' ? HINDI_CHANNELS : ENGLISH_CHANNELS

  const filtered = useMemo(() => {
    return langSources.filter(s => {
      if (channelFilter && s.channel !== channelFilter) return false
      if (categoryFilter && s.category !== categoryFilter) return false
      return true
    })
  }, [langSources, channelFilter, categoryFilter])

  const grouped = useMemo(() => groupByChannel(filtered), [filtered])

  const handleAdd = async (lib: LibrarySource) => {
    if (existingUrls.has(lib.url) || addedUrls.has(lib.url)) {
      toast(`"${lib.name}" is already added`, { icon: '✓' })
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
      setAddedUrls(prev => { const n = new Set(prev); n.add(lib.url); return n })
      toast.success(`"${lib.name}" added`)
      onAdded()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setAdding(null)
    }
  }

  const handleAddAll = async (sources: LibrarySource[]) => {
    const toAdd = sources.filter(s => !existingUrls.has(s.url) && !addedUrls.has(s.url))
    if (toAdd.length === 0) { toast('All sources in this channel are already added', { icon: '✓' }); return }
    for (const lib of toAdd) await handleAdd(lib)
  }

  const handleLangChange = (newLang: 'english' | 'hindi') => {
    setLang(newLang)
    setCategoryFilter('')
    setChannelFilter('')
  }

  const chipBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-glow)' : 'transparent',
    color: active ? 'var(--accent-light)' : 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
    minHeight: 36,
  })

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Language toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4 }}>Language</span>
        <button onClick={() => handleLangChange('english')} style={chipBtn(lang === 'english')}>
          🇬🇧 EN
        </button>
        <button onClick={() => handleLangChange('hindi')} style={chipBtn(lang === 'hindi')}>
          🇮🇳 HI
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>
          {filtered.length} source{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Category filter chips */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        overflowX: 'auto',
        flexShrink: 0,
        WebkitOverflowScrolling: 'touch' as any,
      }}>
        <button onClick={() => setCategoryFilter('')} style={chipBtn(categoryFilter === '')}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)} style={chipBtn(categoryFilter === cat)}>
            {cat}
          </button>
        ))}
      </div>

      {/* Channel filter (compact select) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          style={{
            padding: '7px 10px', fontSize: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', minWidth: 160,
          }}
        >
          <option value="">All channels ▾</option>
          {channels.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(channelFilter || categoryFilter) && (
          <button
            onClick={() => { setChannelFilter(''); setCategoryFilter('') }}
            style={{ fontSize: 11, color: 'var(--accent-light)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content - grouped by channel */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 20px 40px', WebkitOverflowScrolling: 'touch' as any }}>
        {filtered.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--text-dim)', padding: 48, textAlign: 'center' }}>
            No sources match the selected filters
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {Array.from(grouped.entries()).map(([channel, sources]) => {
              const allAdded = sources.every(s => existingUrls.has(s.url) || addedUrls.has(s.url))
              return (
                <section key={channel}>
                  {/* Channel header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <h2 style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: 'var(--text-dim)',
                      fontFamily: 'Geist Mono, monospace', margin: 0,
                    }}>
                      {channel}
                    </h2>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                    <button
                      onClick={() => handleAddAll(sources)}
                      disabled={allAdded}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '4px 10px',
                        background: allAdded ? 'transparent' : 'var(--accent-glow)',
                        color: allAdded ? 'var(--text-dim)' : 'var(--accent-light)',
                        border: `1px solid ${allAdded ? 'var(--border)' : 'rgba(124,58,237,0.3)'}`,
                        borderRadius: 6, cursor: allAdded ? 'default' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {allAdded ? '✓ All added' : '+ Add all'}
                    </button>
                  </div>

                  {/* Source cards 2-col grid */}
                  <div className="library-source-grid">
                    {sources.map(lib => {
                      const exists = existingUrls.has(lib.url) || addedUrls.has(lib.url)
                      const isAdding = adding === lib.url
                      const catStyle = getCatStyle(lib.category)
                      return (
                        <div
                          key={lib.url}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            padding: 14,
                            background: exists ? 'rgba(0,229,160,0.04)' : 'var(--card)',
                            border: `1px solid ${exists ? 'rgba(0,229,160,0.15)' : 'var(--border)'}`,
                            borderRadius: 12,
                            transition: 'border-color 0.15s, background 0.15s',
                          }}
                          className="card-hover-effect"
                        >
                          {/* Name */}
                          <span style={{
                            fontSize: 13, fontWeight: 600, color: 'var(--text)',
                            lineHeight: 1.3, overflow: 'hidden',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}>
                            {lib.name}
                          </span>

                          {/* Category badge + Add button */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
                            <span style={{
                              fontSize: 10, padding: '3px 8px',
                              background: catStyle.bg,
                              color: catStyle.color,
                              borderRadius: 20, fontWeight: 600, flexShrink: 0,
                            }}>
                              {lib.category}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdd(lib)}
                              disabled={exists || isAdding}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '6px 12px', fontSize: 11, fontWeight: 600,
                                background: exists ? 'rgba(0,229,160,0.1)' : 'var(--accent)',
                                color: exists ? '#00e5a0' : '#fff',
                                border: exists ? '1px solid rgba(0,229,160,0.2)' : 'none',
                                borderRadius: 8,
                                cursor: exists || isAdding ? 'not-allowed' : 'pointer',
                                flexShrink: 0, opacity: isAdding ? 0.6 : 1,
                                minHeight: 32, minWidth: 56,
                                justifyContent: 'center',
                              }}
                            >
                              {isAdding ? (
                                <Loader2 size={11} style={{ animation: 'spin 0.6s linear infinite' }} />
                              ) : exists ? (
                                <><Check size={11} /> Added</>
                              ) : (
                                <><Plus size={11} /> Add</>
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
