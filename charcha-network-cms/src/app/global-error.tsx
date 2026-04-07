'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <html lang="en">
      <body style={{ background: '#0f0f11', color: '#fafafa', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#71717a', marginBottom: 24 }}>
            {error.message}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              background: 'rgba(124,58,237,0.2)',
              color: '#8b5cf6',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
