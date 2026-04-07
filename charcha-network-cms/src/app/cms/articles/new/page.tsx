'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Save, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { cmsWebsiteCmsArticlesApi } from '@/lib/cms-api'
import dynamic from 'next/dynamic'

const RichEditor = dynamic(() => import('@/components/editor/RichEditor').then(m => m.RichEditor), {
  ssr: false,
  loading: () => (
    <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      Loading editor…
    </div>
  ),
})

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
      {open && <div style={{ padding: '14px 14px 16px' }}>{children}</div>}
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
const STATUSES = [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim().slice(0, 80)
}

export default function CmsNewArticlePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
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
  const [status, setStatus] = useState('draft')
  const [excerpt, setExcerpt] = useState('')

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slugManuallyEdited) setSlug(slugify(value))
    if (!seoTitle) setSeoTitle(value)
  }

  const onSave = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) { toast.error('Title is required'); return }
    if (saving) return
    setSaving(true)
    try {
      const created = await cmsWebsiteCmsArticlesApi.create({
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        seoTitle: seoTitle.trim(),
        seoDescription: metaDescription.trim(),
        metaDescription: metaDescription.trim(),
        content: html,
        body: html,
        category: category.trim(),
        language: language.trim(),
        featuredImage: featuredImage.trim(),
        status,
      })
      toast.success('Article created!')
      router.push(`/cms/articles/${created.id}/edit/`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create article')
    } finally {
      setSaving(false)
    }
  }

  const seoTitleLen = seoTitle.length
  const metaLen = metaDescription.length
  const slugTrimmed = slug.trim()

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
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>New article</span>
        <div style={{ marginLeft: 'auto' }}>
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
            {saving ? 'Creating…' : 'Create article'}
          </button>
        </div>
      </div>

      <form onSubmit={onSave} style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Main */}
        <div style={{ padding: '28px 32px', borderRight: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', height: '100%' }}>
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
            autoFocus
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>Permalink: …/article/</span>
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

          <div style={{ marginBottom: 20 }}>
            <label style={{ ...fieldLabel, textTransform: 'none', letterSpacing: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              Excerpt
            </label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Brief description…"
              rows={2}
              style={{ ...fieldInput, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ ...fieldLabel, textTransform: 'none', letterSpacing: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              Content
            </label>
            <RichEditor value={html} onChange={setHtml} />
          </div>

          {/* SEO */}
          <div style={{ marginTop: 32, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🔍</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>SEO Settings</span>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={fieldLabel}>Focus Keyword</label>
                <input value={focusKeyword} onChange={e => setFocusKeyword(e.target.value)} placeholder="Main keyword" style={fieldInput} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={fieldLabel}>
                  SEO Title
                  <span style={{ fontWeight: 400, color: seoTitleLen > 60 ? '#f87171' : 'rgba(255,255,255,0.25)', marginLeft: 8 }}>
                    {seoTitleLen}/60
                  </span>
                </label>
                <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="SEO title (max 60 chars)" style={fieldInput} />
                {/* SERP preview */}
                <div style={{ marginTop: 10, padding: 12, background: '#fff', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: '#1a0dab', fontSize: 15, fontWeight: 400, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {seoTitle || title || 'Article Title'}
                  </div>
                  <div style={{ color: '#006621', fontSize: 12, marginBottom: 2 }}>csrjournal.com/article/{slugTrimmed || 'article-slug'}</div>
                  <div style={{ color: '#545454', fontSize: 12, lineHeight: 1.4 }}>
                    {metaDescription || 'Meta description will appear here.'}
                  </div>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={fieldLabel}>
                  Meta Description
                  <span style={{ fontWeight: 400, color: metaLen > 160 ? '#f87171' : 'rgba(255,255,255,0.25)', marginLeft: 8 }}>
                    {metaLen}/160
                  </span>
                </label>
                <textarea
                  value={metaDescription}
                  onChange={e => setMetaDescription(e.target.value)}
                  placeholder="120–160 character description for search results"
                  rows={3}
                  style={{ ...fieldInput, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ padding: '20px 16px', overflowY: 'auto', height: '100%' }}>
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
              {saving ? 'Creating…' : 'Create article'}
            </button>
          </SidebarSection>

          <SidebarSection title="Featured Image">
            {featuredImage && (
              <div style={{ marginBottom: 10, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featuredImage} alt="Featured" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <input value={featuredImage} onChange={e => setFeaturedImage(e.target.value)} placeholder="https://… image URL" style={fieldInput} />
          </SidebarSection>

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
        </div>
      </form>
    </div>
  )
}
