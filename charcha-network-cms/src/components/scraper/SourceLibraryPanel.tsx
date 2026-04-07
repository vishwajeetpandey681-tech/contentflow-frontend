'use client'

import { useState, useMemo } from 'react'
import { BookOpen, ChevronDown, ChevronRight, FileUp } from 'lucide-react'
import { sourcesApi } from '@/lib/api'
import { SOURCE_LIBRARY, CHANNELS, LIBRARY_CATEGORIES } from '@/lib/source-library'
import toast from 'react-hot-toast'

function parseCsvToSources(csv: string): { name: string; url: string; type?: string }[] {
  const lines = csv.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const out: { name: string; url: string; type?: string }[] = []
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
    if (parts.length >= 2) {
      out.push({ name: parts[0], url: parts[1], type: parts[2] || undefined })
    }
  }
  return out
}

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
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)

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

  const handleImportCsv = async () => {
    const sources = parseCsvToSources(csvText)
    if (sources.length === 0) {
      toast.error('Paste CSV with columns: name, url [, type]')
      return
    }
    setImporting(true)
    try {
      const res = await sourcesApi.importSources(sources)
      const d = res.data?.data as { created?: number; errors?: { index: number; name: string; error: string }[] }
      const created = d?.created ?? 0
      const errors = d?.errors ?? []
      if (created > 0) toast.success(`Imported ${created} source(s)`)
      if (errors.length > 0) toast.error(`${errors.length} row(s) failed`)
      if (created > 0) {
        setCsvText('')
        onAdded()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
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
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
              <FileUp size={12} />
              Import CSV (name, url [, type])
            </div>
            <textarea
              placeholder="Source Name, https://example.com/feed.xml, RSS"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 8, fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', resize: 'vertical' }}
            />
            <button
              type="button"
              onClick={handleImportCsv}
              disabled={importing || !csvText.trim()}
              style={{
                marginTop: 6,
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                background: (importing || !csvText.trim()) ? 'var(--card)' : 'var(--accent)',
                color: (importing || !csvText.trim()) ? 'var(--text-dim)' : '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: (importing || !csvText.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
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
