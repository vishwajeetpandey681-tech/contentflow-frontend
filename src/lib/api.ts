import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { CreateSourceInput } from '@/types/source'
import { getStoredToken, useAuthStore } from './auth-store'

const getApiBase = () => {
  if (typeof window !== 'undefined') return '/api'
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4500/api'
}

export const api = axios.create({
  baseURL: getApiBase(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  return config
})

/** On 401: clear auth and redirect to login. Skip for login/register — they use 401 for invalid credentials. */
api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      const url = String(err.config?.url ?? '')
      const isAuthEndpoint = url.includes('auth/login') || url.includes('auth/register')
      if (isAuthEndpoint) {
        const body = err.response?.data
        const msg = (typeof body === 'object' && body?.error) || 'Invalid email or password'
        return Promise.reject(new Error(String(msg)))
      }
      useAuthStore.getState().clearAuth()
      if (typeof window !== 'undefined') {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login/?next=${next}`
      }
      return Promise.reject(new Error('Session expired'))
    }
    const config = err.config as InternalAxiosRequestConfig & { __retryCount?: number }
    const maxRetries = 2
    const retryCount = config.__retryCount ?? 0
    const shouldRetry =
      retryCount < maxRetries &&
      (!err.response || err.response.status >= 500) &&
      (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || !err.response)
    if (shouldRetry) {
      config.__retryCount = retryCount + 1
      const delay = 500 * Math.pow(2, retryCount)
      await new Promise(r => setTimeout(r, delay))
      return api.request(config)
    }
    const body = err.response?.data
    const msg =
      (typeof body === 'object' && body?.error) ||
      (err.code === 'ECONNABORTED' ? 'Request timed out' : err.message) ||
      (err.response?.status === 404 ? 'Not found' : 'Request failed')
    return Promise.reject(new Error(String(msg)))
  }
)

export interface BackendStatusServices {
  api: { ok: boolean; message: string }
  data: { ok: boolean; message: string }
  openai: { ok: boolean; configured: boolean; message: string }
  wordpress: { ok: boolean; configured: boolean; message: string }
}

export const healthApi = {
  status: () =>
    api.get<{ ok: boolean; services?: BackendStatusServices; error?: string }>('/status', { timeout: 5000 }),
}

export const authApi = {
  register: (data: { email: string; password: string; name?: string; inviteToken?: string }) =>
    api.post<{ data: { user: { id: string; email: string; name: string }; token: string } }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ data: { user: { id: string; email: string; name: string }; token: string } }>('/auth/login', data),
  me: () => api.get<{ data: { user: { id: string; email: string; name: string; isAdmin?: boolean } } }>('/auth/me'),
  updateProfile: (data: { name?: string }) =>
    api.patch<{ data: { user: { id: string; email: string; name: string } } }>('/auth/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<{ data: { ok: boolean } }>('/auth/password', data),
}

export const sourcesApi = {
  list: () => api.get('/sources', { timeout: 6000 }),
  create:  (data: CreateSourceInput) => api.post('/sources', data),
  update:  (id: string, data: Partial<CreateSourceInput> & { isActive?: boolean; isBlocked?: boolean; blockedReason?: string | null }) => api.put(`/sources/${id}`, data),
  updatePrefs: (id: string, data: { customPrompt?: string | null; isActive?: boolean }) =>
    api.patch<{ data: { customPrompt?: string | null; isActive?: boolean } }>(`/sources/${id}/prefs`, data),
  delete:  (id: string) => api.delete(`/sources/${id}`),
  trigger: (id: string) => api.post<{ data: { scraped: number; duplicatesSkipped?: number; fullFetched?: number; message?: string } }>(`/sources/${id}/trigger`, {}, { timeout: 120000 }),
  validateUrl: (url: string) =>
    api.post<{ ok: boolean; type: string | null; error?: string; note?: string; metadata?: { title: string | null; description: string | null; favicon: string | null } }>('/sources/validate-url', { url }, { timeout: 15000 }),
  importSources: (sources: { name: string; url: string; type?: string }[]) =>
    api.post<{ data: { created: number; sources: unknown[]; errors: { index: number; name: string; error: string }[] } }>('/sources/import', { sources }, { timeout: 60000 }),
}

export interface ScrapeLogEntry {
  id: string
  sourceId: string
  sourceName: string
  scraped: number
  duplicatesSkipped: number
  fullFetched?: number
  success: boolean
  error?: string
  at: string
}

export const logsApi = {
  list: (params?: { fromDate?: string; toDate?: string }) =>
    api.get<{ data: ScrapeLogEntry[] }>('/logs', { params, timeout: 6000 }).then(r => r.data.data),
  /** Delete logs older than the given number of hours (default 72). Returns count deleted. */
  cleanup: (olderThanHours = 72) =>
    api.delete<{ data: { deleted: number } }>('/logs/cleanup', { params: { olderThanHours }, timeout: 15000 }).then(r => r.data.data),
}

export interface InboxListParams {
  status?: string
  page?: number
  limit?: number
  search?: string
  category?: string
  fromDate?: string
  toDate?: string
  published?: boolean
  activeSourcesOnly?: boolean
  sourceId?: string
  isRead?: boolean
  isStarred?: boolean
}

export const inboxApi = {
  list: (params: InboxListParams) => api.get('/inbox', { params, timeout: 6000 }),
  get:     (id: string)  => api.get(`/inbox/${id}`),
  approve: (id: string)  => api.post(`/inbox/${id}/approve`, { approvedBy: 'admin' }),
  reject:  (id: string, reason?: string) =>
    api.post(`/inbox/${id}/reject`, { rejectedBy: 'admin', reason }),
  delete:  (id: string)  => api.delete(`/inbox/${id}`),
  unlinkWpPublish: (id: string) => api.delete(`/inbox/${id}/wp-publish`),
  markRead: (id: string, read: boolean) => api.patch(`/inbox/${id}/read`, { read }),
  markStar: (id: string, starred: boolean) => api.patch(`/inbox/${id}/star`, { starred }),
  bulk: (action: 'delete' | 'rewrite' | 'markRead' | 'markUnread' | 'star' | 'unstar', ids: string[]) =>
    api.post<{ data: { processed: number; errors: { id: string; error: string }[] } }>('/inbox/bulk', { action, ids }, { timeout: 300000 }),
  stats: () => api.get('/inbox/meta/stats', { timeout: 6000 }),
  fetchFull: (id: string) => api.post(`/inbox/${id}/fetch`),
  extractImage: (id: string) => api.post<{ data: { image: string } }>(`/inbox/${id}/extract-image`).then(r => r.data.data),
  rewrite: (id: string)  => api.post(`/inbox/${id}/rewrite`),
  lock: (id: string, takeOver?: boolean) =>
    api.post<{ data: { locked: true; lockedBy: string; lockedByName: string; lockExpiresAt: string } }>(
      `/inbox/${id}/lock`,
      {},
      { params: takeOver ? { takeOver: 'true' } : undefined }
    ),
  unlock: (id: string) => api.post<{ data: { unlocked: boolean } }>(`/inbox/${id}/unlock`),
  heartbeat: (id: string) =>
    api.post<{ data: { extended: boolean; lockExpiresAt: string } }>(`/inbox/${id}/heartbeat`),
}

export interface RewriteStartOpts {
  outputLanguage?: string
  customPrompt?: string
  headingFormat?: string
  subheadingFormat?: string
  paragraphTag?: string
  tone?: string
  targetAudience?: string
  customInstruction?: string
  targetWordCount?: number
}

export const rewriteApi = {
  get:      (articleId: string) => api.get(`/rewrite/${articleId}`),
  start:    (articleId: string, opts?: RewriteStartOpts) =>
    api.post(`/rewrite/${articleId}/start`, opts || {}),
  rerun:    (articleId: string, passIds: string[], opts?: RewriteStartOpts) =>
    api.post(`/rewrite/${articleId}/rerun`, { passIds, ...opts }),
  updatePass: (articleId: string, passId: string, output: string) =>
    api.put(`/rewrite/${articleId}/pass/${passId}`, { output }),
  updateCustomFooter: (articleId: string, customFooter: string | null) =>
    api.patch(`/rewrite/${articleId}`, { customFooter }),
  quality:  (articleId: string) =>
    api.get<{ data: import('@/types/article').RewriteQuality | null }>(`/rewrite/${articleId}/quality`).then(r => r.data.data),
  versions: {
    list:   (articleId: string) => api.get<{ data: import('@/types/article').RewriteVersion[] }>(`/rewrite/${articleId}/versions`).then(r => r.data.data),
    save:   (articleId: string, label?: string) => api.post<{ data: import('@/types/article').RewriteVersion }>(`/rewrite/${articleId}/versions`, { label }),
    restore: (articleId: string, versionId: string) => api.post(`/rewrite/${articleId}/versions/${versionId}/restore`),
  },
  suggestHeadlines: (articleId: string) =>
    api.post<{ data: { headlines: string[] } }>(`/rewrite/${articleId}/suggest-headlines`).then(r => r.data.data),
  suggestKeywords: (articleId: string) =>
    api.post<{ data: { keywords: string[] } }>(`/rewrite/${articleId}/suggest-keywords`).then(r => r.data.data),
  batch: {
    queue: (ids: string[], opts?: Record<string, unknown>) =>
      api.post<{ data: { queued: number; total: number } }>('/rewrite/batch/queue', { ids, opts }),
    status: () =>
      api.get<{ data: { queue: { id: string; articleId: string; status: string; error?: string; completedAt?: string }[]; total: number; pending: number; running: number; done: number; failed: number } }>('/rewrite/batch/status').then(r => r.data.data),
  },
}

export const publishApi = {
  wordpress: (
    articleId: string,
    options: {
      status?: string
      categoryId?: string
      authorId?: string
      tagIds?: number[]
      featuredMediaId?: number
      wordpressSiteId?: string
      customTitle?: string
      seoTitle?: string
      seoMetaDesc?: string
      scheduleDate?: string
    }
  ) => api.post<{ data: { id?: number; link?: string; status?: string; success?: boolean; _siteId?: string; _siteLabel?: string } }>(`/publish/${articleId}/wordpress`, options).then(r => r.data.data),
  /** Upload article's source image to WP Media. Returns { id, url }. */
  uploadSourceImage: (articleId: string, wordpressSiteId?: string) =>
    api.post<{ data: { id: number; url: string } }>(`/publish/${articleId}/upload-source-image`, { wordpressSiteId }).then(r => r.data.data),
  unpublish: (articleId: string, wordpressSiteId?: string) =>
    api.post<{ data: { success: boolean } }>(`/publish/${articleId}/unpublish`, { wordpressSiteId }).then(r => r.data.data),
  history: (articleId: string) =>
    api.get<{ data: WpPublishHistoryEntry[] }>(`/publish/${articleId}/history`).then(r => r.data.data),
  wpStatus: (articleId: string, siteId?: string) =>
    api.get<{ data: { published: boolean; postId?: number; status?: string; link?: string; title?: string } }>(`/publish/${articleId}/wp-status`, { params: siteId ? { siteId } : {} }).then(r => r.data.data),
}

export interface WpPublishHistoryEntry {
  id: string
  siteId: string
  siteLabel: string
  siteUrl?: string
  attemptedAt: string
  publishedAt?: string
  status: 'published' | 'draft' | 'scheduled' | 'failed' | 'unpublished' | 'pending'
  postId?: number | null
  postUrl?: string | null
  title?: string
  error?: string | null
}

export const wpMetaApi = {
  categories: (siteId?: string) =>
    api.get<{ data: { id: number; name: string; parent: number }[] }>('/settings/wordpress/categories', { params: siteId ? { siteId } : {} }).then(r => r.data.data),
  tags: (siteId?: string) =>
    api.get<{ data: { id: number; name: string }[] }>('/settings/wordpress/tags', { params: siteId ? { siteId } : {} }).then(r => r.data.data),
  users: (siteId?: string) =>
    api.get<{ data: { id: number; name: string; slug: string }[] }>('/settings/wordpress/users', { params: siteId ? { siteId } : {} }).then(r => r.data.data),
  /** Upload a file to WordPress Media Library via backend proxy. Returns the new media ID. */
  uploadImage: (file: File, siteId?: string) =>
    api.post<{ data: { id: number; url: string; filename: string } }>(
      `/settings/wordpress/media?filename=${encodeURIComponent(file.name)}${siteId ? `&siteId=${encodeURIComponent(siteId)}` : ''}`,
      file,
      { headers: { 'Content-Type': file.type || 'image/webp' }, timeout: 60000 }
    ).then(r => r.data.data),
}

export interface WpMediaItem {
  id: number
  date: string
  title: string
  source_url: string
  mime_type: string
  alt_text: string
}

export const mediaApi = {
  list: (opts?: { siteId?: string; page?: number; per_page?: number; search?: string }) =>
    api.get<{ data: { items: WpMediaItem[]; total: number } }>('/settings/wordpress/media', {
      params: { siteId: opts?.siteId, page: opts?.page ?? 1, per_page: opts?.per_page ?? 24, search: opts?.search },
    }).then(r => r.data.data),
  delete: (id: number, siteId?: string) =>
    api.delete<{ data: { deleted: boolean; id: number } }>(`/settings/wordpress/media/${id}`, { params: { siteId } }).then(r => r.data.data),
  fetchFromUrl: (url: string, siteId?: string) =>
    api.post<{ data: { id: number; url: string } }>('/settings/wordpress/media/fetch', { url }, { params: { siteId } }).then(r => r.data.data),
  upload: (file: File, siteId?: string) => wpMetaApi.uploadImage(file, siteId),
}

export interface WpFieldMapEntry {
  passId: string
  label: string
  wpField: string
}

export interface WpSiteEntry {
  id: string
  label: string
  url: string
  user?: string
  password?: string
  configured?: boolean
}

export interface WpCustomFieldEntry {
  key: string
  value: string
}

export interface SettingsData {
  openai: { configured: boolean; keyMask: string }
  aiModel: string
  wordpress: { url: string; configured: boolean }
  wordpressSites?: WpSiteEntry[]
  wpCustomFields?: WpCustomFieldEntry[]
  wpFieldMap?: WpFieldMapEntry[]
  autoPublishOnRewriteDone?: boolean
  autoPublishStatus?: 'draft' | 'schedule' | 'publish'
  globalPrompt?: string
  dedupeHeadlinesAcrossSources?: boolean
  headlineSimilarityThreshold?: number
  teamName?: string
  teamDescription?: string
  environment?: 'development' | 'staging' | 'production'
  timezone?: string
  logRetentionHours?: number
  residentialProxyUrl?: string | null
  residentialProxyConfigured?: boolean
  residentialProxyDisabled?: boolean
}

export const teamApi = {
  listUsers: () => api.get<{ data: { users: { id: string; email: string; name: string }[] } }>('/team/users').then(r => r.data.data),
  listInvites: () => api.get<{ data: { invites: { email: string; token: string; createdAt: string; expiresAt: string }[] } }>('/team/invites').then(r => r.data.data),
  createInvite: (email: string) =>
    api.post<{ data: { invite: { email: string; token: string; createdAt: string; expiresAt: string }; inviteLink: string } }>('/team/invites', { email }).then(r => r.data.data),
  revokeInvite: (token: string) => api.delete<{ data: { ok: boolean } }>(`/team/invites/${token}`).then(r => r.data.data),
}

export const authApiInvite = {
  validate: (token: string) => api.get<{ data: { valid: boolean; email?: string } }>(`/auth/invite/${token}`).then(r => r.data.data),
}

export const settingsApi = {
  get: () => api.get<{ data: SettingsData }>('/settings').then(r => r.data.data),
  testWordpress: (creds?: { url?: string; user?: string; password?: string; siteId?: string }) =>
    api.post<{ data: { ok: boolean; user?: string } }>('/settings/wordpress/test', creds).then(r => r.data.data),
  checkWordpressRestApi: (siteId?: string) =>
    api.post<{ data: { ok: boolean; checks: { name: string; url: string; ok: boolean; status?: number; message: string; details?: string }[]; wpUrl?: string } }>('/settings/wordpress/check-rest-api', { siteId }).then(r => r.data.data),
  update: (data: {
    openaiApiKey?: string
    aiModel?: string
    wordpressUrl?: string
    wordpressUser?: string
    wordpressPassword?: string
    wordpressSites?: WpSiteEntry[]
    wpCustomFields?: WpCustomFieldEntry[]
    autoPublishOnRewriteDone?: boolean
    autoPublishStatus?: 'draft' | 'schedule' | 'publish'
    globalPrompt?: string
    dedupeHeadlinesAcrossSources?: boolean
    headlineSimilarityThreshold?: number
    wpFieldMap?: WpFieldMapEntry[]
    teamName?: string
    teamDescription?: string
    environment?: 'development' | 'staging' | 'production'
    timezone?: string
    logRetentionHours?: number
    residentialProxyUrl?: string | null
  }) => api.put<{ data: SettingsData }>('/settings', data).then(r => r.data.data),
}
