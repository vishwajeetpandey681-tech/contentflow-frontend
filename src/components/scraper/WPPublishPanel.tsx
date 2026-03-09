'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, X, RefreshCw, Search, ChevronDown,
  Upload, Image as ImageIcon, ExternalLink, CheckCircle2, Trash2,
} from 'lucide-react'
import { settingsApi, wpMetaApi } from '@/lib/api'
import toast from 'react-hot-toast'
import type { ArticleRewrite } from '@/types/article'

interface WPPublishPanelProps {
  articleId: string
  rewrite: ArticleRewrite | undefined
  article?: { title?: string; description?: string; fullContent?: string; category?: string } | null
  wpPostId?: number | null
  onPublish: (options: {
    status: string
    categoryId: string
    authorId: string
    tagIds?: number[]
    featuredMediaId?: number
    wordpressSiteId?: string
  }) => Promise<void>
  onReject?: () => Promise<void>
}

const DEFAULT_FIELD_MAP = [
  { passId: 'full',      label: 'Full article',   wpField: 'post_content' },
  { passId: 'shortnews', label: 'Short news',      wpField: 'post_excerpt + metal_post_app_description' },
  { passId: 'char120',   label: 'Mobile desc',     wpField: 'metal_post_short_description_mobile + metal_yoast_wpseo_metadesc' },
  { passId: 'char65',    label: 'Mobile title',    wpField: 'metal_post_title_mobile' },
  { passId: 'keywords',  label: 'Focus keyword',   wpField: 'metal_yoast_wpseo_focuskw + tags_Input' },
]

// ─── WebP compression utility ──────────────────────────────────────────────
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
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url)
        if (!blob) { reject(new Error('Compression failed')); return }
        const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
        resolve(new File([blob], name, { type: 'image/webp' }))
      }, 'image/webp', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')) }
    img.src = url
  })
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}

/** Extract meaningful terms from text for tag matching (2+ chars, no HTML) */
function extractArticleTerms(text: string): string[] {
  if (!text || typeof text !== 'string') return []
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/[^\w\s#-]/g, ' ')
  return stripped
    .split(/\s+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length >= 2 && !/^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|has|have|this|that|with|from|into|more|than|when|were|been|said|each|which|their|there|would|could|should|about)$/i.test(w))
}

export function WPPublishPanel({ articleId, rewrite, article, wpPostId, onPublish, onReject }: WPPublishPanelProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Settings / meta
  const [status, setStatus] = useState('draft')
  const [wpUrl, setWpUrl] = useState<string>('')
  const [wpSites, setWpSites] = useState<{ id: string; label: string; url: string; configured?: boolean }[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [wpFieldMap, setWpFieldMap] = useState<{ passId: string; label: string; wpField: string }[]>(DEFAULT_FIELD_MAP)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [tags, setTags] = useState<{ id: number; name: string }[]>([])
  const [users, setUsers] = useState<{ id: number; name: string }[]>([])
  const [metaLoading, setMetaLoading] = useState(false)

  // Category picker
  const [categoryId, setCategoryId] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!categoryOpen) return
    const onOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false)
    }
    document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [categoryOpen])

  const [tagIds, setTagIds] = useState<number[]>([])
  const [authorId, setAuthorId] = useState('')
  const [publishing, setPublishing] = useState(false)

  // Featured image state
  const [imageFile, setImageFile] = useState<File | null>(null)         // original chosen file
  const [compressedFile, setCompressedFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadedMediaId, setUploadedMediaId] = useState<number | null>(null)
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fieldMapOpen, setFieldMapOpen] = useState(false)

  useEffect(() => {
    settingsApi.get().then(d => {
      setWpUrl(d.wordpress?.url || '')
      setWpSites(d.wordpressSites || [])
      setSelectedSiteId(prev => prev || (d.wordpressSites?.[0]?.id ?? ''))
      setWpFieldMap(d.wpFieldMap?.length ? d.wpFieldMap : DEFAULT_FIELD_MAP)
    }).catch(() => {})
  }, [])

  const effectiveSiteId = selectedSiteId || wpSites[0]?.id
  const effectiveWpUrl = wpSites.find(s => s.id === effectiveSiteId)?.url || wpUrl

  const fetchWpMeta = useCallback(() => {
    const siteId = effectiveSiteId || undefined
    if (!wpUrl && !effectiveWpUrl) return
    setMetaLoading(true)
    Promise.all([
      wpMetaApi.categories(siteId),
      wpMetaApi.tags(siteId),
      wpMetaApi.users(siteId),
    ])
      .then(([cats, tgs, usrs]) => {
        setCategories(cats || [])
        setTags(tgs || [])
        setUsers(usrs || [])
      })
      .catch(err => toast.error(err?.message || 'Could not fetch WordPress metadata'))
      .finally(() => setMetaLoading(false))
  }, [wpUrl, effectiveWpUrl, effectiveSiteId, wpSites.length])

  useEffect(() => { if (wpUrl || effectiveWpUrl) fetchWpMeta() }, [wpUrl, effectiveWpUrl, fetchWpMeta])

  // ─── Image selection + WebP compression ──────────────────────────────────
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    setImageFile(file)
    setUploadedMediaId(null)
    setUploadedMediaUrl(null)
    // Preview original
    const previewUrl = URL.createObjectURL(file)
    setImagePreviewUrl(previewUrl)
    // Compress to WebP
    setCompressing(true)
    try {
      const webpFile = await compressToWebP(file)
      setCompressedFile(webpFile)
      toast.success(`Compressed to WebP: ${formatBytes(file.size)} → ${formatBytes(webpFile.size)}`)
    } catch {
      toast.error('Could not compress image')
      setCompressedFile(null)
    } finally {
      setCompressing(false)
    }
  }

  const handleUploadToWP = async () => {
    const fileToUpload = compressedFile || imageFile
    if (!fileToUpload) return
    setUploadingImage(true)
    try {
      const result = await wpMetaApi.uploadImage(fileToUpload, effectiveSiteId || undefined)
      setUploadedMediaId(result.id)
      setUploadedMediaUrl(result.url)
      toast.success(`Image uploaded to WP Media Library (#${result.id})`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(null)
    setCompressedFile(null)
    setImagePreviewUrl(null)
    setUploadedMediaId(null)
    setUploadedMediaUrl(null)
  }

  // ─── Tags (article-based suggestions) ─────────────────────────────────────
  const toggleTag = (id: number) =>
    setTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const articleTerms = useMemo(() => {
    const parts: string[] = []
    if (article?.title) parts.push(article.title)
    if (article?.description) parts.push(article.description)
    if (article?.category) parts.push(article.category)
    if (article?.fullContent) parts.push(article.fullContent.slice(0, 1200))
    rewrite?.passes?.forEach(p => {
      if (p.output) parts.push(p.id === 'full' ? p.output.slice(0, 800) : p.output)
    })
    const terms = new Set<string>()
    parts.forEach(t => extractArticleTerms(t).forEach(w => terms.add(w)))
    return Array.from(terms)
  }, [article, rewrite?.passes])

  const isRecommended = (name: string) => {
    const n = name.toLowerCase()
    return articleTerms.some(t => n.includes(t) || t.includes(n) || n.split(/[\s#-]+/).some(w => w.length >= 2 && (t.includes(w) || w.includes(t))))
  }
  const recommendedTags = tags.filter(t => isRecommended(t.name))
  const otherTags = tags.filter(t => !isRecommended(t.name))
  const TAG_LIMIT = 10
  const tagLimitReached = tagIds.length >= TAG_LIMIT

  // ─── Category filter ──────────────────────────────────────────────────────
  const categorySearchLower = categorySearch.toLowerCase().trim()
  const categoriesFiltered = categories
    .filter(c => c.name.toLowerCase() !== 'uncategorized')
    .filter(c => !categorySearchLower || c.name.toLowerCase().includes(categorySearchLower))
  const selectedCategory = categories.find(c => String(c.id) === categoryId)

  // ─── Publish ──────────────────────────────────────────────────────────────
  const allDone = rewrite?.passes?.every(p => p.status === 'DONE') ?? false

  const handlePublish = async (overrideStatus?: string) => {
    setPublishing(true)
    try {
      await onPublish({
        status: overrideStatus ?? status,
        categoryId,
        authorId,
        tagIds: tagIds.length ? tagIds : undefined,
        featuredMediaId: uploadedMediaId ?? undefined,
        wordpressSiteId: wpSites.length > 1 ? effectiveSiteId : undefined,
      })
    } finally {
      setPublishing(false)
    }
  }

  // ─── Field map output preview ─────────────────────────────────────────────
  const passOutputs: Record<string, string> = {}
  rewrite?.passes?.forEach(p => { passOutputs[p.id] = p.output })

  const sBtn = {
    padding: '8px 12px',
    fontSize: 11,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 7,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  } as React.CSSProperties

  return (
    <div style={{ padding: 0 }}>

      {/* ── Published banner ─────────────────────────────────────────────── */}
      {wpPostId && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 10,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} color="var(--green)" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Published — WP #{wpPostId}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>Republish below to push updated content</div>
            </div>
          </div>
          {(effectiveWpUrl || wpUrl) && (
            <a
              href={`${(effectiveWpUrl || wpUrl).replace(/\/$/, '')}/?p=${wpPostId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: 'var(--cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ExternalLink size={12} />
              View on WP
            </a>
          )}
        </div>
      )}

      {/* ── Section header ───────────────────────────────────────────────── */}
      <div style={{
        fontSize: 9,
        letterSpacing: '1.8px',
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
        fontFamily: 'Geist Mono, monospace',
        fontWeight: 700,
        marginBottom: 14,
      }}>
        WordPress Publish
      </div>

      {/* Site + refresh */}
      <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {wpSites.length > 1 && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>Publish to</div>
            <select value={effectiveSiteId} onChange={e => setSelectedSiteId(e.target.value)} style={fieldStyle}>
              {wpSites.map(s => (
                <option key={s.id} value={s.id}>{s.label || s.url || s.id}</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>Site</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {effectiveWpUrl || wpUrl || <span style={{ color: 'var(--red)' }}>Not configured</span>}
            </div>
          </div>
          <button onClick={fetchWpMeta} disabled={metaLoading} style={sBtn} title="Reload categories / authors">
            {metaLoading ? <Loader2 size={11} style={{ animation: 'spin 0.6s linear infinite' }} /> : <RefreshCw size={11} />}
            Reload
          </button>
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Publish status</div>
        <select value={status} onChange={e => setStatus(e.target.value)} style={fieldStyle}>
          <option value="draft">Draft</option>
          <option value="publish">Publish now</option>
        </select>
      </div>

      {/* Category picker */}
      <div style={{ marginBottom: 14, position: 'relative' }} ref={categoryRef}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Category</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div
            onClick={() => !metaLoading && setCategoryOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: metaLoading ? 'not-allowed' : 'pointer' }}
          >
            <Search size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
            {categoryOpen ? (
              <input
                type="text"
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="Search categories…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12 }}
              />
            ) : (
              <span style={{ flex: 1, fontSize: 12, color: selectedCategory ? 'var(--text)' : 'var(--text-dim)' }}>
                {selectedCategory ? selectedCategory.name : '— Select category —'}
              </span>
            )}
            <ChevronDown size={13} style={{ color: 'var(--text-dim)', transform: categoryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
          </div>
          {categoryOpen && (
            <div style={{ maxHeight: 180, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
              <button type="button" onClick={() => { setCategoryId(''); setCategoryOpen(false); setCategorySearch('') }}
                style={{ width: '100%', padding: '7px 10px', textAlign: 'left', background: !categoryId ? 'var(--accent-glow)' : 'transparent', color: !categoryId ? 'var(--accent-light)' : 'var(--text)', border: 'none', fontSize: 12, cursor: 'pointer' }}>
                — None —
              </button>
              {categoriesFiltered.map(c => (
                <button key={c.id} type="button"
                  onClick={() => { setCategoryId(String(c.id)); setCategoryOpen(false); setCategorySearch('') }}
                  style={{ width: '100%', padding: '7px 10px', textAlign: 'left', background: categoryId === String(c.id) ? 'var(--accent-glow)' : 'transparent', color: categoryId === String(c.id) ? 'var(--accent-light)' : 'var(--text)', border: 'none', fontSize: 12, cursor: 'pointer' }}>
                  {c.name}
                </button>
              ))}
              {categoriesFiltered.length === 0 && (
                <div style={{ padding: '10px', fontSize: 12, color: 'var(--text-dim)' }}>No match</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Author */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Author</div>
        <select value={authorId} onChange={e => setAuthorId(e.target.value)} disabled={metaLoading} style={fieldStyle}>
          <option value="">— Select —</option>
          {users.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
        </select>
      </div>

      {/* Tags */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Tags <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>(max {TAG_LIMIT})</span></div>
        {recommendedTags.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--cyan)', marginBottom: 4, fontWeight: 600 }}>Suggested from article</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {recommendedTags.map(t => (
                <button key={t.id} type="button"
                  onClick={() => (!tagLimitReached || tagIds.includes(t.id)) && toggleTag(t.id)}
                  style={{ padding: '3px 8px', fontSize: 11, background: tagIds.includes(t.id) ? 'var(--accent-glow)' : 'rgba(34,211,238,0.1)', color: tagIds.includes(t.id) ? 'var(--accent-light)' : 'var(--cyan)', border: `1px solid ${tagIds.includes(t.id) ? 'rgba(124,58,237,0.3)' : 'rgba(34,211,238,0.25)'}`, borderRadius: 6, cursor: 'pointer', opacity: (tagLimitReached && !tagIds.includes(t.id)) ? 0.4 : 1 }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {otherTags.slice(0, 40).map(t => (
            <button key={t.id} type="button"
              onClick={() => (!tagLimitReached || tagIds.includes(t.id)) && toggleTag(t.id)}
              style={{ padding: '3px 8px', fontSize: 11, background: tagIds.includes(t.id) ? 'var(--accent-glow)' : 'var(--surface)', color: tagIds.includes(t.id) ? 'var(--accent-light)' : 'var(--text-muted)', border: `1px solid ${tagIds.includes(t.id) ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer', opacity: (tagLimitReached && !tagIds.includes(t.id)) ? 0.4 : 1 }}>
              {t.name}
            </button>
          ))}
        </div>
        {tagIds.length > 0 && (
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 5 }}>
            Selected: {tagIds.length}/{TAG_LIMIT}
            {tagIds.length > 5 && <span style={{ color: 'var(--amber)', marginLeft: 6 }}>3–5 is optimal for SEO</span>}
          </div>
        )}
      </div>

      {/* ── Featured Image ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          Featured Image
          {compressedFile && !uploadedMediaId && (
            <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)', fontWeight: 500 }}>
              ✓ Compressed to WebP
            </span>
          )}
          {uploadedMediaId && (
            <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)', fontWeight: 500 }}>
              ✓ Uploaded — Media #{uploadedMediaId}
            </span>
          )}
        </div>

        {imagePreviewUrl ? (
          <div style={{ position: 'relative' }}>
            <img
              src={uploadedMediaUrl || imagePreviewUrl}
              alt="Featured"
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', display: 'block', maxHeight: 140, objectFit: 'cover' }}
            />
            {/* Remove button */}
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Trash2 size={12} />
            </button>

            {/* Compression info */}
            {compressedFile && imageFile && (
              <div style={{ marginTop: 5, fontSize: 10, color: 'var(--text-dim)', display: 'flex', gap: 8 }}>
                <span>Original: {formatBytes(imageFile.size)}</span>
                <span>WebP: {formatBytes(compressedFile.size)}</span>
                <span style={{ color: 'var(--green)' }}>
                  -{Math.round((1 - compressedFile.size / imageFile.size) * 100)}%
                </span>
              </div>
            )}

            {/* Upload to WP button (only if not yet uploaded) */}
            {!uploadedMediaId && !uploadingImage && (
              <button
                type="button"
                onClick={handleUploadToWP}
                disabled={compressing}
                style={{ marginTop: 8, ...sBtn, width: '100%', justifyContent: 'center', background: 'var(--accent-glow)', color: 'var(--accent-light)', border: '1px solid rgba(124,58,237,0.3)' }}
              >
                <Upload size={12} />
                {compressing ? 'Compressing…' : 'Upload to WordPress'}
              </button>
            )}
            {uploadingImage && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <Loader2 size={13} style={{ animation: 'spin 0.6s linear infinite' }} />
                Uploading to WP Media Library…
              </div>
            )}
            {uploadedMediaUrl && (
              <a href={uploadedMediaUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 10, color: 'var(--cyan)', textDecoration: 'none' }}>
                <ExternalLink size={10} />
                View in Media Library
              </a>
            )}
          </div>
        ) : (
          /* Drop zone */
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files[0]
              if (f) handleImageFile(f)
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent-light)' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '18px 12px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--accent-glow)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <ImageIcon size={20} style={{ color: 'var(--text-dim)', display: 'block', margin: '0 auto 6px' }} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Drop image here or click to select</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>JPG / PNG / WebP · compressed to WebP automatically</div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleImageFile(f)
          }}
        />
      </div>

      {/* ── Output → WP Field Map (with preview) ─────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Output → WP Field Map</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => setFieldMapOpen(o => !o)}
              style={{ fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Geist Mono, monospace' }}>
              {fieldMapOpen ? 'Hide preview' : 'Preview outputs'}
            </button>
            <button type="button" onClick={() => router.push('/wordpress/')}
              style={{ fontSize: 11, color: 'var(--accent-light)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Geist Mono, monospace' }}>
              Configure →
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: fieldMapOpen ? 10 : 4 }}>
          {wpFieldMap.map(row => {
            const output = passOutputs[row.passId] || ''
            const isDone = rewrite?.passes?.find(p => p.id === row.passId)?.status === 'DONE'
            return (
              <div key={row.passId} style={{
                background: fieldMapOpen ? 'var(--surface)' : 'transparent',
                border: fieldMapOpen ? '1px solid var(--border)' : 'none',
                borderRadius: fieldMapOpen ? 8 : 0,
                padding: fieldMapOpen ? '10px 12px' : '2px 0',
                transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: isDone ? 'var(--green)' : 'var(--border-light)', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{row.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'Geist Mono, monospace', textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                    → {row.wpField}
                  </span>
                </div>
                {fieldMapOpen && output && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4, maxHeight: 56, overflow: 'hidden', position: 'relative' }}>
                    {output.replace(/<[^>]+>/g, ' ').trim().slice(0, 180)}
                    {output.length > 180 && '…'}
                  </div>
                )}
                {fieldMapOpen && !output && (
                  <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    {rewrite ? 'No output yet — run rewrite first' : 'Not available'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div style={{
        fontSize: 9,
        letterSpacing: '1.8px',
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
        fontFamily: 'Geist Mono, monospace',
        fontWeight: 700,
        marginBottom: 10,
      }}>
        Actions
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Primary publish / update */}
        <button
          onClick={() => handlePublish()}
          disabled={!allDone || publishing}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 16px',
            background: allDone ? (wpPostId ? 'var(--accent)' : 'var(--green)') : 'var(--surface)',
            color: allDone ? '#fff' : 'var(--text-dim)',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: allDone && !publishing ? 'pointer' : 'not-allowed',
            opacity: publishing ? 0.7 : 1,
            boxShadow: allDone ? '0 2px 10px rgba(0,0,0,0.25)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {publishing ? <Loader2 size={15} style={{ animation: 'spin 0.6s linear infinite' }} /> : null}
          {wpPostId ? 'Republish to WP →' : status === 'draft' ? 'Save as Draft →' : 'Publish to WordPress →'}
        </button>

        {/* Quick draft (shown only when status is publish, as a fallback) */}
        {status === 'publish' && !wpPostId && (
          <button
            onClick={() => handlePublish('draft')}
            disabled={!allDone || publishing}
            style={{ ...sBtn, width: '100%', justifyContent: 'center', opacity: (!allDone || publishing) ? 0.5 : 1, cursor: allDone && !publishing ? 'pointer' : 'not-allowed' }}
          >
            Save Draft instead
          </button>
        )}

        {/* Reject */}
        {onReject && (
          <button
            onClick={onReject}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
          >
            <X size={13} />
            Reject Article
          </button>
        )}
      </div>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 12,
}
