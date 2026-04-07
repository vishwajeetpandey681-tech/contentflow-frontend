'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { TrendingUp, RefreshCw, Loader2, Settings2, Zap } from 'lucide-react'
import { useContentWorkspace } from '@/lib/content-workspace'
import toast from 'react-hot-toast'

function timeAgo(date: string | null) {
  if (!date) return 'Never'
  const d = new Date(date)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleString()
}

export default function TrendsPage() {
  const { apis } = useContentWorkspace()
  type TrendsData = { lastFetched: string | null; all: unknown[]; english: unknown[]; hindi: unknown[]; realtime: unknown[] }
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [tab, setTab] = useState<'english' | 'hindi' | 'realtime'>('english')
  const [settings, setSettings] = useState<{ enabled: boolean; fetchInterval: number; autoAddToInbox: boolean; autoRewrite: boolean; autoPublish: boolean } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const t = await apis.trends.get()
      setTrends(t)
    } catch {
      setTrends({ lastFetched: null, all: [], english: [], hindi: [], realtime: [] })
    } finally {
      setLoading(false)
    }
  }, [apis.trends])

  const loadSettings = useCallback(async () => {
    try {
      const s = await apis.trends.settings.get()
      setSettings(s)
    } catch {
      setSettings(null)
    }
  }, [apis.trends])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadSettings() }, [loadSettings])

  const handleFetch = async () => {
    setFetching(true)
    try {
      const res = await apis.trends.fetch()
      if (res?.success) {
        toast.success(`Fetched ${res.trendsCount ?? 0} trends, ${res.matchesCount ?? 0} matches`)
        load()
      } else {
        toast.error(res?.error || 'Fetch failed')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setFetching(false)
    }
  }

  const handleSaveSettings = async (updates: Record<string, unknown>) => {
    try {
      await apis.trends.settings.save(updates)
      loadSettings()
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save')
    }
  }

  const list = tab === 'english' ? (trends?.english || [])
    : tab === 'hindi' ? (trends?.hindi || [])
    : (trends?.realtime || [])
  const items = Array.isArray(list) ? list : []

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            📈 Google Trends
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Last updated: {timeAgo(trends?.lastFetched || null)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleFetch}
            disabled={fetching}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: fetching ? 'not-allowed' : 'pointer',
            }}
          >
            {fetching ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RefreshCw size={14} />}
            Fetch Now
          </button>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13,
              background: 'var(--card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
            }}
          >
            <Settings2 size={14} /> Settings
          </button>
        </div>
      </div>

      {settingsOpen && settings && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 12 }}>⚙️ Trend Settings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, width: 140 }}>Auto-fetch every</span>
              <select
                value={settings.fetchInterval}
                onChange={e => handleSaveSettings({ fetchInterval: Number(e.target.value) })}
                style={{ padding: '6px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)' }}
              >
                {[5, 15, 30, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, width: 140 }}>Add Google Trends to inbox</span>
                <button
                  type="button"
                  onClick={() => handleSaveSettings({ autoAddToInbox: !settings.autoAddToInbox })}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: settings.autoAddToInbox ? 'var(--accent)' : 'var(--border)',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                    left: settings.autoAddToInbox ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, maxWidth: 420, lineHeight: 1.45 }}>
                Off (recommended): only articles from your Sources appear in the inbox. On: also add new rows from Google Trends links.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, width: 140 }}>Auto-rewrite</span>
              <button
                onClick={() => handleSaveSettings({ autoRewrite: !settings.autoRewrite })}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: settings.autoRewrite ? 'var(--accent)' : 'var(--border)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                  left: settings.autoRewrite ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, width: 140 }}>Auto-publish</span>
              <button
                onClick={() => handleSaveSettings({ autoPublish: !settings.autoPublish })}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: settings.autoPublish ? 'var(--accent)' : 'var(--border)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                  left: settings.autoPublish ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['english', 'hindi', 'realtime'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
              background: tab === t ? 'var(--accent)' : 'var(--card)', color: tab === t ? '#fff' : 'var(--text-muted)',
              border: tab === t ? 'none' : '1px solid var(--border)',
            }}
          >
            {t === 'english' && '🇬🇧 English'}
            {t === 'hindi' && '🇮🇳 Hindi'}
            {t === 'realtime' && '⚡ Realtime'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-dim)' }}>
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 12px', display: 'block' }} />
          Loading trends…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.slice(0, 20).map((item, i) => {
            const row = item as { keyword?: string; traffic?: string; relatedQueries?: string[] }
            return (
            <div
              key={i}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>#{i + 1}</span>
                    <span style={{ fontSize: 14 }}>🔥</span>
                    <span style={{ fontFamily: 'var(--font-headline)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                      {row.keyword || '—'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4 }}>
                      {row.traffic || 'Trending'} searches
                    </span>
                  </div>
                  {row.relatedQueries?.length ? (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                      Related: {row.relatedQueries.slice(0, 5).join(', ')}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link
                    href={`/scraper/inbox/?trend=${encodeURIComponent(row.keyword || '')}`}
                    style={{
                      padding: '6px 12px', fontSize: 11, fontWeight: 600, background: 'var(--navy)', color: '#fff',
                      borderRadius: 6, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    View Articles
                  </Link>
                  <Link
                    href={`/scraper/inbox/?trend=${encodeURIComponent(row.keyword || '')}&rewrite=1`}
                    style={{
                      padding: '6px 12px', fontSize: 11, fontWeight: 600, background: 'var(--accent)', color: '#fff',
                      borderRadius: 6, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Zap size={10} /> Auto-Rewrite All
                  </Link>
                </div>
              </div>
            </div>
            )
          })}
          {items.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-dim)' }}>
              No trends yet. Click &quot;Fetch Now&quot; to load.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
