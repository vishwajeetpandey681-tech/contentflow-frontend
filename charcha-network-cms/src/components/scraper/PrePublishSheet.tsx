'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Upload, Loader2, Send, Calendar, CheckCircle2, ExternalLink,
  ChevronDown, Globe, Image as ImageIcon, Clock, Download,
} from 'lucide-react'
import { useContentWorkspace } from '@/lib/content-workspace'
import toast from 'react-hot-toast'
import type { ScraperArticle, ArticleRewrite } from '@/types/article'
import { resolveFeaturedImageUrl } from '@/lib/featured-image'
import type { WpPublishHistoryEntry } from '@/lib/api'

interface Props {
  open: boolean
  article: ScraperArticle
  rewrite: ArticleRewrite | undefined
  onClose: () => void
  onPublished: (result: { postId?: number; postUrl?: string; status?: string; siteLabel?: string }) => void
  onArticleUpdated?: () => void
}

async function compressToWebP(file: File, quality = 0.82, maxPx = 1200): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx }
        else { width = Math.round((width * maxPx) / height); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url)
        if (!blob) { reject(new Error('Compression failed')); return }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }))
      }, 'image/webp', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')) }
    img.src = url
  })
}

const s = (base: React.CSSProperties) => base

export function PrePublishSheet({ open, article, rewrite, onClose, onPublished, onArticleUpdated }: Props) {
  const { apis } = useContentWorkspace()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const passes = rewrite?.passes ?? []

  // Form state
  const [title, setTitle] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [metaDesc, setMetaDesc] = useState('')
  const [status, setStatus] = useState<'draft' | 'publish' | 'future'>('draft')
  const [scheduleDate, setScheduleDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [authorId, setAuthorId] = useState('')
  const [featuredMediaId, setFeaturedMediaId] = useState<number | undefined>()
  const [featuredMediaUrl, setFeaturedMediaUrl] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState('')

  // Data
  const [sites, setSites] = useState<{ id: string; label: string; url: string; configured?: boolean }[]>([])
  const [siteHealth, setSiteHealth] = useState<Record<string, 'ok' | 'error' | 'checking'>>({})
  const [categories, setCategories] = useState<{ id: number; name: string; parent: number }[]>([])
  const [tags, setTags] = useState<{ id: number; name: string }[]>([])
  const [users, setUsers] = useState<{ id: number; name: string }[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [catSearch, setCatSearch] = useState('')
  const [catOpen, setCatOpen] = useState(false)

  // Loading
  const [metaLoading, setMetaLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [sourceImageLoading, setSourceImageLoading] = useState(false)

  // Success
  const [result, setResult] = useState<{ postId?: number; postUrl?: string; status?: string; siteLabel?: string } | null>(null)

  // Prefill from rewrite passes
  useEffect(() => {
    if (!open) { setResult(null); return }
    const char65 = passes.find(p => p.id === 'char65')?.output || article.title || ''
    const char120 = passes.find(p => p.id === 'char120')?.output || article.description || ''
    setTitle(char65.slice(0, 200))
    setSeoTitle(char65.slice(0, 60))
    setMetaDesc(char120.slice(0, 160))
    const imgUrl = resolveFeaturedImageUrl(article, rewrite)
    if (imgUrl) setFeaturedMediaUrl(imgUrl)
    else setFeaturedMediaUrl('')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when sheet opens for this article (not passes/title churn)
  }, [open, article.id])

  // Load sites + ping health
  useEffect(() => {
    if (!open) return
    apis.settings.get().then(d => {
      const s = d.wordpressSites || []
      setSites(s)
      if (s.length > 0) setSelectedSiteId(s[0].id)
      // Ping all configured sites
      s.filter(site => site.configured !== false).forEach(site => {
        setSiteHealth(prev => ({ ...prev, [site.id]: 'checking' }))
        apis.settings.testWordpress({ siteId: site.id })
          .then(r => setSiteHealth(prev => ({ ...prev, [site.id]: r.ok ? 'ok' : 'error' })))
          .catch(() => setSiteHealth(prev => ({ ...prev, [site.id]: 'error' })))
      })
    }).catch(() => {})
  }, [open, apis.settings])

  // Load meta (categories/tags/users) when site changes
  const loadMeta = useCallback(async (siteId: string) => {
    setMetaLoading(true)
    try {
      const [cats, tgs, usrs] = await Promise.all([
        apis.wpMeta.categories(siteId),
        apis.wpMeta.tags(siteId),
        apis.wpMeta.users(siteId),
      ])
      setCategories(cats)
      setTags(tgs)
      setUsers(usrs)
      if (usrs.length === 1) setAuthorId(String(usrs[0].id))
    } catch {
      // silent — not all WP setups allow this
    } finally {
      setMetaLoading(false)
    }
  }, [apis.wpMeta])

  useEffect(() => {
    if (open && selectedSiteId) loadMeta(selectedSiteId)
  }, [open, selectedSiteId, loadMeta])

  const handleImageFile = async (file: File) => {
    setImageUploading(true)
    try {
      const compressed = await compressToWebP(file)
      const res = await apis.wpMeta.uploadImage(compressed, selectedSiteId || undefined)
      setFeaturedMediaId(res.id)
      setFeaturedMediaUrl(res.url)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setImageUploading(false)
    }
  }

  const handleFetchImageFromSource = async () => {
    if (!article.url?.startsWith('http')) {
      toast.error('Article has no source URL to fetch from')
      return
    }
    setSourceImageLoading(true)
    try {
      const { image } = await apis.inbox.extractImage(article.id)
      setFeaturedMediaUrl(image)
      setFeaturedMediaId(undefined)
      onArticleUpdated?.()
      toast.success('Image fetched from source page')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not fetch image from source')
    } finally {
      setSourceImageLoading(false)
    }
  }

  const handleImageUrl = async () => {
    if (!featuredMediaUrl || !featuredMediaUrl.startsWith('http')) return
    setImageUploading(true)
    try {
      const res = await apis.media.fetchFromUrl(featuredMediaUrl, selectedSiteId || undefined)
      setFeaturedMediaId(res.id)
      setFeaturedMediaUrl(res.url)
      toast.success('Image uploaded from URL')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image URL upload failed')
    } finally {
      setImageUploading(false)
    }
  }

  const handlePublish = async (publishStatus: 'draft' | 'publish' | 'future') => {
    setPublishing(true)
    try {
      const res = await apis.publish.wordpress(article.id, {
        status: publishStatus,
        categoryId: categoryId || undefined,
        authorId: authorId || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        featuredMediaId: featuredMediaId || undefined,
        wordpressSiteId: selectedSiteId || undefined,
        customTitle: title || undefined,
        seoTitle: seoTitle || undefined,
        seoMetaDesc: metaDesc || undefined,
        scheduleDate: publishStatus === 'future' ? scheduleDate || undefined : undefined,
      })
      const r = {
        postId: res?.id,
        postUrl: res?.link,
        status: publishStatus,
        siteLabel: res?._siteLabel || selectedSiteId,
      }
      setResult(r)
      onPublished(r)
      toast.success(publishStatus === 'draft' ? 'Saved as draft!' : publishStatus === 'future' ? 'Scheduled!' : '🚀 Published!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const filteredCats = catSearch ? categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())) : categories
  const filteredTags = tagSearch ? tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())) : tags
  const selectedCatName = categories.find(c => String(c.id) === categoryId)?.name || 'Select category'

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          maxHeight: '92dvh',
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          display: 'flex', flexDirection: 'column',
          animation: 'slideUp 0.3s ease',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-light)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Pre-Publish Checklist</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Review and confirm before publishing</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Success state */}
          {result && (
            <div style={{ padding: 20, background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 16, textAlign: 'center' }}>
              <CheckCircle2 size={40} style={{ color: 'var(--success, #00e5a0)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {result.status === 'draft' ? 'Saved as Draft' : result.status === 'future' ? 'Scheduled!' : '🚀 Published!'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {result.siteLabel && <>To <strong>{result.siteLabel}</strong> · </>}Post ID: {result.postId}
              </div>
              {result.postUrl && (
                <a href={result.postUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--accent-light)', fontSize: 12, textDecoration: 'none' }}>
                  <ExternalLink size={13} /> View Live
                </a>
              )}
              <button onClick={onClose} style={{ display: 'block', width: '100%', marginTop: 12, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          )}

          {!result && (
            <>
              {/* Site selector */}
              {sites.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>🌐 Publish To</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sites.map(site => {
                      const health = siteHealth[site.id]
                      const isSelected = selectedSiteId === site.id
                      return (
                        <div key={site.id} onClick={() => setSelectedSiteId(site.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isSelected ? 'var(--accent-glow)' : 'var(--card)', border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: health === 'ok' ? '#00e5a0' : health === 'error' ? 'var(--red)' : health === 'checking' ? 'var(--amber)' : 'var(--border)', flexShrink: 0, boxShadow: health === 'ok' ? '0 0 6px rgba(0,229,160,0.6)' : 'none' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--accent-light)' : 'var(--text)' }}>{site.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.url}</div>
                          </div>
                          {isSelected && <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 9, color: '#fff' }}>✓</span>
                          </div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Post title"
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', minHeight: 44 }}
                />
              </div>

              {/* SEO Title */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>SEO Meta Title</label>
                  <span style={{ fontSize: 11, color: seoTitle.length > 60 ? 'var(--red)' : 'var(--text-dim)' }}>{seoTitle.length}/60</span>
                </div>
                <input
                  value={seoTitle}
                  onChange={e => setSeoTitle(e.target.value)}
                  placeholder="SEO title (max 60 chars)"
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, background: 'var(--card)', border: `1px solid ${seoTitle.length > 60 ? 'var(--red)' : 'var(--border)'}`, borderRadius: 10, color: 'var(--text)', minHeight: 44 }}
                />
              </div>

              {/* Meta Description */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Meta Description</label>
                  <span style={{ fontSize: 11, color: metaDesc.length > 160 ? 'var(--red)' : 'var(--text-dim)' }}>{metaDesc.length}/160</span>
                </div>
                <textarea
                  value={metaDesc}
                  onChange={e => setMetaDesc(e.target.value)}
                  rows={3}
                  placeholder="Meta description (max 160 chars)"
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, background: 'var(--card)', border: `1px solid ${metaDesc.length > 160 ? 'var(--red)' : 'var(--border)'}`, borderRadius: 10, color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {/* Category */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Category</label>
                <button
                  type="button"
                  onClick={() => setCatOpen(v => !v)}
                  style={{ width: '100%', padding: '10px 12px', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: categoryId ? 'var(--text)' : 'var(--text-dim)', fontSize: 14, cursor: 'pointer' }}
                >
                  {metaLoading ? <span style={{ color: 'var(--text-dim)' }}>Loading…</span> : selectedCatName}
                  <ChevronDown size={14} style={{ flexShrink: 0 }} />
                </button>
                {catOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                      <input value={catSearch} onChange={e => setCatSearch(e.target.value)} placeholder="Search categories…" style={{ width: '100%', padding: '6px 10px', fontSize: 13, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                    </div>
                    <div
                      onClick={() => { setCategoryId(''); setCatOpen(false) }}
                      style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text-dim)' }}
                    >None</div>
                    {filteredCats.map(c => (
                      <div key={c.id} onClick={() => { setCategoryId(String(c.id)); setCatOpen(false) }}
                        style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', background: String(c.id) === categoryId ? 'var(--accent-glow)' : 'transparent', color: String(c.id) === categoryId ? 'var(--accent-light)' : 'var(--text)' }}>
                        {c.parent ? '  └ ' : ''}{c.name}
                      </div>
                    ))}
                    {categories.length === 0 && !metaLoading && <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-dim)' }}>No categories. Add one in WordPress.</div>}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Tags</label>
                <input
                  value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  placeholder="Search tags…"
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', minHeight: 44, marginBottom: 8 }}
                />
                {selectedTagIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {selectedTagIds.map(id => {
                      const t = tags.find(x => x.id === id)
                      return t ? (
                        <span key={id} onClick={() => setSelectedTagIds(prev => prev.filter(x => x !== id))}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--accent-glow)', color: 'var(--accent-light)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 20, fontSize: 12, cursor: 'pointer' }}>
                          {t.name} <X size={10} />
                        </span>
                      ) : null
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                  {filteredTags.slice(0, 30).map(t => (
                    <span key={t.id}
                      onClick={() => setSelectedTagIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                      style={{ padding: '4px 10px', background: selectedTagIds.includes(t.id) ? 'var(--accent-glow)' : 'var(--card)', color: selectedTagIds.includes(t.id) ? 'var(--accent-light)' : 'var(--text-muted)', border: `1px solid ${selectedTagIds.includes(t.id) ? 'rgba(124,58,237,0.2)' : 'var(--border)'}`, borderRadius: 20, fontSize: 12, cursor: 'pointer' }}>
                      {t.name}
                    </span>
                  ))}
                  {tags.length === 0 && !metaLoading && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>No tags found</span>}
                </div>
              </div>

              {/* Author */}
              {users.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Author</label>
                  <select value={authorId} onChange={e => setAuthorId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', minHeight: 44 }}>
                    <option value="">Default</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}

              {/* Featured Image */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Featured Image</label>
                {featuredMediaUrl && (
                  <div style={{ marginBottom: 8, borderRadius: 10, overflow: 'hidden', maxHeight: 140, position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={featuredMediaUrl} alt="Featured" style={{ width: '100%', objectFit: 'cover', maxHeight: 140 }} />
                    {featuredMediaId && (
                      <div style={{ position: 'absolute', top: 6, right: 6, padding: '2px 8px', background: 'rgba(0,229,160,0.15)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.3)', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>
                        Uploaded ✓
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', flexWrap: 'wrap' }}>
                  <input value={!featuredMediaId ? featuredMediaUrl : ''} onChange={e => { setFeaturedMediaUrl(e.target.value); setFeaturedMediaId(undefined) }}
                    placeholder="Image URL"
                    style={{ flex: 1, minWidth: 120, padding: '10px 12px', fontSize: 13, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', minHeight: 44 }}
                  />
                  <button
                    type="button"
                    title="Fetch og:image or first large image from the original article URL"
                    onClick={() => void handleFetchImageFromSource()}
                    disabled={sourceImageLoading || !article.url?.startsWith('http')}
                    style={{
                      padding: '0 14px',
                      minHeight: 44,
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      cursor: sourceImageLoading || !article.url?.startsWith('http') ? 'not-allowed' : 'pointer',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {sourceImageLoading ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Download size={14} />}
                    Fetch from source
                  </button>
                  {!featuredMediaId && featuredMediaUrl && (
                    <button onClick={handleImageUrl} disabled={imageUploading}
                      style={{ padding: '0 14px', minHeight: 44, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                      {imageUploading ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : 'Upload'}
                    </button>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} disabled={imageUploading}
                    style={{ padding: '0 14px', minHeight: 44, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                    {imageUploading ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Upload size={14} />}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
                <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, marginBottom: 0 }}>
                  Prefilled when the sheet opens. “Fetch from source” loads og:image or the first large image from the original article URL.
                </p>
              </div>

              {/* Publish Status */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Publish Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['draft', 'publish', 'future'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setStatus(s)}
                      style={{ flex: 1, padding: '10px 8px', minHeight: 44, fontSize: 12, fontWeight: 600, borderRadius: 10, border: `2px solid ${status === s ? 'var(--accent)' : 'var(--border)'}`, background: status === s ? 'var(--accent-glow)' : 'var(--card)', color: status === s ? 'var(--accent-light)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {s === 'draft' ? '📝 Draft' : s === 'publish' ? '🚀 Publish' : '⏰ Schedule'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule date */}
              {status === 'future' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Schedule Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', minHeight: 44 }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky footer */}
        {!result && (
          <div style={{
            padding: '12px 20px',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            gap: 10,
          }}>
            <button
              onClick={() => handlePublish('draft')}
              disabled={publishing}
              style={{ flex: 1, padding: '13px 16px', fontSize: 13, fontWeight: 600, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-muted)', cursor: publishing ? 'not-allowed' : 'pointer' }}
            >
              {publishing ? <Loader2 size={16} style={{ display: 'inline', animation: 'spin 0.6s linear infinite', marginRight: 6 }} /> : null}
              Quick Draft
            </button>
            <button
              onClick={() => handlePublish(status === 'future' ? 'future' : status === 'publish' ? 'publish' : 'draft')}
              disabled={publishing}
              style={{
                flex: 2, padding: '13px 16px', fontSize: 14, fontWeight: 700,
                background: status === 'publish' ? 'linear-gradient(135deg, #00e5a0 0%, #00c48a 100%)' : status === 'future' ? 'linear-gradient(135deg, var(--amber) 0%, #ff8c00 100%)' : 'linear-gradient(135deg, var(--accent) 0%, #5a52e8 100%)',
                border: 'none', borderRadius: 12, color: '#fff', cursor: publishing ? 'not-allowed' : 'pointer',
                boxShadow: status === 'publish' ? '0 4px 16px rgba(0,229,160,0.35)' : status === 'future' ? '0 4px 16px rgba(255,179,71,0.35)' : '0 4px 16px rgba(108,99,255,0.4)',
                opacity: publishing ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {publishing ? <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} /> : (status === 'publish' ? <Send size={16} /> : status === 'future' ? <Clock size={16} /> : <Send size={16} />)}
              {publishing
                ? `Publishing to ${sites.find(s => s.id === selectedSiteId)?.label || 'WordPress'}…`
                : status === 'publish' ? '🚀 Publish Now'
                : status === 'future' ? '⏰ Schedule'
                : '📝 Save as Draft'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
