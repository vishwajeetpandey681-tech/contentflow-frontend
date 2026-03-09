'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { sourcesApi } from '@/lib/api'
import type { ScraperSource, OutputLanguage } from '@/types/source'
import { ARTICLE_CATEGORIES, CRON_PRESETS } from '@/types/source'
import { LIBRARY_CATEGORIES } from '@/lib/source-library'

const EDIT_CATEGORIES = Array.from(new Set([...ARTICLE_CATEGORIES, ...LIBRARY_CATEGORIES])).sort()
import { REWRITE_LANGUAGES } from '@/lib/rewrite-options'
import toast from 'react-hot-toast'

interface EditSourceFormProps {
  source: ScraperSource
  onSuccess: () => void
}

export function EditSourceForm({ source, onSuccess }: EditSourceFormProps) {
  const [customPrompt, setCustomPrompt] = useState(source.customPrompt || '')
  const [defaultOutputLanguage, setDefaultOutputLanguage] = useState<OutputLanguage | ''>(
    source.defaultOutputLanguage || ''
  )
  const [channel, setChannel] = useState(source.channel || '')
  const [category, setCategory] = useState<string>(source.category || '')
  const [cronSchedule, setCronSchedule] = useState(source.cronSchedule || '0 */6 * * *')
  const [cronCustomMode, setCronCustomMode] = useState(!CRON_PRESETS.some(p => p.value === (source.cronSchedule || '')))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCustomPrompt(source.customPrompt || '')
    setDefaultOutputLanguage(source.defaultOutputLanguage || '')
    setCategory(source.category || '')
    setCronSchedule(source.cronSchedule || '0 */6 * * *')
    setCronCustomMode(!CRON_PRESETS.some(p => p.value === (source.cronSchedule || '')))
  }, [source.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await sourcesApi.update(source.id, {
        defaultOutputLanguage: defaultOutputLanguage || undefined,
        channel: channel.trim() || undefined,
        category: category || undefined,
        cronSchedule: cronSchedule || '0 */6 * * *',
      })
      await sourcesApi.updatePrefs(source.id, {
        customPrompt: customPrompt.trim() || null,
      })
      toast.success('Source updated')
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
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
    <div style={{ maxWidth: 400 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Cron schedule
        </label>
        <select
          value={cronCustomMode ? '__custom__' : (CRON_PRESETS.find(p => p.value === cronSchedule)?.value ?? '__custom__')}
          onChange={e => {
            const v = e.target.value
            if (v === '__custom__') {
              setCronCustomMode(true)
            } else {
              setCronCustomMode(false)
              setCronSchedule(v)
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
          value={cronSchedule}
          onChange={e => setCronSchedule(e.target.value.trim() || '0 */6 * * *')}
          style={{
            ...inputStyle,
            marginTop: 6,
            display: cronCustomMode ? 'block' : 'none',
          }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Channel (publisher)
        </label>
        <input
          type="text"
          placeholder="e.g. TOI, NDTV, ANI"
          value={channel}
          onChange={e => setChannel(e.target.value)}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Category (topic)
        </label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value || '')}
          style={inputStyle}
        >
          <option value="">None</option>
          {EDIT_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Default output language
        </label>
        <select
          value={defaultOutputLanguage}
          onChange={e => setDefaultOutputLanguage((e.target.value || '') as OutputLanguage | '')}
          style={inputStyle}
        >
          <option value="">Use per-article choice</option>
          {REWRITE_LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
          Custom rewrite prompt (optional, per-user)
        </label>
        <textarea
          placeholder="Override the full-article prompt. Use {{LANGUAGE}}, {{TITLE}}, {{CONTENT}}"
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          rows={4}
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '8px 16px',
          background: 'var(--accent-glow)',
          color: 'var(--accent-light)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : null}
        Save rewrite settings
      </button>
    </div>
  )
}
