'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X, AlertCircle, Server, Database, Sparkles, Globe } from 'lucide-react'
import { healthApi, type BackendStatusServices } from '@/lib/api'

const POLL_INTERVAL_MS = 30_000

export function BackendStatus() {
  const [status, setStatus] = useState<BackendStatusServices | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const fetchStatus = async () => {
    try {
      const res = await healthApi.status()
      const data = res.data
      if (data?.ok && data.services) {
        setStatus(data.services)
        setError(null)
      } else {
        setStatus(null)
        setError(data?.error || 'Unknown error')
      }
    } catch (err) {
      setStatus(null)
      setError(err instanceof Error ? err.message : 'Backend unreachable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const isDown = !!error || !status?.api?.ok
  const allOk = status && status.api.ok && status.data.ok && status.openai.configured && status.wordpress.configured
  const someOk = status && (status.api.ok || status.data.ok)

  const dotColor = loading
    ? 'var(--text-dim)'
    : isDown
      ? 'var(--red)'
      : allOk
        ? 'var(--green)'
        : 'var(--amber)'

  const items = status
    ? [
        { key: 'api', label: 'API', ...status.api, icon: Server },
        { key: 'data', label: 'Data', ...status.data, icon: Database },
        { key: 'openai', label: 'OpenAI', ...status.openai, icon: Sparkles },
        { key: 'wordpress', label: 'WordPress', ...status.wordpress, icon: Globe },
      ]
    : []

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '5px 10px',
          fontSize: 11,
          color: 'var(--text-dim)',
          flexShrink: 0,
          cursor: 'pointer',
        }}
        title={error || 'Backend status'}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: dotColor,
            boxShadow: `0 0 0 2px ${dotColor}22`,
            flexShrink: 0,
            display: 'inline-block',
            animation: loading ? 'none' : 'breathe 2.5s ease-in-out infinite',
          }}
        />
        <span className="hidden font-mono text-[10px] lg:inline" style={{ color: 'var(--text-muted)' }}>
          {loading ? '…' : error ? 'Down' : allOk ? 'All systems' : 'Status'}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            minWidth: 220,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.5px',
              color: 'var(--text-dim)',
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            Backend status
          </div>
          {error ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                background: 'var(--red-bg)',
                borderRadius: 6,
                color: 'var(--red)',
                fontSize: 12,
              }}
            >
              <X size={14} />
              {error}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(({ key, label, ok, message, icon: Icon }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  {ok ? (
                    <Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                  ) : (
                    <AlertCircle size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                  )}
                  <Icon size={12} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text)' }}>{label}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 'auto' }}>
                    {message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
