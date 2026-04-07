'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cmsWebsiteCmsArticlesApi } from '@/lib/cms-api'
import type { CmsWebsiteArticle } from '@/lib/api'

export default function CmsArticlesPage() {
  const [articles, setArticles] = useState<CmsWebsiteArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cmsWebsiteCmsArticlesApi
      .list()
      .then(d => setArticles(d.articles || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800 }}>All articles</h1>
        <Link
          href="/cms/articles/new/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px',
            borderRadius: 6, background: '#cc0000', color: 'white',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          + New article
        </Link>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>{loading ? 'Loading…' : `${articles.length} items`}</p>
      <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        {articles.length === 0 && !loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>No articles yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(204,0,0,0.12)', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Title</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Category</th>
                <th style={{ padding: 12 }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(a => (
                <tr key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: 12 }}>
                    <Link href={`/cms/articles/${a.id}/edit/`} style={{ color: '#fda4af', textDecoration: 'none' }}>
                      {a.seoTitle || a.title || a.slug}
                    </Link>
                  </td>
                  <td style={{ padding: 12, textTransform: 'capitalize' }}>{a.status || '—'}</td>
                  <td style={{ padding: 12 }}>{a.category || '—'}</td>
                  <td style={{ padding: 12, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                    {a.updatedAt ? new Date(a.updatedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
