'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ExternalLink, Save, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { cmsWebsiteCmsArticlesApi } from '@/lib/cms-api'
import type { CmsWebsiteArticle } from '@/lib/api'
import { getArticleUrl } from '@/lib/config'
import dynamic from 'next/dynamic'

const RichEditor = dynamic(() => import('@/components/editor/RichEditor').then(m => m.RichEditor), {
  ssr: false,
  loading: () => (
    <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      Loading editor…
    </div>
  ),
})

function metaDesc(a: CmsWebsiteArticle) {
  return a.seoDescription ?? a.metaDescription ?? ''
}

function SidebarSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: 'none',
          color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: 12,
          letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ padding: '14px 14px 16px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'rgba(255,255,255,0.45)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em',
}

const fieldInput: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.88)', fontSize: 13, boxSizing: 'border-box',
  outline: 'none',
}

const CATEGORIES = ['Politics', 'Business', 'Sports', 'Technology', 'Entertainment', 'World', 'Health', 'Education', 'Lifestyle', 'Science', 'Other']
const LANGUAGES = [{ value: 'english', label: 'English' }, { value: 'hindi', label: 'Hindi' }]
const STATUSES = [{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' }]

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 80)
}

export default function CmsEditArticlePage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [focusKeyword, setFocusKeyword] = useState('')
  const [html, setHtml] = useState('')
  const [category, setCategory] = useState('')
  const [language, setLanguage] = useState('english')
  const [featuredImage, setFeaturedImage] = useState('')
  const [status, setStatus] = useState('published')
  const [tags, setTags] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [ogTitle, setOgTitle] = useState('')
  const [ogDescription, setOgDescription] = useState('')

  const hydrate = useCallback((a: CmsWebsiteArticle) => {
    setTitle(a.title ?? '')
    setSlug(a.slug ?? '')
    setSeoTitle(a.seoTitle ?? '')
    setMetaDescription(metaDesc(a))
    setFocusKeyword((a as unknown as Record<string, string>).focusKeyword ?? '')
    setHtml(a.content ?? a.body ?? '')
    setCategory(a.category ?? '')
    setLanguage(a.language ?? 'english')
    setFeaturedImage(a.featuredImage ?? '')
    setStatus(a.status ?? 'published')
    setTags(Array.isArray((a as unknown as Record<string, unknown>).tags) ? ((a as unknown as Record<string, string[]>).tags).join(', ') : '')
    setExcerpt((a as unknown as Record<string, string>).excerpt ?? '')
    setOgTitle((a as unknown as Record<string, string>).ogTitle ?? '')
    setOgDescription((a as unknown as Record<string, string>).ogDescription ?? '')
  }, [])

  useEffect(() => {
    if (!id) { setLoadError('Missing article id'); setLoading(false); return }
    setLoading(true)
    cmsWebsiteCmsArticlesApi.get(id)
      .then(hydrate)
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Failed to load article'))
      .finally(() => setLoading(false))
  }, [id, hydrate])

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slugManuallyEdited) setSlug(slugify(value))
    if (!seoTitle) setSeoTitle(value)
  }

  const onSave = async (e?: FormEvent) => {
    e?.preventDefault()
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
        status,
      } as Parameters<typeof cmsWebsiteCmsArticlesApi.update>[1])
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
  const seoTitleLen = seoTitle.length
  const metaLen = metaDescription.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)', flexWrap: 'wrap', flexShrink: 0,
      }}>
        <Link href="/cms/articles/" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
          ← All articles
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title || 'Edit article'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {viewUrl && (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', fontSize: 12, textDecoration: 'none', background: 'transparent' }}
            >
              <Eye size={13} />
              Preview
              <ExternalLink size={12} />
            </a>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 18px', borderRadius: 6, border: 'none',
              background: saving ? 'rgba(204,0,0,0.4)' : '#cc0000',
              color: 'white', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
            }}
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>Loading article…</div>
      ) : loadError ? (
        <div style={{ padding: 40, color: '#fca5a5' }}>{loadError}</div>
      ) : (
        <form onSubmit={onSave} style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Main editor area */}
          <div style={{ padding: '28px 32px', borderRight: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', height: '100%' }}>
            {/* Title */}
            <input
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Enter article title…"
              style={{
                width: '100%', background: 'transparent', border: 'none',
                borderBottom: '2px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.95)', fontSize: 28, fontWeight: 700,
                padding: '8px 0 12px', marginBottom: 12,
                fontFamily: 'Syne, sans-serif', outline: 'none', boxSizing: 'border-box',
              }}
            />

            {/* Slug row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>Permalink:</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>…/article/</span>
              <input
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugManuallyEdited(true) }}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4, color: 'rgba(255,255,255,0.7)', fontSize: 12, padding: '3px 8px',
                  outline: 'none', minWidth: 200,
                }}
              />
            </div>

            {/* Excerpt */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ ...fieldLabel, textTransform: 'none', letterSpacing: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                Excerpt (shown in previews & cards)
              </label>
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                placeholder="Brief description of this article…"
                rows={2}
                style={{ ...fieldInput, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {/* Rich text editor */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ ...fieldLabel, textTransform: 'none', letterSpacing: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                Content
              </label>
              <RichEditor value={html} onChange={setHtml} />
            </div>

            {/* SEO section (below editor) */}
            <div style={{ marginTop: 32, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>🔍</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>SEO Settings</span>
              </div>
              <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Focus Keyword</label>
                  <input
                    value={focusKeyword}
                    onChange={e => setFocusKeyword(e.target.value)}
                    placeholder="Main keyword for this article"
                    style={fieldInput}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>
                    SEO Title
                    <span style={{ fontWeight: 400, color: seoTitleLen > 60 ? '#f87171' : seoTitleLen > 50 ? '#fbbf24' : 'rgba(255,255,255,0.25)', marginLeft: 8 }}>
                      {seoTitleLen}/60
                    </span>
                  </label>
                  <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} style={fieldInput} placeholder="SEO-optimized title (max 60 chars)" />
                  {/* SERP preview */}
                  <div style={{ marginTop: 10, padding: 12, background: '#fff', borderRadius: 6, fontSize: 12 }}>
                    <div style={{ color: '#1a0dab', fontSize: 15, fontWeight: 400, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {seoTitle || title || 'Article Title'}
                    </div>
                    <div style={{ color: '#006621', fontSize: 12, marginBottom: 2 }}>
                      csrjournal.com/article/{slugTrimmed || 'article-slug'}
                    </div>
                    <div style={{ color: '#545454', fontSize: 12, lineHeight: 1.4 }}>
                      {metaDescription || 'Meta description will appear here. Write a compelling summary to increase click-through rate.'}
                    </div>
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>
                    Meta Description
                    <span style={{ fontWeight: 400, color: metaLen > 160 ? '#f87171' : metaLen > 140 ? '#fbbf24' : 'rgba(255,255,255,0.25)', marginLeft: 8 }}>
                      {metaLen}/160
                    </span>
                  </label>
                  <textarea
                    value={metaDescription}
                    onChange={e => setMetaDescription(e.target.value)}
                    placeholder="Describe this article in 120–160 characters for search results"
                    rows={3}
                    style={{ ...fieldInput, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>OG Title</label>
                  <input value={ogTitle} onChange={e => setOgTitle(e.target.value)} placeholder="Defaults to SEO title" style={fieldInput} />
                </div>
                <div>
                  <label style={fieldLabel}>OG Description</label>
                  <input value={ogDescription} onChange={e => setOgDescription(e.target.value)} placeholder="Defaults to meta description" style={fieldInput} />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ padding: '20px 16px', overflowY: 'auto', height: '100%' }}>

            {/* Publish */}
            <SidebarSection title="Publish">
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 6, border: 'none',
                  background: saving ? 'rgba(204,0,0,0.4)' : '#cc0000',
                  color: 'white', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                <Save size={14} />
                {saving ? 'Saving…' : status === 'published' ? 'Publish / Update' : 'Save'}
              </button>
              {viewUrl && (
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: '7px 0', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', fontSize: 12, textDecoration: 'none' }}
                >
                  <Eye size={13} /> View on site <ExternalLink size={11} />
                </a>
              )}
            </SidebarSection>

            {/* Featured Image */}
            <SidebarSection title="Featured Image">
              {featuredImage && (
                <div style={{ marginBottom: 10, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={featuredImage} alt="Featured" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                </div>
              )}
              <input
                value={featuredImage}
                onChange={e => setFeaturedImage(e.target.value)}
                placeholder="https://…image URL"
                style={fieldInput}
              />
            </SidebarSection>

            {/* Category & Language */}
            <SidebarSection title="Categorize">
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                  <option value="">— Select —</option>
                  {CATEGORIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </SidebarSection>

            {/* Tags */}
            <SidebarSection title="Tags" defaultOpen={false}>
              <label style={fieldLabel}>Tags (comma separated)</label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="politics, economy, india…"
                style={fieldInput}
              />
            </SidebarSection>

            {/* Article info */}
            <SidebarSection title="Article Info" defaultOpen={false}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 2 }}>
                <div><span style={{ color: 'rgba(255,255,255,0.25)' }}>ID:</span> {id}</div>
                <div><span style={{ color: 'rgba(255,255,255,0.25)' }}>Slug:</span> {slugTrimmed || '—'}</div>
                <div><span style={{ color: 'rgba(255,255,255,0.25)' }}>Status:</span> {status}</div>
              </div>
            </SidebarSection>
          </div>
        </form>
      )}
    </div>
  )
}
