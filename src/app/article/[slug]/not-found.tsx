import Link from 'next/link'

export default function ArticleNotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        gap: 12,
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>Article not found</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360 }}>
        This story is not published on the site yet, or the link is wrong. Ensure contentflow-backend is running and the slug matches a published article.
      </p>
      <Link href="/" style={{ fontSize: 13, color: 'var(--accent-light)' }}>
        ← Home
      </Link>
    </div>
  )
}
