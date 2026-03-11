'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { sourcesApi } from '@/lib/api'
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
