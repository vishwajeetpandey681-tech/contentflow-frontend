'use client'

import { useMemo } from 'react'
import * as Diff from 'diff'

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

interface DiffViewProps {
  original: string
  rewritten: string
  /** 'words' | 'sentences' - sentences splits by . ! ? */
  mode?: 'words' | 'sentences'
  className?: string
  style?: React.CSSProperties
}

export function DiffView({ original, rewritten, mode = 'sentences', className, style }: DiffViewProps) {
  const chunks = useMemo(() => {
    const a = stripHtml(original)
    const b = stripHtml(rewritten)
    if (!a && !b) return []
    if (mode === 'sentences') {
      const split = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean)
      const aParts = split(a)
      const bParts = split(b)
      return Diff.diffArrays(aParts, bParts)
    }
    return Diff.diffWords(a, b)
  }, [original, rewritten, mode])

  return (
    <div
      className={className}
      style={{
        fontSize: 13,
        lineHeight: 1.6,
        fontFamily: 'inherit',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        padding: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        ...style,
      }}
    >
      {chunks.map((part, i) => {
        if (part.added) {
          return (
            <span
              key={i}
              style={{
                background: 'rgba(34, 197, 94, 0.25)',
                color: 'var(--text)',
                textDecoration: 'underline',
                textDecorationColor: 'rgba(34, 197, 94, 0.6)',
              }}
            >
              {Array.isArray(part.value) ? part.value.join(' ') : part.value}
            </span>
          )
        }
        if (part.removed) {
          return (
            <span
              key={i}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: 'var(--text-dim)',
                textDecoration: 'line-through',
              }}
            >
              {Array.isArray(part.value) ? part.value.join(' ') : part.value}
            </span>
          )
        }
        return (
          <span key={i} style={{ color: 'var(--text)' }}>
            {Array.isArray(part.value) ? part.value.join(' ') : part.value}
          </span>
        )
      })}
    </div>
  )
}
