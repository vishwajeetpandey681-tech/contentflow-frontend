import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getApiBaseForServer } from '@/lib/server-api-base'

export const dynamic = 'force-dynamic'

type WebsiteArticle = {
  id: string
  slug: string
  title: string
  seoTitle?: string
  content?: string
  excerpt?: string
  featuredImage?: string | null
  category?: string
  publishedAt?: string
  source?: string
}

function apiArticlesUrl(slug: string) {
  return `${getApiBaseForServer()}/website/articles/${encodeURIComponent(slug)}`
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug || '')
  try {
    const res = await fetch(apiArticlesUrl(slug), { next: { revalidate: 120 } })
    if (!res.ok) return { title: 'Article' }
    const article = (await res.json()) as WebsiteArticle
    return {
      title: article.seoTitle || article.title || 'Article',
      description: article.excerpt?.slice(0, 160) || undefined,
    }
  } catch {
    return { title: 'Article' }
  }
}

export default async function PublicArticlePage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug || '')
  if (!slug) notFound()

  let article: WebsiteArticle
  try {
    const res = await fetch(apiArticlesUrl(slug), { next: { revalidate: 60 } })
    if (!res.ok) notFound()
    article = (await res.json()) as WebsiteArticle
  } catch {
    notFound()
  }

  const title = article.seoTitle || article.title || 'Article'
  const img = article.featuredImage && article.featuredImage.startsWith('http') ? article.featuredImage : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '12px 20px',
          background: 'var(--surface)',
        }}
      >
        <Link href="/" style={{ fontSize: 13, color: 'var(--accent-light)', textDecoration: 'none' }}>
          ← Home
        </Link>
      </header>
      <article style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 48px' }}>
        {article.category && (
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              marginBottom: 8,
            }}
          >
            {article.category}
          </div>
        )}
        <h1 style={{ fontSize: 'clamp(1.35rem, 4vw, 1.85rem)', fontWeight: 700, lineHeight: 1.25, marginBottom: 16 }}>
          {title}
        </h1>
        {(article.publishedAt || article.source) && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20 }}>
            {article.publishedAt && <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleString()}</time>}
            {article.publishedAt && article.source ? ' · ' : null}
            {article.source}
          </div>
        )}
        {img && (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10', marginBottom: 24, borderRadius: 8, overflow: 'hidden' }}>
            <Image src={img} alt={title} fill sizes="(max-width: 720px) 100vw, 720px" style={{ objectFit: 'cover' }} priority />
          </div>
        )}
        {article.content ? (
          <div className="article-html-content rich-text-content" dangerouslySetInnerHTML={{ __html: article.content }} />
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>{article.excerpt || 'No content.'}</p>
        )}
      </article>
    </div>
  )
}
