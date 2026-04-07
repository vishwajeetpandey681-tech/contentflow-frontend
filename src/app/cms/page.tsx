'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cmsApi } from '@/lib/api'

export default function CmsDashboardPage() {
  const [total, setTotal] = useState<number | null>(null)
  const [drafts, setDrafts] = useState(0)
  const [published, setPublished] = useState(0)

  useEffect(() => {
    Promise.all([
      cmsApi.listArticles(),
      cmsApi.listArticles({ status: 'draft' }),
      cmsApi.listArticles({ status: 'published' }),
    ])
      .then(([all, d, p]) => {
        setTotal(all.total)
        setDrafts(d.total)
        setPublished(p.total)
      })
      .catch(() => {
        setTotal(0)
      })
  }, [])

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>Charcha — overview</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        <Link
          href="/cms/inbox/"
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            background: 'rgba(204,0,0,0.18)',
            border: '1px solid rgba(255,107,0,0.35)',
            textDecoration: 'none',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Editorial inbox →
        </Link>
        <Link
          href="/cms/trends/"
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Google Trends →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {[
          { label: 'All articles', value: total ?? '—', href: '/cms/articles' },
          { label: 'Published', value: published, href: '/cms/articles' },
          { label: 'Drafts', value: drafts, href: '/cms/drafts' },
        ].map(card => (
          <Link
            key={card.label}
            href={card.href}
            style={{
              padding: 20,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(204,0,0,0.15)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{card.value}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
