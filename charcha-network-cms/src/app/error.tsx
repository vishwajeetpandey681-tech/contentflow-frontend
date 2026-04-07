'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
        Something went wrong
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        {error.message}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '8px 16px',
          fontSize: 12,
          fontWeight: 600,
          background: 'var(--accent-glow)',
          color: 'var(--accent-light)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}
