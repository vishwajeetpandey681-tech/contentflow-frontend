'use client'

import { RotateCcw, RotateCw } from 'lucide-react'
import type { RewritePass } from '@/types/article'

interface RewritePassCardProps {
  pass: RewritePass
  passNumber: number
  selected: boolean
  onToggleSelect: () => void
  onOutputChange: (value: string) => void
  onRerun: () => void
  onReset: () => void
}

export function RewritePassCard({
  pass,
  passNumber,
  selected,
  onToggleSelect,
  onOutputChange,
  onRerun,
  onReset,
}: RewritePassCardProps) {
  const isRunning = pass.status === 'RUNNING'
  const isIdle = pass.status === 'IDLE'
  const isDone = pass.status === 'DONE'
  const isFailed = pass.status === 'FAILED'
  const collapsed = isIdle
  const showTextarea = !isIdle
  const charCount = pass.output.length
  const limit = pass.charLimit
  const nearLimit = limit && charCount >= limit * 0.9
  const overLimit = limit && charCount > limit

  const borderColor = isRunning
    ? 'var(--warning)'
    : isFailed
      ? 'var(--red)'
      : selected
        ? 'var(--accent-light)'
        : 'var(--border)'

  return (
    <div
      style={{
        padding: collapsed ? 12 : 14,
        background: 'var(--card)',
        border: '1px solid',
        borderColor,
        borderRadius: 10,
        opacity: isIdle ? 0.5 : 1,
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          disabled={isRunning || isIdle}
          style={{
            marginTop: 4,
            accentColor: 'var(--accent)',
            cursor: isRunning || isIdle ? 'not-allowed' : 'pointer',
          }}
        />
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: selected ? 'var(--accent-glow)' : 'var(--surface)',
            border: `1px solid ${selected ? 'var(--accent-light)' : 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {passNumber}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{pass.label}</span>
            {isRunning && (
              <>
                <span style={{ fontSize: 11, color: 'var(--warning)' }}>running…</span>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--warning)',
                    animation: 'shimmer 1s ease-in-out infinite',
                  }}
                />
              </>
            )}
            {isIdle && (
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>queued</span>
            )}
            {isDone && (
              <span style={{ fontSize: 11, color: 'var(--green)' }}>done</span>
            )}
            {isFailed && (
              <span style={{ fontSize: 11, color: 'var(--red)' }}>failed</span>
            )}
            {isDone && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--green)',
                }}
              />
            )}
            {isFailed && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--red)',
                }}
              />
            )}
            {isIdle && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--text-dim)',
                }}
              />
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{pass.description}</div>
          {showTextarea && (
            <>
              <textarea
                value={pass.output}
                onChange={e => onOutputChange(e.target.value)}
                disabled={isRunning || isIdle}
                placeholder={isRunning ? 'Generating…' : isFailed ? 'Rewrite failed' : ''}
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 10,
                  fontSize: 12,
                  color: 'var(--text)',
                  background: 'var(--surface)',
                  border: '1px solid',
                  borderColor: isRunning ? 'var(--warning)' : 'var(--border)',
                  borderRadius: 8,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              {(limit !== undefined || isDone) && (
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color: overLimit ? 'var(--red)' : nearLimit ? 'var(--warning)' : 'var(--text-muted)',
                  }}
                >
                  {limit !== undefined ? `${charCount} / ${limit}` : `${charCount} chars`}
                </div>
              )}
              {!isRunning && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={onRerun}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      fontSize: 11,
                      background: 'var(--surface)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCw size={12} />
                    Re-run
                  </button>
                  {!isFailed && (
                    <button
                      onClick={onReset}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        fontSize: 11,
                        background: 'var(--surface)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={12} />
                      Reset
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
