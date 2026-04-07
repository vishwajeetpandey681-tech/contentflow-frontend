'use client'

import { Cpu, Sparkles } from 'lucide-react'
import type { ArticleRewrite, RewritePass } from '@/types/article'

function formatTokens(n: number) {
  return n.toLocaleString()
}

export function RewriteAiUsagePanel({ rewrite, passes }: { rewrite: ArticleRewrite | undefined; passes: RewritePass[] }) {
  const setting = rewrite?.rewriteProviderSetting
  const modeLabel =
    setting === 'openai_only' ? 'ChatGPT only (OpenAI)' : 'Ollama first, then ChatGPT fallback'
  const ollamaModel = rewrite?.ollamaModelLabel || '—'
  const openaiModel = rewrite?.openaiModelLabel || '—'

  const totals = rewrite?.usageTotals
  const o = totals?.ollama
  const c = totals?.openai
  const hasTotals = o && c && (o.requests > 0 || c.requests > 0 || o.totalTokens > 0 || c.totalTokens > 0)

  const passRows = (passes || []).filter(p => p.aiProvider && (p.status === 'DONE' || p.status === 'RUNNING'))

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>
        AI rewrite
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.45, marginBottom: 10 }}>
        {modeLabel}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={12} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
          <span>
            Ollama model: <span style={{ fontFamily: 'Geist Mono, monospace', color: 'var(--text)' }}>{ollamaModel}</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={12} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
          <span>
            OpenAI (ChatGPT) model: <span style={{ fontFamily: 'Geist Mono, monospace', color: 'var(--text)' }}>{openaiModel}</span>
          </span>
        </div>
      </div>

      {hasTotals ? (
        <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-muted)' }}>Token use (this article)</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <div
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--accent-light)' }}>Ollama</span>
              {o.requests > 0 ? (
                <>
                  {' '}
                  · {formatTokens(o.promptTokens)} in + {formatTokens(o.completionTokens)} out ={' '}
                  <strong style={{ color: 'var(--text)' }}>{formatTokens(o.totalTokens)}</strong> total
                  <span style={{ color: 'var(--text-dim)' }}> ({o.requests} call{o.requests === 1 ? '' : 's'})</span>
                </>
              ) : (
                <span style={{ color: 'var(--text-dim)' }}> — no calls (or usage not reported)</span>
              )}
            </div>
            <div
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--cyan)' }}>ChatGPT / OpenAI</span>
              {c.requests > 0 ? (
                <>
                  {' '}
                  · {formatTokens(c.promptTokens)} in + {formatTokens(c.completionTokens)} out ={' '}
                  <strong style={{ color: 'var(--text)' }}>{formatTokens(c.totalTokens)}</strong> total
                  <span style={{ color: 'var(--text-dim)' }}> ({c.requests} call{c.requests === 1 ? '' : 's'})</span>
                </>
              ) : (
                <span style={{ color: 'var(--text-dim)' }}> — no calls (or usage not reported)</span>
              )}
            </div>
          </div>
        </div>
      ) : passRows.length === 0 ? (
        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>
          Run a rewrite to see token counts. Ollama must return usage in the API response (OpenAI-compatible).
        </div>
      ) : null}

      {passRows.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Per pass</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {passRows.map(p => (
              <div key={p.id} style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{p.label}</span>
                <span style={{ fontFamily: 'Geist Mono, monospace', color: 'var(--text-muted)', textAlign: 'right' }}>
                  {p.aiProvider === 'ollama' ? 'Ollama' : 'OpenAI'}
                  {p.aiModel ? ` · ${p.aiModel}` : ''}
                  {p.tokenUsage
                    ? ` · ${formatTokens(p.tokenUsage.totalTokens)} tok`
                    : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
