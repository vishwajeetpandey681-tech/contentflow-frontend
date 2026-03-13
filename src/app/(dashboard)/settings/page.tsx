'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Settings as SettingsIcon, Loader2, Check, Newspaper, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { settingsApi, healthApi, type BackendStatusServices } from '@/lib/api'
import toast from 'react-hot-toast'

const AI_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini (fast, cheap)' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
]

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [aiModel, setAiModel] = useState('gpt-4o-mini')
  const [keyMask, setKeyMask] = useState('')
  const [globalPrompt, setGlobalPrompt] = useState('')
  const [dedupeHeadlinesAcrossSources, setDedupeHeadlinesAcrossSources] = useState(false)
  const [headlineSimilarityThreshold, setHeadlineSimilarityThreshold] = useState(0.85)
  const [residentialProxyUrl, setResidentialProxyUrl] = useState('')
  const [proxyMask, setProxyMask] = useState('')
  const [backendStatus, setBackendStatus] = useState<BackendStatusServices | null>(null)
  const [backendStatusLoading, setBackendStatusLoading] = useState(false)
  const [backendStatusError, setBackendStatusError] = useState<string | null>(null)

  const fetchBackendStatus = useCallback(async () => {
    setBackendStatusLoading(true)
    setBackendStatusError(null)
    try {
      const res = await healthApi.status()
      const services = res.data?.services
      if (services) setBackendStatus(services)
      else setBackendStatusError('Invalid response')
    } catch (err) {
      setBackendStatusError(err instanceof Error ? err.message : 'Backend unreachable')
      setBackendStatus(null)
    } finally {
      setBackendStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    settingsApi
      .get()
      .then(data => {
        setAiModel(data.aiModel || 'gpt-4o-mini')
        setKeyMask(data.openai?.keyMask || '')
        setGlobalPrompt(data.globalPrompt || '')
        setDedupeHeadlinesAcrossSources(!!data.dedupeHeadlinesAcrossSources)
        setHeadlineSimilarityThreshold(typeof data.headlineSimilarityThreshold === 'number' ? data.headlineSimilarityThreshold : 0.85)
        setProxyMask(data.residentialProxyUrl || '')
        if (data.residentialProxyDisabled) setResidentialProxyUrl('__none__')
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchBackendStatus()
  }, [fetchBackendStatus])

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsApi.update({
        openaiApiKey: openaiApiKey || undefined,
        aiModel,
        globalPrompt: globalPrompt || undefined,
        dedupeHeadlinesAcrossSources,
        headlineSimilarityThreshold,
        residentialProxyUrl: residentialProxyUrl || undefined,
      })
      if (openaiApiKey) setKeyMask(openaiApiKey.slice(0, 8) + '••••' + openaiApiKey.slice(-4))
      setOpenaiApiKey('')
      if (residentialProxyUrl && residentialProxyUrl !== '__none__') setProxyMask('••••' + residentialProxyUrl.slice(-4))
      if (residentialProxyUrl === '__none__') setProxyMask('')
      if (residentialProxyUrl !== '__none__') setResidentialProxyUrl('')
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 size={24} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 max-w-2xl p-4 md:p-6" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-light)',
            }}
          >
            <SettingsIcon size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Settings</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Configure OpenAI, global prompt, and deduplication
            </p>
          </div>
        </div>

        <div
          className="settings-section-card"
          style={{
            padding: 20,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              fontFamily: 'Geist Mono, monospace',
              marginBottom: 16,
            }}
          >
            🤖 AI Settings
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              API Key
            </label>
            <input
              type="password"
              value={openaiApiKey}
              onChange={e => setOpenaiApiKey(e.target.value)}
              placeholder={keyMask ? `Current: ${keyMask}` : 'sk-proj-...'}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 12,
                fontFamily: 'Geist Mono, monospace',
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Global Prompt
            </label>
            <textarea
              value={globalPrompt}
              onChange={e => setGlobalPrompt(e.target.value)}
              placeholder="Optional custom prompt for rewrite. Use {{LANGUAGE}}, {{TITLE}}, {{CONTENT}}. Leave empty to use default."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 12,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              AI Model
            </label>
            <select
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 12,
              }}
            >
              {AI_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="settings-section-card"
          style={{
            padding: 20,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              fontFamily: 'Geist Mono, monospace',
              marginBottom: 16,
            }}
          >
            Residential Proxy
          </div>
            <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Quick presets
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setResidentialProxyUrl('')}
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  background: !residentialProxyUrl && !proxyMask ? 'var(--accent-glow)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                Use built-in (4 free)
              </button>
              <button
                type="button"
                onClick={() => setResidentialProxyUrl('__none__')}
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  background: residentialProxyUrl === '__none__' ? 'var(--accent-glow)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                Disable
              </button>
            </div>
          </div>
            <div style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Custom proxy URL (HTTP/HTTPS/SOCKS5)
            </label>
            <input
              type="password"
              value={residentialProxyUrl}
              onChange={e => setResidentialProxyUrl(e.target.value)}
              placeholder={proxyMask ? `Current: ${proxyMask}` : 'http://user:pass@host:port — leave empty to use 4 built-in free proxies'}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 12,
                fontFamily: 'Geist Mono, monospace',
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Used for RSS/HTML scraping to bypass 403 blocks. Built-in proxies rotate automatically when no custom URL is set.
            </div>
          </div>
        </div>

        <div
          className="settings-section-card"
          style={{
            padding: 20,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              fontFamily: 'Geist Mono, monospace',
              marginBottom: 16,
            }}
          >
            Deduplication
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              padding: '12px 0',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                Deduplicate headlines across all sources
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: dedupeHeadlinesAcrossSources ? 'var(--accent-glow)' : 'var(--surface)',
                    color: dedupeHeadlinesAcrossSources ? 'var(--accent-light)' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {dedupeHeadlinesAcrossSources ? 'On' : 'Off'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Skip articles with similar headlines from any channel (reduces duplicate coverage of same story)
              </div>
              {dedupeHeadlinesAcrossSources && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Similarity threshold ({Math.round(headlineSimilarityThreshold * 100)}%) — higher = stricter match
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={Math.round(headlineSimilarityThreshold * 100)}
                    onChange={e => setHeadlineSimilarityThreshold(parseInt(e.target.value, 10) / 100)}
                    style={{ width: '100%', maxWidth: 280 }}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDedupeHeadlinesAcrossSources(v => !v)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: dedupeHeadlinesAcrossSources ? 'var(--accent)' : 'var(--border)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  left: dedupeHeadlinesAcrossSources ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '13px 24px',
            minHeight: 46,
            background: saving ? 'var(--accent-glow)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: saving ? 'none' : '0 2px 12px rgba(124,58,237,0.3)',
            transition: 'opacity 0.15s',
          }}
        >
          {saving ? (
            <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />
          ) : (
            <Check size={16} />
          )}
          Save Settings
        </button>

        {/* Backend Status subsection */}
        <div
          className="settings-section-card"
          style={{
            padding: 20,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            marginTop: 24,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
                fontFamily: 'Geist Mono, monospace',
              }}
            >
              Backend Status
            </div>
            <button
              onClick={fetchBackendStatus}
              disabled={backendStatusLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 11,
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: backendStatusLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={12} style={{ animation: backendStatusLoading ? 'spin 0.6s linear infinite' : undefined }} />
              Refresh
            </button>
          </div>
          {backendStatusError ? (
            <div
              style={{
                padding: 14,
                background: 'var(--red-bg)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--red)',
              }}
            >
              <strong>Backend unreachable</strong> — {backendStatusError}
            </div>
          ) : backendStatus ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'api' as const, label: 'API Server', desc: 'Backend API' },
                { key: 'data' as const, label: 'Data Storage', desc: 'data.json' },
                { key: 'openai' as const, label: 'OpenAI', desc: 'AI rewrite' },
                { key: 'wordpress' as const, label: 'WordPress', desc: 'Publishing' },
              ].map(({ key, label, desc }) => {
                const s = backendStatus[key]
                const ok = s?.ok ?? false
                const configured = 'configured' in s ? s.configured : true
                const msg = s?.message ?? 'Unknown'
                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {ok ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                      ) : (
                        <XCircle size={18} style={{ color: 'var(--red)', flexShrink: 0 }} />
                      )}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: ok ? 'var(--green-bg)' : 'var(--red-bg)',
                        color: ok ? 'var(--green)' : 'var(--red)',
                        border: ok ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)',
                        fontFamily: 'Geist Mono, monospace',
                      }}
                    >
                      {ok ? (configured ? 'Working' : 'Configured') : msg}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : backendStatusLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>
              <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />
              Checking status…
            </div>
          ) : null}
        </div>

        <Link
          href="/wordpress/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
            fontSize: 12,
            color: 'var(--accent-light)',
            textDecoration: 'none',
          }}
        >
          <Newspaper size={14} />
          WordPress settings (connection, field map, auto-publish)
        </Link>
      </div>
    </div>
  )
}
