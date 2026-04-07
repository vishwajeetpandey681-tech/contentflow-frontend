'use client'

interface SpinnerProps {
  size?: number
  style?: React.CSSProperties
}

export function Spinner({ size = 24, style }: SpinnerProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
        ...style,
      }}
    />
  )
}
