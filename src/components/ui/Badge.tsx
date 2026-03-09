'use client'

import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'dim'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  style?: React.CSSProperties
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: 'var(--card)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
  },
  success: {
    background: 'var(--green-bg)',
    color: 'var(--green)',
    border: '1px solid rgba(34,197,94,0.3)',
  },
  warning: {
    background: 'var(--amber-bg)',
    color: 'var(--amber)',
    border: '1px solid rgba(245,158,11,0.3)',
  },
  error: {
    background: 'var(--red-bg)',
    color: 'var(--red)',
    border: '1px solid rgba(239,68,68,0.3)',
  },
  dim: {
    background: 'transparent',
    color: 'var(--text-dim)',
    border: '1px solid var(--border)',
  },
}

export function Badge({ children, variant = 'default', className, style }: BadgeProps) {
  return (
    <span
      className={cn(className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: 'Geist Mono, monospace',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}
