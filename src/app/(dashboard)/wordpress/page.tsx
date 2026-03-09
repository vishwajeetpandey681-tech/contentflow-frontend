'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Newspaper, Loader2, Check, AlertCircle, RefreshCw, LogOut, ExternalLink,
  Inbox, Settings as SettingsIcon, Plus, Trash2, ChevronDown, ChevronUp, FileCode,
} from 'lucide-react'
import { settingsApi, type WpFieldMapEntry, type WpSiteEntry, type WpCustomFieldEntry } from '@/lib/api'
import toast from 'react-hot-toast'

const WORDPRESS_STATUSES = [
  { id: 'draft', label: 'Draft' },
  { id: 'schedule', label: 'Schedule (1 hour from now)' },
  { id: 'publish', label: 'Publish' },
] as const

const DEFAULT_FIELD_MAP: WpFieldMapEntry[] = [
  { passId: 'full', label: 'Full article', wpField: 'post_content' },
  { passId: 'shortnews', label: 'Short news', wpField: 'post_excerpt + metal_post_app_description' },
  { passId: 'char120', label: 'Mobile desc', wpField: 'metal_post_short_description_mobile + metal_yoast_wpseo_metadesc' },
  { passId: 'char65', label: 'Mobile title', wpField: 'metal_post_title_mobile' },
  { passId: 'keywords', label: 'Focus keyword', wpField: 'metal_yoast_wpseo_focuskw + tags_Input' },
]

const API_FIELDS = [
  { field: 'title', type: 'string', desc: 'Post title (from char65 / mobile title)' },
  { field: 'content', type: 'string', desc: 'Full HTML content + Newspin footer' },
  { field: 'excerpt', type: 'string', desc: 'Short summary (from shortnews)' },
  { field: 'status', type: 'string', desc: 'draft | publish | future' },
  { field: 'categories', type: 'number[]', desc: 'WP category IDs' },
  { field: 'tags', type: 'number[]', desc: 'WP tag IDs' },
  { field: 'author', type: 'number', desc: 'WP user ID' },
  { field: 'featured_media', type: 'number', desc: 'WP media attachment ID' },
  { field: 'date', type: 'ISO8601', desc: 'For scheduled posts' },
]

const META_FIELDS = [
  { key: 'metal_post_title_mobile', source: 'char65' },
  { key: 'metal_post_short_description_mobile', source: 'char120' },
  { key: 'metal_post_app_description', source: 'shortnews' },
  { key: 'metal_yoast_wpseo_focuskw', source: 'keywords' },
  { key: 'metal_yoast_wpseo_metadesc', source: 'char120' },
  { key: 'tags_Input', source: 'keywords' },
]

const sCard = {
  padding: 20,
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  marginBottom: 16,
}
const sSection = {
  fontSize: 10,
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  color: 'var(--text-dim)',
  fontFamily: 'Geist Mono, monospace',
  fontWeight: 700,
  marginBottom: 16,
}
const sInput = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 12,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
}
const sBtn = { padding: '8px 12px', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' as const }

export default function WordPressPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sites, setSites] = useState<WpSiteEntry[]>([])
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null)
  const [newSite, setNewSite] = useState({ label: '', url: '', user: '', password: '' })
  const [addingSite, setAddingSite] = useState(false)
  const [wpTestingId, setWpTestingId] = useState<string | null>(null)
  const [restApiCheckLoading, setRestApiCheckLoading] = useState(false)
  const [restApiCheckResult, setRestApiCheckResult] = useState<{
    ok: boolean
    checks: { name: string; url: string; ok: boolean; status?: number; message: string; details?: string }[]
    wpUrl?: string
  } | null>(null)
  const [wpFieldMap, setWpFieldMap] = useState<WpFieldMapEntry[]>(DEFAULT_FIELD_MAP)
  const [wpCustomFields, setWpCustomFields] = useState<WpCustomFieldEntry[]>([])
  const [autoPublishOnRewriteDone, setAutoPublishOnRewriteDone] = useState(false)
  const [autoPublishStatus, setAutoPublishStatus] = useState<'draft' | 'schedule' | 'publish'>('publish')
  const [apiRefOpen, setApiRefOpen] = useState(false)

  useEffect(() => {
    settingsApi.get().then(data => {
      setSites(data.wordpressSites || [])
      setAutoPublishOnRewriteDone(!!data.autoPublishOnRewriteDone)
      setAutoPublishStatus(data.autoPublishStatus === 'draft' || data.autoPublishStatus === 'schedule' ? data.autoPublishStatus : 'publish')
      setWpFieldMap(data.wpFieldMap?.length ? data.wpFieldMap : DEFAULT_FIELD_MAP)
      setWpCustomFields(data.wpCustomFields || [])
    }).catch(() => toast.error('Failed to load settings')).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const sitesToSave = sites.map(s => ({
        id: s.id,
        label: s.label,
        url: s.url,
        user: s.user || '',
        password: s.password || '',
      }))
      if (addingSite && newSite.url) {
        sitesToSave.push({
          id: `site-${Date.now()}`,
          label: newSite.label || newSite.url,
          url: newSite.url,
          user: newSite.user,
          password: newSite.password,
        })
      }
      await settingsApi.update({
        wordpressSites: sitesToSave,
        wpCustomFields: wpCustomFields.length ? wpCustomFields : undefined,
        autoPublishOnRewriteDone,
        autoPublishStatus,
        wpFieldMap: wpFieldMap.length ? wpFieldMap : undefined,
      })
      setNewSite({ label: '', url: '', user: '', password: '' })
      setAddingSite(false)
      setEditingSiteId(null)
      const refreshed = await settingsApi.get()
      setSites(refreshed.wordpressSites || [])
      toast.success('WordPress settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const removeSite = (id: string) => setSites(prev => prev.filter(s => s.id !== id))

  const runRestApiCheck = async (siteId?: string) => {
    setRestApiCheckLoading(true)
    setRestApiCheckResult(null)
    try {
      const result = await settingsApi.checkWordpressRestApi(siteId)
      setRestApiCheckResult(result)
    } catch (err) {
      setRestApiCheckResult({
        ok: false,
        checks: [{ name: 'Request failed', url: '', ok: false, message: err instanceof Error ? err.message : 'Connection failed' }],
      })
    } finally {
      setRestApiCheckLoading(false)
    }
  }
  const addCustomField = () => setWpCustomFields(prev => [...prev, { key: '', value: '' }])
  const removeCustomField = (i: number) => setWpCustomFields(prev => prev.filter((_, j) => j !== i))
  const updateCustomField = (i: number, k: 'key' | 'value', v: string) =>
    setWpCustomFields(prev => prev.map((f, j) => (j === i ? { ...f, [k]: v } : f)))

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 size={24} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 max-w-2xl p-4 md:p-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-light)' }}>
            <Newspaper size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>WordPress</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connect multiple sites, field mapping, custom meta, auto-publish</p>
          </div>
        </div>

        {/* Multiple WordPress sites */}
        <div style={sCard}>
          <div style={sSection}>WordPress sites</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            For user list & REST API: use an <strong>Application Password</strong>, not your login password. WordPress → Users → Profile → Application Passwords → create one.
          </div>
          {sites.length === 0 && !addingSite && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>No sites connected. Add one below.</div>
          )}
          {sites.map(site => (
            <div key={site.id} style={{ marginBottom: 12, padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: site.configured ? 'var(--green-bg)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {site.configured ? <Check size={16} color="var(--green)" /> : <AlertCircle size={16} color="var(--amber)" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{site.label || site.url || 'Site'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{site.url || 'No URL'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" onClick={async () => { setWpTestingId(site.id); try { await settingsApi.testWordpress({ siteId: site.id }); toast.success('Connection OK') } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') } finally { setWpTestingId(null) } }} disabled={wpTestingId !== null} style={{ ...sBtn, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {wpTestingId === site.id ? <Loader2 size={12} style={{ animation: 'spin 0.6s linear infinite' }} /> : <RefreshCw size={12} />}
                    Test
                  </button>
                  <button type="button" onClick={() => setEditingSiteId(editingSiteId === site.id ? null : site.id)} style={sBtn}>Edit</button>
                  <button type="button" onClick={() => removeSite(site.id)} style={{ ...sBtn, color: 'var(--red)', borderColor: 'var(--red)' }}><Trash2 size={12} /></button>
                </div>
              </div>
              {editingSiteId === site.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input placeholder="Label" value={site.label} onChange={e => setSites(prev => prev.map(s => s.id === site.id ? { ...s, label: e.target.value } : s))} style={sInput} />
                  <input placeholder="Site URL" value={site.url} onChange={e => setSites(prev => prev.map(s => s.id === site.id ? { ...s, url: e.target.value } : s))} style={sInput} />
                  <input placeholder="Username (e.g. thecsr_admin)" value={site.user || ''} onChange={e => setSites(prev => prev.map(s => s.id === site.id ? { ...s, user: e.target.value } : s))} style={sInput} />
                  <input type="password" placeholder="Application password (not login password)" value={site.password || ''} onChange={e => setSites(prev => prev.map(s => s.id === site.id ? { ...s, password: e.target.value } : s))} style={sInput} />
                </div>
              )}
            </div>
          ))}
          {addingSite && (
            <div style={{ marginBottom: 12, padding: 12, background: 'var(--accent-glow)', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: 'var(--accent-light)' }}>New site</div>
              <input placeholder="Label" value={newSite.label} onChange={e => setNewSite(p => ({ ...p, label: e.target.value }))} style={sInput} />
              <input placeholder="Site URL" value={newSite.url} onChange={e => setNewSite(p => ({ ...p, url: e.target.value }))} style={{ ...sInput, marginTop: 8 }} />
              <input placeholder="Username" value={newSite.user} onChange={e => setNewSite(p => ({ ...p, user: e.target.value }))} style={{ ...sInput, marginTop: 8 }} />
              <input type="password" placeholder="Application password" value={newSite.password} onChange={e => setNewSite(p => ({ ...p, password: e.target.value }))} style={{ ...sInput, marginTop: 8 }} />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { setAddingSite(false); setNewSite({ label: '', url: '', user: '', password: '' }) }} style={sBtn}>Cancel</button>
                <button type="button" onClick={handleSave} disabled={saving || !newSite.url || !newSite.user || !newSite.password} style={{ ...sBtn, background: 'var(--accent)', color: '#fff', border: 'none' }}>Add & Save</button>
              </div>
            </div>
          )}
          {!addingSite && (
            <button type="button" onClick={() => setAddingSite(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, background: 'var(--accent-glow)', color: 'var(--accent-light)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, cursor: 'pointer' }}>
              <Plus size={14} /> Add WordPress site
            </button>
          )}
        </div>

        {/* REST API check */}
        <div style={sCard}>
          <div style={sSection}>REST API access check</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            Verify wp-json, auth, categories, tags, and users endpoints. Shows all errors and working requests.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => runRestApiCheck()}
              disabled={restApiCheckLoading || sites.length === 0}
              style={{ ...sBtn, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {restApiCheckLoading ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : <RefreshCw size={14} />}
              Check first site
            </button>
            {sites.length > 1 && sites.map(site => (
              <button
                key={site.id}
                type="button"
                onClick={() => runRestApiCheck(site.id)}
                disabled={restApiCheckLoading}
                style={{ ...sBtn, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                Check {site.label || site.url || site.id}
              </button>
            ))}
          </div>
          {restApiCheckResult && (
            <div style={{ marginTop: 16, padding: 14, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                {restApiCheckResult.ok ? (
                  <Check size={18} style={{ color: 'var(--green)' }} />
                ) : (
                  <AlertCircle size={18} style={{ color: 'var(--amber)' }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 600, color: restApiCheckResult.ok ? 'var(--green)' : 'var(--amber)' }}>
                  {restApiCheckResult.ok ? 'All checks passed' : 'Some checks failed'}
                </span>
                {restApiCheckResult.wpUrl && (
                  <a href={restApiCheckResult.wpUrl.startsWith('http') ? restApiCheckResult.wpUrl : `https://${restApiCheckResult.wpUrl}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--cyan)', textDecoration: 'none' }}>
                    {restApiCheckResult.wpUrl}/wp-json/ <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {restApiCheckResult.checks.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      background: c.ok ? 'var(--green-bg)' : 'var(--red-bg)',
                      border: c.ok ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {c.ok ? <Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /> : <AlertCircle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.ok ? 'var(--green)' : 'var(--red)' }}>{c.name}</span>
                      {c.status && <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'Geist Mono, monospace' }}>HTTP {c.status}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: c.ok ? 'var(--text-muted)' : 'var(--red)', marginLeft: 22 }}>{c.message}</div>
                    {c.details && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 22, marginTop: 2 }}>{c.details}</div>}
                    {c.url && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 22, marginTop: 4, fontFamily: 'Geist Mono, monospace', wordBreak: 'break-all' }}>{c.url}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* API & Meta reference */}
        <div style={sCard}>
          <button type="button" onClick={() => setApiRefOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCode size={16} style={{ color: 'var(--text-dim)' }} />
              <span style={sSection}>API settings & meta fields reference</span>
            </div>
            {apiRefOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {apiRefOpen && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>REST API fields (POST /wp/v2/posts)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {API_FIELDS.map(f => (
                  <div key={f.field} style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>
                    <span style={{ color: 'var(--cyan)', minWidth: 140 }}>{f.field}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{f.type}</span>
                    <span style={{ color: 'var(--text-muted)', flex: 1 }}>{f.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Meta fields (body.meta)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {META_FIELDS.map(f => (
                  <div key={f.key} style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>
                    <span style={{ color: 'var(--cyan)', minWidth: 220 }}>{f.key}</span>
                    <span style={{ color: 'var(--text-dim)' }}>← {f.source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Custom fields */}
        <div style={sCard}>
          <div style={sSection}>Custom meta fields</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Extra meta keys sent with every post. Add your theme/plugin meta keys.</div>
          {wpCustomFields.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input placeholder="meta_key" value={f.key} onChange={e => updateCustomField(i, 'key', e.target.value)} style={{ ...sInput, flex: 1, minWidth: 0 }} />
              <input placeholder="value" value={f.value} onChange={e => updateCustomField(i, 'value', e.target.value)} style={{ ...sInput, flex: 1, minWidth: 0 }} />
              <button type="button" onClick={() => removeCustomField(i)} style={{ ...sBtn, color: 'var(--red)', padding: '8px 10px' }}><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" onClick={addCustomField} style={{ ...sBtn, display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={12} /> Add custom field</button>
        </div>

        {/* Output → WP Field Map */}
        <div style={sCard}>
          <div style={sSection}>Output → WP Field Map</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Map AI rewrite outputs to WordPress fields.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowX: 'auto' }}>
            {wpFieldMap.map((row, i) => (
              <div key={row.passId} style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 280 }}>
                <input type="text" value={row.label} onChange={e => setWpFieldMap(prev => prev.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))} placeholder="Label" style={{ ...sInput, width: 100, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>→</span>
                <input type="text" value={row.wpField} onChange={e => setWpFieldMap(prev => prev.map((r, j) => (j === i ? { ...r, wpField: e.target.value } : r)))} placeholder="WP field" style={{ ...sInput, flex: 1, minWidth: 120, fontFamily: 'Geist Mono, monospace' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Auto-publish */}
        <div style={sCard}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                Auto-publish when rewrite done
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: autoPublishOnRewriteDone ? 'var(--accent-glow)' : 'var(--surface)', color: autoPublishOnRewriteDone ? 'var(--accent-light)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>{autoPublishOnRewriteDone ? 'On' : 'Off'}</span>
                {autoPublishOnRewriteDone && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)' }}>{WORDPRESS_STATUSES.find(s => s.id === autoPublishStatus)?.label}</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Publishes to first connected site when AI rewrite completes</div>
              {autoPublishOnRewriteDone && (
                <select value={autoPublishStatus} onChange={e => setAutoPublishStatus(e.target.value as 'draft' | 'schedule' | 'publish')} style={{ ...sInput, marginTop: 12, maxWidth: 280 }}>
                  {WORDPRESS_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              )}
            </div>
            <button type="button" onClick={() => setAutoPublishOnRewriteDone(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, background: autoPublishOnRewriteDone ? 'var(--accent)' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 2, left: autoPublishOnRewriteDone ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 24px', minHeight: 46, background: saving ? 'var(--accent-glow)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: saving ? 'none' : '0 2px 12px rgba(124,58,237,0.3)' }}>
          {saving ? <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Check size={16} />}
          Save WordPress Settings
        </button>

        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Link href="/scraper/inbox/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, background: 'var(--accent-glow)', color: 'var(--accent-light)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, textDecoration: 'none', fontWeight: 500 }}>
            <Inbox size={14} /> Open Inbox
          </Link>
          <Link href="/settings/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
            <SettingsIcon size={14} /> General settings
          </Link>
          {sites[0]?.url && (
            <a href={sites[0].url.startsWith('http') ? sites[0].url : `https://${sites[0].url}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
              <ExternalLink size={14} /> Open WordPress
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
