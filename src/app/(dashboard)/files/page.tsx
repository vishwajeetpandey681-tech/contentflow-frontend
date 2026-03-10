'use client'

import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, Plus, Trash2, Download, Loader2, Image as ImageIcon } from 'lucide-react'
import { mediaApi, settingsApi, type WpSiteEntry } from '@/lib/api'
import toast from 'react-hot-toast'

/** Session-only item: uploaded or fetched in this visit */
interface SessionMediaItem {
  id: number
  url: string
  title?: string
}

export default function FileManagerPage() {
  const [sites, setSites] = useState<WpSiteEntry[]>([])
  const [siteId, setSiteId] = useState<string>('')
  const [items, setItems] = useState<SessionMediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [fetchUrl, setFetchUrl] = useState('')

  const loadSites = useCallback(async () => {
    try {
      const data = await settingsApi.get()
      const list = data.wordpressSites || []
      setSites(list)
      if (list.length > 0 && !siteId) {
        const configured = list.find(s => s.configured)
        setSiteId(configured?.id || list[0].id)
      }
    } catch {
      toast.error('Failed to load WordPress sites')
    }
  }, [siteId])

  useEffect(() => {
    loadSites()
  }, [loadSites])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setUploading(true)
    try {
      const { id, url } = await mediaApi.upload(file, siteId || undefined)
      setItems(prev => [{ id, url, title: file.name }, ...prev])
      toast.success('Image uploaded and stored')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleFetchFromUrl = async () => {
    const url = fetchUrl.trim()
    if (!url || !url.startsWith('http')) {
      toast.error('Enter a valid image URL')
      return
    }
    setFetching(true)
    try {
      const { id, url: storedUrl } = await mediaApi.fetchFromUrl(url, siteId || undefined)
      setItems(prev => [{ id, url: storedUrl, title: url.split('/').pop() || 'Image' }, ...prev])
      toast.success('Image fetched and stored')
      setFetchUrl('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setFetching(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this file from WordPress Media Library?')) return
    setDeletingId(id)
    try {
      await mediaApi.delete(id, siteId || undefined)
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('Deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const effectiveSite = sites.find(s => s.id === siteId)
  const hasConfigured = sites.some(s => s.configured)

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div style={{ padding: 24, borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'var(--accent-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FolderOpen size={20} style={{ color: 'var(--accent-light)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>File Manager</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Upload or fetch images from URL — stored in WordPress Media Library
            </p>
          </div>
        </div>

        {!hasConfigured ? (
          <div style={{ padding: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 13 }}>
            Configure WordPress in Settings → WordPress to use the File Manager.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <select
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 12,
                  minWidth: 160,
                }}
              >
                {sites.filter(s => s.configured).map(s => (
                  <option key={s.id} value={s.id}>{s.label || s.url || s.id}</option>
                ))}
              </select>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.7 : 1,
              }}>
                {uploading ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Plus size={14} />}
                Add image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="url"
                  placeholder="Fetch image from URL..."
                  value={fetchUrl}
                  onChange={e => setFetchUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFetchFromUrl()}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                    width: 260,
                  }}
                />
                <button
                  onClick={handleFetchFromUrl}
                  disabled={fetching || !fetchUrl.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-light)',
                    border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: fetching || !fetchUrl.trim() ? 'not-allowed' : 'pointer',
                    opacity: fetching || !fetchUrl.trim() ? 0.6 : 1,
                  }}
                >
                  {fetching ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Download size={14} />}
                  Fetch
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!hasConfigured ? null : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={28} style={{ color: 'var(--text-dim)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>No media yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280 }}>
              Upload an image or fetch from a URL. They will be stored in WordPress Media Library.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>
              {items.length} item{items.length !== 1 ? 's' : ''} added this session • Site: {effectiveSite?.label || siteId}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 16,
            }}>
              {items.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}
                  className="card-hover-effect"
                >
                  <div style={{ aspectRatio: '1', background: 'var(--surface)', position: 'relative' }}>
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.title || item.url}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-dim)',
                      }}>
                        <ImageIcon size={32} />
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        cursor: deletingId === item.id ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: deletingId === item.id ? 0.5 : 1,
                      }}
                      title="Delete"
                    >
                      {deletingId === item.id ? (
                        <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                  <div style={{ padding: 10 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.title || `Media #${item.id}`}
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 10, color: 'var(--cyan)', textDecoration: 'none', marginTop: 4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
