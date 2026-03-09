'use client'

import { useState, useMemo } from 'react'
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { sourcesApi } from '@/lib/api'
import { SOURCE_LIBRARY, CHANNELS, LIBRARY_CATEGORIES } from '@/lib/source-library'
import toast from 'react-hot-toast'

interface SourceLibraryPanelProps {
  existingUrls: Set<string>
  onAdded: () => void
  defaultOpen?: boolean
}

export function SourceLibraryPanel({ existingUrls, onAdded, defaultOpen = true }: SourceLibraryPanelProps) {
  const [open, setOpen] = useState(defaultOpen)
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

  const handleAdd = async (lib: typeof SOURCE_LIBRARY[0]) => {
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
    padding: '6px 10px',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: 12,
  } as const

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text)',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <BookOpen size={16} style={{ color: 'var(--accent-light)' }} />
        Add from library
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, marginBottom: 12 }}>
            <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} style={inputStyle}>
              <option value="">All channels</option>
              {CHANNELS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={inputStyle}>
              <option value="">All categories</option>
              {LIBRARY_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: 12 }}>No matches</div>
            ) : (
              filtered.map(lib => {
                const exists = existingUrls.has(lib.url)
                return (
                  <div
                    key={lib.url}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ flex: 1, fontWeight: 500, color: 'var(--text)' }}>{lib.name}</span>
                    <span style={{ fontSize: 10, padding: '3px 6px', background: 'var(--card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }} title="Format">
                      {lib.type}
                    </span>
                    <span style={{ fontSize: 10, padding: '3px 6px', background: 'var(--card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                      {lib.channel}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdd(lib)}
                      disabled={exists || adding === lib.url}
                      style={{
                        padding: '6px 12px',
                        fontSize: 11,
                        fontWeight: 600,
                        background: exists ? 'var(--card)' : 'var(--accent)',
                        color: exists ? 'var(--text-dim)' : '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: exists || adding === lib.url ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {adding === lib.url ? '...' : exists ? 'Added' : 'Add'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
