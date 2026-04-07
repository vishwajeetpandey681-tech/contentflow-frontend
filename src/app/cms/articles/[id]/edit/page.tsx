'use client'

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { cmsWebsiteCmsArticlesApi } from '@/lib/cms-api'
import type { CmsWebsiteArticle } from '@/lib/api'
import { getArticleUrl } from '@/lib/config'

function bodyHtml(a: CmsWebsiteArticle) {
  return a.content ?? a.body ?? ''
}

function metaDesc(a: CmsWebsiteArticle) {
  return a.seoDescription ?? a.metaDescription ?? ''
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 6,
}

const inputStyle: CSSProperties = {
  width: '100%',
  maxWidth: 720,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.92)',
  fontSize: 14,
  boxSizing: 'border-box',
}

const textareaHtmlStyle: CSSProperties = {
  ...inputStyle,
  maxWidth: '100%',
  minHeight: 320,
  resize: 'vertical',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 13,
  lineHeight: 1.45,
}

export default function CmsEditArticlePage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [html, setHtml] = useState('')
  const [category, setCategory] = useState('')
  const [language, setLanguage] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')

  const hydrate = useCallback((a: CmsWebsiteArticle) => {
    setTitle(a.title ?? '')
    setSlug(a.slug ?? '')
    setSeoTitle(a.seoTitle ?? '')
    setMetaDescription(metaDesc(a))
    setHtml(bodyHtml(a))
    setCategory(a.category ?? '')
    setLanguage(a.language ?? '')
    setFeaturedImage(a.featuredImage ?? '')
  }, [])

  useEffect(() => {
    if (!id) {
      const msg = 'Missing article id'
      setLoadError(msg)
      setLoading(false)
      toast.error(msg)
      return
    }
    setLoading(true)
    setLoadError(null)
    cmsWebsiteCmsArticlesApi
      .get(id)
      .then(hydrate)
      .catch(e => {
        const msg = e instanceof Error ? e.message : 'Failed to load article'
        setLoadError(msg)
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }, [id, hydrate])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || saving) return
    setSaving(true)
    const metaTrimmed = metaDescription.trim()
    try {
      const updated = await cmsWebsiteCmsArticlesApi.update(id, {
        title: title.trim(),
        slug: slug.trim(),
        seoTitle: seoTitle.trim(),
        seoDescription: metaTrimmed,
        metaDescription: metaTrimmed,
        content: html,
        body: html,
        category: category.trim(),
        language: language.trim(),
        featuredImage: featuredImage.trim(),
      })
      hydrate(updated)
      toast.success('Article saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const slugTrimmed = slug.trim()
  const viewUrl = slugTrimmed ? getArticleUrl(slugTrimmed) : ''

  return (
    <div style={{ padding: 28, maxWidth: 960 }}>
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Link href="/cms/articles/" style={{ fontSize: 13, color: '#fda4af', textDecoration: 'none' }}>
          ← All articles
        </Link>
        {viewUrl ? (
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              color: '#fda4af',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>View on site</span>
            <ExternalLink size={14} aria-hidden />
          </a>
        ) : null}
      </div>

      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Edit article</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
        <code style={{ color: 'rgba(255,255,255,0.5)' }}>{id}</code>
        {slugTrimmed ? (
          <>
            {' '}
            · slug: <code style={{ color: 'rgba(255,255,255,0.5)' }}>{slugTrimmed}</code>
          </>
        ) : null}
      </p>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.45)' }}>Loading…</p>
      ) : loadError ? (
        <p style={{ color: '#fca5a5' }}>{loadError}</p>
      ) : (
        <form onSubmit={onSave}>
          <section style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 14,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Content
            </h2>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Slug</label>
              <input style={inputStyle} value={slug} onChange={e => setSlug(e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>HTML</label>
              <textarea style={textareaHtmlStyle} value={html} onChange={e => setHtml(e.target.value)} spellCheck={false} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <input style={{ ...inputStyle, maxWidth: '100%' }} value={category} onChange={e => setCategory(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Language</label>
                <input style={{ ...inputStyle, maxWidth: '100%' }} value={language} onChange={e => setLanguage(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Featured image URL</label>
              <input
                style={{ ...inputStyle, maxWidth: '100%' }}
                value={featuredImage}
                onChange={e => setFeaturedImage(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </section>

          <section style={{ marginBottom: 28, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <h2
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 14,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              SEO
            </h2>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>SEO title</label>
              <input style={inputStyle} value={seoTitle} onChange={e => setSeoTitle(e.target.value)} />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{seoTitle.length} characters</p>
            </div>
            <div>
              <label style={labelStyle}>Meta description</label>
              <textarea
                style={{ ...inputStyle, maxWidth: '100%', minHeight: 88, resize: 'vertical', fontFamily: 'inherit' }}
                value={metaDescription}
                onChange={e => setMetaDescription(e.target.value)}
              />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{metaDescription.length} characters</p>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: saving ? 'rgba(204,0,0,0.35)' : '#cc0000',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}
    </div>
  )
}
