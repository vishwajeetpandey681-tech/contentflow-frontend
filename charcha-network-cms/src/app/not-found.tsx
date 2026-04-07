import Link from 'next/link'

export default function NotFound() {
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
        404 — Page not found
      </h2>
      <Link
        href="/scraper/inbox/"
        style={{
          padding: '8px 16px',
          fontSize: 12,
          fontWeight: 600,
          background: 'var(--accent-glow)',
          color: 'var(--accent-light)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 8,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        Back to Inbox
      </Link>
    </div>
  )
}
