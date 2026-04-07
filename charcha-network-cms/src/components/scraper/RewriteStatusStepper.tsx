'use client'

import { Check, Circle } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import type { ScraperArticle, RewritePass } from '@/types/article'

interface RewriteStatusStepperProps {
  article: ScraperArticle
  runningPassIndex?: number
  passes?: RewritePass[]
}

export function RewriteStatusStepper({ article, runningPassIndex = 0, passes }: RewriteStatusStepperProps) {
  const status = article.status
  const hasPasses = passes && passes.length > 0
  const rewriteStatus = article.rewriteStatus || 'IDLE'
  const isApproved = status === 'APPROVED' || status === 'EXPORTED'
  const isRunning = hasPasses ? passes.some(p => p.status === 'RUNNING') : (rewriteStatus === 'RUNNING')
  const isDone = hasPasses ? passes.every(p => p.status === 'DONE') : (rewriteStatus === 'DONE')
  const isPublished = !!article.wpPostId

  const scrapedSublabel = [article.source?.name, timeAgo(article.publishedAt || article.createdAt)].filter(Boolean).join(' · ')
  const approvedSublabel = isApproved ? 'By editor' : ''
  const rewritingSublabel = isRunning ? `Pass ${runningPassIndex + 1} of 5` : ''
  const reviewSublabel = isDone ? 'Edit all 5 outputs' : ''
  const publishSublabel = isPublished ? `WP #${article.wpPostId}` : isDone ? 'Ready to publish' : ''

  const steps = [
    { label: 'Pulled', sublabel: scrapedSublabel, done: true },
    { label: 'Approved', sublabel: approvedSublabel, done: isApproved },
    { label: 'AI Rewriting', sublabel: rewritingSublabel, done: isDone, active: isRunning },
    { label: 'Review & Edit', sublabel: reviewSublabel, done: isDone, active: isDone && !isPublished },
    { label: 'Publish to WP', sublabel: publishSublabel, done: isPublished },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: step.done ? 'var(--green)' : step.active ? 'var(--warning)' : 'var(--surface)',
              border: `1px solid ${step.done ? 'var(--green)' : step.active ? 'var(--warning)' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {step.done ? <Check size={14} style={{ color: 'var(--bg)' }} /> : <Circle size={12} style={{ color: step.active ? 'var(--warning)' : 'var(--text-dim)' }} />}
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: step.done ? 'var(--green)' : step.active ? 'var(--warning)' : 'var(--text-muted)',
              }}
            >
              {step.label}
            </div>
            {step.sublabel && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{step.sublabel}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
