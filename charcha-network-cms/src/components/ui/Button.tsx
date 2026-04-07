'use client'

import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontWeight: 500,
    borderRadius: 8,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    border: '1px solid transparent',
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--accent)',
      color: '#fff',
      borderColor: 'var(--accent)',
    },
    secondary: {
      background: 'var(--card)',
      color: 'var(--text)',
      borderColor: 'var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-muted)',
    },
    danger: {
      background: 'var(--red-bg)',
      color: 'var(--red)',
      borderColor: 'rgba(239,68,68,0.3)',
    },
  }

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '4px 10px', fontSize: 11 },
    md: { padding: '6px 14px', fontSize: 12 },
    lg: { padding: '10px 18px', fontSize: 13 },
  }

  const hoverStyles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent-light)' },
    secondary: { background: 'var(--card-hover)' },
    ghost: { background: 'var(--card)' },
    danger: { background: 'rgba(239,68,68,0.15)' },
  }

  return (
    <button
      className={cn(className)}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...sizeStyles[size],
        opacity: disabled || loading ? 0.6 : 1,
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  )
}
