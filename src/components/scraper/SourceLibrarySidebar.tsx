'use client'

import { useState, useMemo } from 'react'
import { BookOpen } from 'lucide-react'
import { sourcesApi } from '@/lib/api'
import { SOURCE_LIBRARY, CHANNELS, LIBRARY_CATEGORIES } from '@/lib/source-library'
import toast from 'react-hot-toast'

interface SourceLibrarySidebarProps {
  existingUrls: Set<string>
  onAdded: () => void
  /** When true (Library tab), hide the "Library" header to avoid duplication with tab label */
  hideTitle?: boolean
}

export function SourceLibrarySidebar({ existingUrls, onAdded, hideTitle }: SourceLibrarySidebarProps) {
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
      className="source-library-sidebar"
      style={{
        width: 280,
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      <div style={{ padding: 16, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {!hideTitle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BookOpen size={18} style={{ color: 'var(--accent-light)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Library</span>
          </div>
        )}
        <div className="library-filters" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: hideTitle ? 12 : undefined }}>
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0 }}>
            <option value="">All channels</option>
            {CHANNELS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0 }}>
            <option value="">All categories</option>
            {LIBRARY_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                  gap: 8,
                  padding: '10px 12px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                }}
              >
                <span style={{ flex: 1, fontWeight: 500, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lib.name}</span>
                <span style={{ fontSize: 10, padding: '3px 6px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', flexShrink: 0 }} title="Format">
                  {lib.type}
                </span>
                <button
                  type="button"
                  onClick={() => handleAdd(lib)}
                  disabled={exists || adding === lib.url}
                  style={{
                    padding: '6px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    background: exists ? 'var(--surface)' : 'var(--accent)',
                    color: exists ? 'var(--text-dim)' : '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: exists || adding === lib.url ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
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
  )
}
