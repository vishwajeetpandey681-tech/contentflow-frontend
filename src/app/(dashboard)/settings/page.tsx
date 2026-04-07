'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Settings as SettingsIcon, Loader2, Check, Newspaper, RefreshCw, CheckCircle2, XCircle, Globe, ExternalLink, Copy } from 'lucide-react'
import { settingsApi, healthApi, approvalApi, type BackendStatusServices, type AutoApproveSettings } from '@/lib/api'
import {
  CONFIGURED_PUBLIC_API_URL,
  DEFAULT_WEBSITE_DOMAIN,
  DEFAULT_WEBSITE_URL,
  WEBSITE_ARTICLE_PATH,
  getArticleUrl,
  getPublicWebsiteHomeUrl,
} from '@/lib/config'
import toast from 'react-hot-toast'

const AI_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini (fast, cheap)' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
]

type SettingsTab = 'general' | 'ai' | 'other' | 'analytics' | 'approval'

export default function SettingsPage() {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [aiModel, setAiModel] = useState('gpt-4o-mini')
  const [rewriteProvider, setRewriteProvider] = useState<'ollama_first' | 'openai_only'>('ollama_first')
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://127.0.0.1:11434')
  const [ollamaModel, setOllamaModel] = useState('llama3.2')
  /** Paste new keys to replace; one key per line. */
  const [ollamaApiKeysText, setOllamaApiKeysText] = useState('')
  const [ollamaKeyInfo, setOllamaKeyInfo] = useState<{
    keyCount: number
    keyMasks: string[]
    keysFromEnv?: boolean
  }>({ keyCount: 0, keyMasks: [] })
  const [keyMask, setKeyMask] = useState('')
  const [globalPrompt, setGlobalPrompt] = useState('')
  const [dedupeHeadlinesAcrossSources, setDedupeHeadlinesAcrossSources] = useState(false)
  const [headlineSimilarityThreshold, setHeadlineSimilarityThreshold] = useState(0.85)
  const [residentialProxyUrl, setResidentialProxyUrl] = useState('')
  const [proxyMask, setProxyMask] = useState('')
  const [googleAnalyticsMeasurementId, setGoogleAnalyticsMeasurementId] = useState('')
  const [googleSearchConsoleVerification, setGoogleSearchConsoleVerification] = useState('')
  const [googleAdsensePublisherId, setGoogleAdsensePublisherId] = useState('')
  const [taboolaPublisherId, setTaboolaPublisherId] = useState('')
  const [googleAnalyticsFromEnv, setGoogleAnalyticsFromEnv] = useState(false)
  const [googleAdsenseFromEnv, setGoogleAdsenseFromEnv] = useState(false)
  const [backendStatus, setBackendStatus] = useState<BackendStatusServices | null>(null)
  const [backendStatusLoading, setBackendStatusLoading] = useState(false)
  const [backendStatusError, setBackendStatusError] = useState<string | null>(null)
  const [autoApprove, setAutoApprove] = useState<AutoApproveSettings>({
    enabled: false,
    threshold: 80,
    trustedSources: ['TOI', 'NDTV', 'Hindu', 'ANI', 'PTI', 'HT', 'ET', 'BBC', 'Reuters', 'Moneycontrol'],
    blockedKeywords: ['death', 'murder', 'riot', 'violence', 'rape', 'bomb', 'terror', 'blast', 'attack'],
    publishDelay: 0,
    notifyOnReject: false,
  })
  const [savingAutoApprove, setSavingAutoApprove] = useState(false)

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
    approvalApi.autoApproveSettings.get().then(setAutoApprove).catch(() => {})
  }, [])

  useEffect(() => {
    settingsApi
      .get()
      .then(data => {
        setAiModel(data.aiModel || 'gpt-4o-mini')
        setRewriteProvider(data.rewriteProvider === 'openai_only' ? 'openai_only' : 'ollama_first')
        setOllamaBaseUrl(data.ollamaBaseUrl || 'http://127.0.0.1:11434')
        setOllamaModel(data.ollamaModel || 'llama3.2')
        setOllamaKeyInfo({
          keyCount: data.ollama?.keyCount ?? (data.ollama?.configured ? 1 : 0),
          keyMasks:
            data.ollama?.keyMasks?.length ? data.ollama.keyMasks : data.ollama?.keyMask ? [data.ollama.keyMask] : [],
          keysFromEnv: data.ollama?.keysFromEnv,
        })
        setKeyMask(data.openai?.keyMask || '')
        setGlobalPrompt(data.globalPrompt || '')
        setDedupeHeadlinesAcrossSources(!!data.dedupeHeadlinesAcrossSources)
        setHeadlineSimilarityThreshold(typeof data.headlineSimilarityThreshold === 'number' ? data.headlineSimilarityThreshold : 0.85)
        setProxyMask(data.residentialProxyUrl || '')
        if (data.residentialProxyDisabled) setResidentialProxyUrl('__none__')
        setGoogleAnalyticsMeasurementId(data.googleAnalyticsMeasurementId || '')
        setGoogleSearchConsoleVerification(data.googleSearchConsoleVerification || '')
        setGoogleAdsensePublisherId(data.googleAdsensePublisherId || '')
        setTaboolaPublisherId(data.taboolaPublisherId || '')
        setGoogleAnalyticsFromEnv(!!data.googleAnalyticsFromEnv)
        setGoogleAdsenseFromEnv(!!data.googleAdsenseFromEnv)
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
      const ollamaLines = ollamaApiKeysText.split('\n').map(l => l.trim()).filter(Boolean)
      const saved = await settingsApi.update({
        openaiApiKey: openaiApiKey || undefined,
        aiModel,
        rewriteProvider,
        ollamaBaseUrl: ollamaBaseUrl.trim() || undefined,
        ollamaModel: ollamaModel.trim() || undefined,
        ...(ollamaLines.length ? { ollamaApiKeys: ollamaLines } : {}),
        globalPrompt: globalPrompt || undefined,
        dedupeHeadlinesAcrossSources,
        headlineSimilarityThreshold,
        residentialProxyUrl: residentialProxyUrl || undefined,
        googleAnalyticsMeasurementId,
        googleSearchConsoleVerification,
        googleAdsensePublisherId,
        taboolaPublisherId,
      })
      if (saved.ollama) {
        setOllamaKeyInfo({
          keyCount: saved.ollama.keyCount ?? (saved.ollama.configured ? 1 : 0),
          keyMasks:
            saved.ollama.keyMasks?.length ? saved.ollama.keyMasks : saved.ollama.keyMask ? [saved.ollama.keyMask] : [],
          keysFromEnv: saved.ollama.keysFromEnv,
        })
      }
      if (openaiApiKey) setKeyMask(openaiApiKey.slice(0, 8) + '••••' + openaiApiKey.slice(-4))
      setOpenaiApiKey('')
      if (ollamaLines.length) setOllamaApiKeysText('')
      if (residentialProxyUrl && residentialProxyUrl !== '__none__') setProxyMask('••••' + residentialProxyUrl.slice(-4))
      if (residentialProxyUrl === '__none__') setProxyMask('')
      if (residentialProxyUrl !== '__none__') setResidentialProxyUrl('')
      setGoogleAnalyticsMeasurementId(saved.googleAnalyticsMeasurementId || '')
      setGoogleSearchConsoleVerification(saved.googleSearchConsoleVerification || '')
      setGoogleAdsensePublisherId(saved.googleAdsensePublisherId || '')
      setTaboolaPublisherId(saved.taboolaPublisherId || '')
      setGoogleAnalyticsFromEnv(!!saved.googleAnalyticsFromEnv)
      setGoogleAdsenseFromEnv(!!saved.googleAdsenseFromEnv)
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
              API connectivity, AI providers, scraping, and automation
            </p>
          </div>
        </div>

        <div
          className="flex min-w-0 gap-1 overflow-x-auto pb-2"
          style={{ marginBottom: 20, WebkitOverflowScrolling: 'touch' }}
        >
          {(
            [
              { id: 'general' as const, label: 'General & API' },
              { id: 'ai' as const, label: 'AI' },
              { id: 'other' as const, label: 'Scraping & other' },
              { id: 'analytics' as const, label: 'Analytics & ads' },
              { id: 'approval' as const, label: 'Auto-approve' },
            ] as const
          ).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSettingsTab(t.id)}
              style={{
                flex: '0 0 auto',
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: settingsTab === t.id ? 'var(--accent-glow)' : 'var(--card)',
                color: settingsTab === t.id ? 'var(--accent-light)' : 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {settingsTab === 'general' && (
          <>
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
            Public news site (reader links)
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
            “View article” and inbox links use this base URL for the user-facing site (e.g.{' '}
            <span style={{ fontFamily: 'Geist Mono, monospace', color: 'var(--text-dim)' }}>contentflow-news</span>
            ). Set <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>NEXT_PUBLIC_WEBSITE_URL</span>{' '}
            in <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>.env.local</span> for local dev.
          </p>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Site domain (labels)</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{DEFAULT_WEBSITE_DOMAIN}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Base URL</div>
            <div
              style={{
                fontSize: 12,
                fontFamily: 'Geist Mono, monospace',
                color: 'var(--accent-light)',
                wordBreak: 'break-all',
              }}
            >
              {DEFAULT_WEBSITE_URL.replace(/\/$/, '')}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Article URL pattern</div>
            <div
              style={{
                fontSize: 11,
                fontFamily: 'Geist Mono, monospace',
                color: 'var(--text-dim)',
                wordBreak: 'break-all',
              }}
            >
              …/{WEBSITE_ARTICLE_PATH}/{'{slug}'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>Example: {getArticleUrl('example-slug')}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <a
              href={getPublicWebsiteHomeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                background: 'rgba(33,150,243,0.12)',
                color: '#1976d2',
                border: '1px solid rgba(33,150,243,0.35)',
                borderRadius: 8,
                textDecoration: 'none',
              }}
            >
              <Globe size={14} /> Open site <ExternalLink size={12} style={{ opacity: 0.7 }} />
            </a>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(getPublicWebsiteHomeUrl())
                toast.success('Site URL copied')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <Copy size={14} /> Copy base URL
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(getArticleUrl('example-slug'))
                toast.success('Example article URL copied')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <Copy size={14} /> Copy example article link
            </button>
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
            Backend & API
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
            The Studio app talks to the ContentFlow backend. In the browser, requests use the same host with{' '}
            <code style={{ fontSize: 11 }}>/api</code> (Next.js rewrites to your backend). For builds and server code, set{' '}
            <code style={{ fontSize: 11 }}>NEXT_PUBLIC_API_URL</code> in <code style={{ fontSize: 11 }}>.env.local</code>.
          </p>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Configured API base (env)</div>
            <div
              style={{
                fontSize: 12,
                fontFamily: 'Geist Mono, monospace',
                color: 'var(--accent-light)',
                wordBreak: 'break-all',
                padding: '10px 12px',
                background: 'var(--surface)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              {CONFIGURED_PUBLIC_API_URL}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(CONFIGURED_PUBLIC_API_URL)
                toast.success('API base URL copied')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <Copy size={14} /> Copy API URL
            </button>
            <a
              href="/api/status"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                textDecoration: 'none',
              }}
            >
              API status (JSON) <ExternalLink size={12} style={{ opacity: 0.7 }} />
            </a>
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
              Backend status
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
                { key: 'ollama' as const, label: 'Ollama', desc: 'Local LLM (default rewrite)' },
                { key: 'openai' as const, label: 'OpenAI', desc: 'ChatGPT fallback' },
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
          </>
        )}

        {settingsTab === 'ai' && (
          <>
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
            AI Settings
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Rewrites use <strong style={{ color: 'var(--text)' }}>Ollama</strong> on your machine by default (OpenAI-compatible{' '}
            <code style={{ fontSize: 11 }}>/v1/chat/completions</code>
            ). If Ollama is down or errors, the app falls back to <strong style={{ color: 'var(--text)' }}>OpenAI (ChatGPT)</strong> when an API key is set.
          </p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Rewrite provider
            </label>
            <select
              value={rewriteProvider}
              onChange={e => setRewriteProvider(e.target.value === 'openai_only' ? 'openai_only' : 'ollama_first')}
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
              <option value="ollama_first">Ollama first — OpenAI fallback (recommended)</option>
              <option value="openai_only">OpenAI / ChatGPT only</option>
            </select>
          </div>
          {rewriteProvider === 'ollama_first' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Ollama base URL
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setOllamaBaseUrl('http://127.0.0.1:11434')}
                    style={{
                      padding: '6px 10px',
                      fontSize: 11,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    Local (127.0.0.1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOllamaBaseUrl('https://ollama.com')}
                    style={{
                      padding: '6px 10px',
                      fontSize: 11,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    Ollama Cloud
                  </button>
                </div>
                <input
                  type="url"
                  value={ollamaBaseUrl}
                  onChange={e => setOllamaBaseUrl(e.target.value)}
                  placeholder="http://127.0.0.1:11434 or https://ollama.com"
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
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.45 }}>
                  ECONNREFUSED on port 11434 means nothing is listening there: run the Ollama app locally, or use Cloud URL + API keys only (no local daemon).
                </p>
                {(ollamaKeyInfo.keyCount > 0 || ollamaKeyInfo.keysFromEnv) &&
                /127\.0\.0\.1|localhost/i.test(ollamaBaseUrl) ? (
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--amber, #d97706)',
                      margin: '8px 0 0',
                      padding: '10px 12px',
                      background: 'rgba(217, 119, 6, 0.08)',
                      border: '1px solid rgba(217, 119, 6, 0.25)',
                      borderRadius: 8,
                      lineHeight: 1.45,
                    }}
                  >
                    You have Cloud API keys but the base URL still points at local Ollama. Click “Ollama Cloud” above, save, then refresh Backend status.
                  </p>
                ) : null}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Ollama model
                </label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={e => setOllamaModel(e.target.value)}
                  placeholder="llama3.2 or gpt-oss:120b (cloud)"
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
                  Ollama API keys (Ollama Cloud only)
                </label>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.45 }}>
                  Required when the base URL is{' '}
                  <code style={{ fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>https://ollama.com</code>. Create keys at{' '}
                  <a
                    href="https://ollama.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)' }}
                  >
                    ollama.com/settings/keys
                  </a>
                  . Use one line per key (e.g. five accounts); requests rotate across keys. Leave empty for local{' '}
                  <code style={{ fontSize: 11 }}>ollama serve</code>. Paste new keys below to replace stored keys; leave blank
                  and save to keep existing.
                </p>
                {ollamaKeyInfo.keysFromEnv ? (
                  <p style={{ fontSize: 11, color: 'var(--amber, #d97706)', margin: '0 0 8px' }}>
                    Keys are loaded from server environment (OLLAMA_API_KEY / OLLAMA_API_KEYS). Clear env vars to use keys
                    saved here.
                  </p>
                ) : null}
                {ollamaKeyInfo.keyCount > 0 && !ollamaKeyInfo.keysFromEnv ? (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px', fontFamily: 'Geist Mono, monospace' }}>
                    {ollamaKeyInfo.keyCount} key{ollamaKeyInfo.keyCount === 1 ? '' : 's'} on file:{' '}
                    {ollamaKeyInfo.keyMasks.join(' · ')}
                  </p>
                ) : null}
                <textarea
                  value={ollamaApiKeysText}
                  onChange={e => setOllamaApiKeysText(e.target.value)}
                  placeholder="Paste keys, one per line, to replace stored keys"
                  rows={5}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'Geist Mono, monospace',
                    resize: 'vertical',
                  }}
                />
                {!ollamaKeyInfo.keysFromEnv ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Remove all Ollama API keys saved in settings?')) return
                      setSaving(true)
                      try {
                        const saved = await settingsApi.update({ ollamaApiKeys: [] })
                        setOllamaApiKeysText('')
                        if (saved.ollama) {
                          setOllamaKeyInfo({
                            keyCount: saved.ollama.keyCount ?? 0,
                            keyMasks: saved.ollama.keyMasks ?? [],
                            keysFromEnv: saved.ollama.keysFromEnv,
                          })
                        }
                        toast.success('Ollama keys cleared')
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed')
                      } finally {
                        setSaving(false)
                      }
                    }}
                    style={{
                      marginTop: 8,
                      padding: '6px 12px',
                      fontSize: 11,
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Clear stored Ollama keys
                  </button>
                ) : null}
              </div>
            </>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              OpenAI API key (fallback)
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
              OpenAI model (fallback)
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
          </>
        )}

        {settingsTab === 'other' && (
          <>
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
          </>
        )}

        {settingsTab === 'analytics' && (
          <>
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
                Analytics &amp; monetization
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Store IDs for your public news site: GA4, Search Console verification, Google AdSense, and Taboola. Wire
                these into your reader theme or layout (gtag, meta tag, ad scripts). The API persists values for your team;
                env vars override GA / AdSense when set on the server.
              </p>

              {googleAnalyticsFromEnv && (
                <div
                  style={{
                    padding: 12,
                    marginBottom: 14,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  <strong style={{ color: 'var(--text)' }}>GA4</strong> is overridden by{' '}
                  <code style={{ fontSize: 11 }}>GOOGLE_ANALYTICS_MEASUREMENT_ID</code> on the backend.
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Google Analytics 4 — Measurement ID
                </label>
                <input
                  type="text"
                  value={googleAnalyticsMeasurementId}
                  onChange={e => setGoogleAnalyticsMeasurementId(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  disabled={googleAnalyticsFromEnv}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'Geist Mono, monospace',
                    opacity: googleAnalyticsFromEnv ? 0.6 : 1,
                  }}
                />
                <a
                  href="https://support.google.com/analytics/answer/9304153"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--accent-light)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  Find your Measurement ID <ExternalLink size={12} />
                </a>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Google Search Console — HTML tag verification (meta content)
                </label>
                <input
                  type="text"
                  value={googleSearchConsoleVerification}
                  onChange={e => setGoogleSearchConsoleVerification(e.target.value)}
                  placeholder="Paste the content value only (not the full meta tag)"
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
                <a
                  href="https://support.google.com/webmasters/answer/9008080"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--accent-light)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  Verify ownership (HTML tag) <ExternalLink size={12} />
                </a>
              </div>

              {googleAdsenseFromEnv && (
                <div
                  style={{
                    padding: 12,
                    marginBottom: 14,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  <strong style={{ color: 'var(--text)' }}>AdSense</strong> publisher ID is overridden by{' '}
                  <code style={{ fontSize: 11 }}>GOOGLE_ADSENSE_PUBLISHER_ID</code> on the backend.
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Google AdSense — Publisher ID
                </label>
                <input
                  type="text"
                  value={googleAdsensePublisherId}
                  onChange={e => setGoogleAdsensePublisherId(e.target.value)}
                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                  disabled={googleAdsenseFromEnv}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'Geist Mono, monospace',
                    opacity: googleAdsenseFromEnv ? 0.6 : 1,
                  }}
                />
                <a
                  href="https://support.google.com/adsense/answer/105516"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--accent-light)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  AdSense account information <ExternalLink size={12} />
                </a>
              </div>

              <div style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Taboola — publisher / account ID
                </label>
                <input
                  type="text"
                  value={taboolaPublisherId}
                  onChange={e => setTaboolaPublisherId(e.target.value)}
                  placeholder="Publisher name or ID from your Taboola placement script"
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
                <a
                  href="https://help.taboola.com/hc/en-us/articles/360007878458-Getting-Started-with-Taboola-Code"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--accent-light)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  Taboola implementation <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </>
        )}

        {settingsTab === 'approval' && (
          <>
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
            Auto-Approve Engine
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Enable auto-approve</label>
              <button
                type="button"
                onClick={() => setAutoApprove(prev => ({ ...prev, enabled: !prev.enabled }))}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: autoApprove.enabled ? 'var(--accent)' : 'var(--border)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: autoApprove.enabled ? 22 : 2,
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
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Minimum score threshold — Current: {autoApprove.threshold}/100
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={autoApprove.threshold}
              onChange={e => setAutoApprove(prev => ({ ...prev, threshold: parseInt(e.target.value, 10) }))}
              style={{ width: '100%', maxWidth: 280 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Trusted sources (comma-separated)
            </label>
            <input
              type="text"
              value={autoApprove.trustedSources.join(', ')}
              onChange={e => setAutoApprove(prev => ({
                ...prev,
                trustedSources: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
              }))}
              placeholder="TOI, NDTV, ANI, ..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 12,
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Blocked keywords (comma-separated)
            </label>
            <input
              type="text"
              value={autoApprove.blockedKeywords.join(', ')}
              onChange={e => setAutoApprove(prev => ({
                ...prev,
                blockedKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
              }))}
              placeholder="death, riot, violence, ..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 12,
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Publish delay after auto-approve
            </label>
            <select
              value={autoApprove.publishDelay}
              onChange={e => setAutoApprove(prev => ({ ...prev, publishDelay: parseInt(e.target.value, 10) }))}
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
              <option value={0}>Immediately</option>
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
            </select>
          </div>
          <div style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Notify editor on rejection</label>
              <button
                type="button"
                onClick={() => setAutoApprove(prev => ({ ...prev, notifyOnReject: !prev.notifyOnReject }))}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: autoApprove.notifyOnReject ? 'var(--accent)' : 'var(--border)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: autoApprove.notifyOnReject ? 22 : 2,
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
            type="button"
            onClick={async () => {
              setSavingAutoApprove(true)
              try {
                await approvalApi.autoApproveSettings.save(autoApprove)
                toast.success('Auto-approve settings saved')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to save')
              } finally {
                setSavingAutoApprove(false)
              }
            }}
            disabled={savingAutoApprove}
            style={{
              marginTop: 16,
              padding: '10px 18px',
              background: savingAutoApprove ? 'var(--surface)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: savingAutoApprove ? 'not-allowed' : 'pointer',
            }}
          >
            {savingAutoApprove ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : 'Save Auto-Approve'}
          </button>
        </div>
          </>
        )}

        {(settingsTab === 'ai' || settingsTab === 'other' || settingsTab === 'analytics') && (
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
        )}

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
