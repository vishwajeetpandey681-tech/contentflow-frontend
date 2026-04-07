'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cmsWebsiteCmsArticlesApi } from '@/lib/cms-api'
import type { CmsWebsiteArticle } from '@/lib/api'

export default function CmsDraftsPage() {
  const [articles, setArticles] = useState<CmsWebsiteArticle[]>([])
  useEffect(() => {
    cmsWebsiteCmsArticlesApi
      .list({ status: 'draft' })
      .then(d => setArticles(d.articles || []))
      .catch(() => setArticles([]))
  }, [])
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800 }}>Drafts</h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>{articles.length} drafts</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {articles.map(a => (
          <li key={a.id} style={{ marginBottom: 8 }}>
            <Link href={`/cms/articles/${a.id}/edit/`} style={{ color: '#fda4af' }}>
              {a.seoTitle || a.title || a.slug}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
