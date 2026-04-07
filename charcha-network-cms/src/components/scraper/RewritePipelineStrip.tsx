'use client'

import type { RewritePass } from '@/types/article'

interface RewritePipelineStripProps {
  passes: RewritePass[]
}

const LABELS: Record<string, string> = {
  full: 'Full',
  shortnews: 'Short',
  char120: '120c',
  char65: '65c',
  keywords: 'Keys',
}

export function RewritePipelineStrip({ passes }: RewritePipelineStripProps) {
  return (
    <div
      className="flex shrink-0 gap-2 overflow-x-auto p-2.5 md:p-4"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        scrollbarWidth: 'none',
      }}
    >
      {passes.map(pass => {
        const isDone = pass.status === 'DONE'
        const isRunning = pass.status === 'RUNNING'
        const isQueued = pass.status === 'IDLE' || pass.status === 'FAILED'
        return (
          <div
            key={pass.id}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: isDone ? 'var(--green-bg)' : isRunning ? 'var(--accent-glow)' : 'var(--card)',
              color: isDone ? 'var(--green)' : isRunning ? 'var(--accent-light)' : 'var(--text-muted)',
              border: `1px solid ${isDone ? 'var(--green)' : isRunning ? 'var(--accent-light)' : 'var(--border)'}`,
              animation: isRunning ? 'shimmer 1s ease-in-out infinite' : undefined,
            }}
          >
            {LABELS[pass.id] ?? pass.id}
          </div>
        )
      })}
    </div>
  )
}
