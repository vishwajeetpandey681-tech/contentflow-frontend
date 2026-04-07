'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, ChevronDown, ChevronUp, Newspaper, AtSign } from 'lucide-react'
import { sourcesApi } from '@/lib/api'
import { buildGoogleNewsRssUrl, suggestedSourceNameForTopic, type GoogleNewsRegion } from '@/lib/topic-feeds'
import { parseXProfileHandle, suggestedNameForXAccount } from '@/lib/x-account-feed'
import type { CreateSourceInput, SourceType, OutputLanguage, ArticleCategory } from '@/types/source'
import { ARTICLE_CATEGORIES, CRON_PRESETS, FETCH_INTERVAL_PRESETS } from '@/types/source'
import { REWRITE_LANGUAGES } from '@/lib/rewrite-options'
import toast from 'react-hot-toast'

interface AddSourceFormProps {
  onSuccess: () => void
  onClose: () => void
  inline?: boolean
}

const SOURCE_TYPES: SourceType[] = ['RSS', 'ATOM', 'HTML_LISTING', 'JSON_FEED']

function AutoValidateUrl({ url, onDetected, onMetadata }: { url: string; onDetected: (type: string) => void; onMetadata?: (meta: { title: string | null; description: string | null; favicon: string | null }) => void }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDetectedRef = useRef(onDetected)
  const onMetadataRef = useRef(onMetadata)
  onDetectedRef.current = onDetected
  onMetadataRef.current = onMetadata

  useEffect(() => {
    if (!url.trim() || !url.startsWith('http')) {
      setResult(null)
      setLoading(false)
      return
    }
    const firstUrl = url.split(',')[0].trim()
    if (!firstUrl.startsWith('http')) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setResult(null)
      try {
        const res = await sourcesApi.validateUrl(firstUrl)
        const data = res.data as { ok?: boolean; type?: string | null; error?: string; note?: string; metadata?: { title: string | null; description: string | null; favicon: string | null } }
        if (data.ok && data.type) {
          onDetectedRef.current(data.type)
          if (data.metadata && onMetadataRef.current) onMetadataRef.current(data.metadata)
          setResult(`Detected: ${data.type}`)
        } else {
          setResult(data.error || 'Unknown format')
        }
      } catch (e) {
        setResult(e instanceof Error ? e.message : 'Validation failed')
      } finally {
        setLoading(false)
      }
      debounceRef.current = null
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [url])

  if (!url.trim()) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      {loading && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Validating…</span>}
      {result && !loading && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{result}</span>}
    </div>
  )
}

const HTML_PRESETS: Record<string, { name: string; url: string; htmlListingConfig: { baseUrl: string; cardSelector?: string; titleSelector: string; urlSelector: string } }> = {
  ANI: {
    name: 'ANI News',
    url: 'https://aninews.in/category/national/politics/, https://aninews.in/category/national/general-news/, https://aninews.in/category/national/features/',
    htmlListingConfig: {
      baseUrl: 'https://aninews.in',
      cardSelector: '.card',
      titleSelector: 'h1.title',
      urlSelector: "a[href^='/news']",
    },
  },
}

export function AddSourceForm({ onSuccess, onClose, inline = false }: AddSourceFormProps) {
  const [loading, setLoading] = useState(false)
  const [cronCustomMode, setCronCustomMode] = useState(false)
  const [topicHelperOpen, setTopicHelperOpen] = useState(false)
  const [topicQuery, setTopicQuery] = useState('')
  const [topicRegion, setTopicRegion] = useState<GoogleNewsRegion>('IN')
  const [xHelperOpen, setXHelperOpen] = useState(false)
  const [xProfileInput, setXProfileInput] = useState('')
  const [xBridgeRssUrl, setXBridgeRssUrl] = useState('')
  const [form, setForm] = useState<CreateSourceInput>({
    name: '',
    url: '',
    type: 'RSS',
    maxPerRun: 20,
    cronSchedule: '0 */6 * * *',
    fetchInterval: '',
    customPrompt: null,
    defaultOutputLanguage: null,
    channel: null,
    category: null,
    keywordWhitelist: null,
    keywordBlacklist: null,
    minArticleLength: null,
    maxArticleLength: null,
    maxArticleAgeDays: null,
  })
  const baseForm: CreateSourceInput = { name: '', url: '', type: 'RSS', maxPerRun: 20, cronSchedule: '0 */6 * * *', fetchInterval: '', customPrompt: null, defaultOutputLanguage: null, channel: null, category: null, keywordWhitelist: null, keywordBlacklist: null, minArticleLength: null, maxArticleLength: null, maxArticleAgeDays: null }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!form.name.trim() || !form.url.trim()) {
      toast.error('Name and URL are required')
      return
    }
    setLoading(true)
    try {
      await sourcesApi.create(form)
      toast.success(`"${form.name}" added`)
      setForm({ ...baseForm })
      setCronCustomMode(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add source')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 7,
    color: 'var(--text)',
    fontSize: 12,
  }

  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          marginBottom: 12,
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--surface)',
        }}
      >
        <button
          type="button"
          onClick={() => setTopicHelperOpen(v => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text)',
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'left',
          }}
        >
          <Newspaper size={14} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Topic feeds (no Twitter/X API)</span>
          {topicHelperOpen ? <ChevronUp size={16} style={{ color: 'var(--text-dim)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-dim)' }} />}
        </button>
        {topicHelperOpen && (
          <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.45, margin: '10px 0 8px' }}>
              X/Twitter does not offer a stable public RSS feed without their API. To cover a <strong style={{ color: 'var(--text-muted)' }}>topic</strong> with the same inbox → rewrite flow, use{' '}
              <strong style={{ color: 'var(--text-muted)' }}>Google News RSS</strong> below. If you have a working <strong style={{ color: 'var(--text-muted)' }}>Twitter → RSS</strong> URL (e.g. RSS-Bridge, rss.app), paste it in Feed URL as a normal RSS source.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <input
                type="text"
                placeholder="e.g. IPL 2025, RBI policy"
                value={topicQuery}
                onChange={e => setTopicQuery(e.target.value)}
                style={{ ...inputStyle, flex: '1 1 160px', minWidth: 0 }}
              />
              <select
                value={topicRegion}
                onChange={e => setTopicRegion(e.target.value as GoogleNewsRegion)}
                style={{ ...inputStyle, flex: '0 0 120px' }}
              >
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                const url = buildGoogleNewsRssUrl(topicQuery, topicRegion)
                if (!url) {
                  toast.error('Enter a topic or keyword')
                  return
                }
                setForm(f => ({
                  ...f,
                  type: 'RSS',
                  url,
                  name: f.name.trim() ? f.name : suggestedSourceNameForTopic(topicQuery),
                }))
                toast.success('Filled Feed URL with Google News RSS — review and Add Source')
              }}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(124,58,237,0.15)',
                color: 'var(--accent-light)',
                border: '1px solid rgba(124,58,237,0.35)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Apply Google News RSS
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          marginBottom: 12,
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--surface)',
        }}
      >
        <button
          type="button"
          onClick={() => setXHelperOpen(v => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text)',
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'left',
          }}
        >
          <AtSign size={14} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Track an X (Twitter) account</span>
          {xHelperOpen ? <ChevronUp size={16} style={{ color: 'var(--text-dim)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-dim)' }} />}
        </button>
        {xHelperOpen && (
          <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.45, margin: '10px 0 8px' }}>
              You <strong style={{ color: 'var(--text-muted)' }}>cannot</strong> paste <code style={{ fontSize: 9 }}>x.com/…</code> as a feed — the site blocks scrapers and has no public RSS (see{' '}
              <a href="https://x.com/realDonaldTrump" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-light)' }}>profile pages</a>
              {' '}often failing without login). To get <strong style={{ color: 'var(--text-muted)' }}>posts into Inbox</strong>, use a service that outputs <strong style={{ color: 'var(--text-muted)' }}>RSS</strong>{' '}
              (self-hosted <strong style={{ color: 'var(--text-muted)' }}>RSS-Bridge</strong>, <strong style={{ color: 'var(--text-muted)' }}>rss.app</strong>, or similar), then paste that RSS URL below.
            </p>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4 }}>Profile link or @handle</label>
            <input
              type="text"
              placeholder="https://x.com/realDonaldTrump or @realDonaldTrump"
              value={xProfileInput}
              onChange={e => setXProfileInput(e.target.value)}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4 }}>RSS URL from your bridge (required)</label>
            <input
              type="url"
              placeholder="https://… (RSS/Atom from rss.app, RSS-Bridge, …)"
              value={xBridgeRssUrl}
              onChange={e => setXBridgeRssUrl(e.target.value)}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <button
              type="button"
              onClick={() => {
                const bridge = xBridgeRssUrl.trim()
                if (!bridge.startsWith('http')) {
                  toast.error('Paste the RSS URL your bridge gives you (must start with https://)')
                  return
                }
                const handle = parseXProfileHandle(xProfileInput) || 'account'
                setForm(f => ({
                  ...f,
                  type: 'RSS',
                  url: bridge,
                  name: f.name.trim() ? f.name : suggestedNameForXAccount(handle),
                  channel: f.channel || 'X',
                  category: f.category || 'Politics',
                }))
                toast.success('Filled Feed URL — save with Add Source. Official posts: use X API.')
              }}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(14,165,233,0.12)',
                color: '#38bdf8',
                border: '1px solid rgba(14,165,233,0.35)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Apply profile + RSS bridge
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Source Name
        </label>
        <input
          type="text"
          placeholder="e.g. NDTV India"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          {form.type === 'HTML_LISTING' ? 'Listing URL(s)' : 'Feed URL'}
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="url"
            placeholder={form.type === 'HTML_LISTING' ? 'https://example.com/category/news (comma-separated for multiple)' : 'https://example.com/feed'}
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            style={{ ...inputStyle, flex: 1 }}
          />
          {form.type !== 'HTML_LISTING' && (
            <AutoValidateUrl
              url={form.url}
              onDetected={type => setForm(f => ({ ...f, type: type as SourceType }))}
              onMetadata={meta => setForm(f => ({ ...f, name: (meta?.title || f.name || '').trim() || f.name, feedTitle: meta?.title || null, feedDescription: meta?.description || null, feedFavicon: meta?.favicon || null }))}
            />
          )}
        </div>
        {form.type === 'HTML_LISTING' && (
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(HTML_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm(f => ({ ...f, name: preset.name, url: preset.url, htmlListingConfig: preset.htmlListingConfig }))}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Use {key} preset
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Channel (publisher)
        </label>
        <input
          type="text"
          placeholder="e.g. TOI, NDTV, ANI"
          value={form.channel || ''}
          onChange={e => setForm(f => ({ ...f, channel: e.target.value.trim() || null }))}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Category (topic)
        </label>
        <select
          value={form.category || ''}
          onChange={e => setForm(f => ({ ...f, category: (e.target.value || null) as ArticleCategory | null }))}
          style={inputStyle}
        >
          <option value="">None</option>
          {ARTICLE_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Default output language
        </label>
        <select
          value={form.defaultOutputLanguage || ''}
          onChange={e => setForm(f => ({ ...f, defaultOutputLanguage: (e.target.value || null) as OutputLanguage | null }))}
          style={inputStyle}
        >
          <option value="">Use per-article choice</option>
          {REWRITE_LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Custom rewrite prompt (optional)
        </label>
        <textarea
          placeholder="Override the full-article prompt. Use {{LANGUAGE}}, {{TITLE}}, {{CONTENT}}"
          value={form.customPrompt || ''}
          onChange={e => setForm(f => ({ ...f, customPrompt: e.target.value.trim() || null }))}
          rows={3}
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
        />
      </div>
      <div className="flex gap-2" style={{ marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
            Type
          </label>
          <select
            value={form.type}
            onChange={e => {
              const t = e.target.value as SourceType
              setForm(f => ({ ...f, type: t, htmlListingConfig: t === 'HTML_LISTING' ? f.htmlListingConfig : undefined }))
            }}
            style={inputStyle}
          >
            {SOURCE_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
            Max / Run
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={form.maxPerRun}
            onChange={e => setForm(f => ({ ...f, maxPerRun: parseInt(e.target.value) || 20 }))}
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Cron schedule
        </label>
        <select
          value={cronCustomMode ? '__custom__' : (CRON_PRESETS.find(p => p.value === form.cronSchedule)?.value ?? '__custom__')}
          onChange={e => {
            const v = e.target.value
            if (v === '__custom__') {
              setCronCustomMode(true)
            } else {
              setCronCustomMode(false)
              setForm(f => ({ ...f, cronSchedule: v }))
            }
          }}
          style={inputStyle}
        >
          {CRON_PRESETS.map(p => (
            <option key={p.value || 'manual'} value={p.value}>{p.label}</option>
          ))}
          <option value="__custom__">Custom (cron expression)</option>
        </select>
        <input
          type="text"
          placeholder="e.g. 0 */6 * * * (minute hour day month weekday)"
          value={form.cronSchedule}
          onChange={e => setForm(f => ({ ...f, cronSchedule: e.target.value.trim() || '0 */6 * * *' }))}
          style={{
            ...inputStyle,
            marginTop: 6,
            display: cronCustomMode ? 'block' : 'none',
          }}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Fetch interval (preset)
        </label>
        <select
          value={form.fetchInterval ?? ''}
          onChange={e => setForm(f => ({ ...f, fetchInterval: e.target.value || '' }))}
          style={inputStyle}
        >
          {FETCH_INTERVAL_PRESETS.map(p => (
            <option key={p.value || 'manual'} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Keyword whitelist (comma-separated; article must match one)
        </label>
        <input
          type="text"
          placeholder="e.g. cricket, IPL"
          value={form.keywordWhitelist ?? ''}
          onChange={e => setForm(f => ({ ...f, keywordWhitelist: e.target.value.trim() || null }))}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Keyword blacklist (comma-separated; exclude if matches)
        </label>
        <input
          type="text"
          placeholder="e.g. spoiler, opinion"
          value={form.keywordBlacklist ?? ''}
          onChange={e => setForm(f => ({ ...f, keywordBlacklist: e.target.value.trim() || null }))}
          style={inputStyle}
        />
      </div>
      <div className="flex gap-2" style={{ marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>Min words</label>
          <input type="number" min={0} placeholder="0" value={form.minArticleLength ?? ''} onChange={e => setForm(f => ({ ...f, minArticleLength: e.target.value === '' ? null : parseInt(e.target.value) || 0 }))} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>Max words</label>
          <input type="number" min={0} placeholder="—" value={form.maxArticleLength ?? ''} onChange={e => setForm(f => ({ ...f, maxArticleLength: e.target.value === '' ? null : parseInt(e.target.value) || 0 }))} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>Max age (days)</label>
          <input type="number" min={0} placeholder="—" value={form.maxArticleAgeDays ?? ''} onChange={e => setForm(f => ({ ...f, maxArticleAgeDays: e.target.value === '' ? null : parseInt(e.target.value) || 0 }))} style={inputStyle} />
        </div>
      </div>
      <div className="flex gap-2" style={{ marginTop: 12 }}>
        <button
          onClick={() => handleSubmit()}
          disabled={loading}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 14px',
            background: 'var(--accent)',
            color: '#fff',
            border: '1px solid var(--accent)',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <span style={{ width: 18, height: 18, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <>
              <Plus size={13} />
              Add Source
            </>
          )}
        </button>
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '7px 14px',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid transparent',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
