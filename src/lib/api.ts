import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios'
import type { CreateSourceInput } from '@/types/source'
import type { WpPublishHistoryEntry } from '@/types/article'
import { getStoredToken, useAuthStore } from './auth-store'
import { normalizeAppPathname } from './pathname'

/** Readable message for toast — avoids raw "Request failed with status code 500". */
export function getApiErrorMessage(err: unknown): string {
  const ax = err as AxiosError<unknown>
  const status = ax.response?.status
  const data: unknown = ax.response?.data

  if (typeof data === 'string' && data.trim()) {
    const stripped = data.replace(/<[^>]+>/g, '').trim().slice(0, 240)
    if (stripped) return stripped
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    if (typeof o.error === 'string' && o.error) return o.error
    if (typeof o.message === 'string' && o.message) return o.message
  }
  if (ax.code === 'ECONNABORTED') return 'Request timed out'
  if (ax.code === 'ERR_NETWORK' || !ax.response) {
    return 'Cannot reach API. Start contentflow-backend (port 4500) and confirm NEXT_PUBLIC_API_URL in .env.local.'
  }
  if (status === 502 || status === 503 || status === 504) {
    return `API unavailable (${status}). Is the backend running?`
  }
  if (status === 500) {
    return 'Server error (500). Check the backend terminal for stack traces.'
  }
  if (status === 404) return 'Not found'
  return ax.message || 'Request failed'
}

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
      const isAuthEndpoint =
        url.includes('auth/login') ||
        url.includes('auth/register') ||
        url.includes('auth/studio/login') ||
        url.includes('auth/cms/login') ||
        url.includes('auth/refresh') ||
        url.includes('/auth/invite/')
      if (isAuthEndpoint) {
        const msg = getApiErrorMessage(err) || 'Invalid email or password'
        return Promise.reject(new Error(String(msg)))
      }
      if (typeof window !== 'undefined') {
        const path = normalizeAppPathname(window.location.pathname)
        const onCms = path.startsWith('/cms') && path !== '/cms/login'
        if (onCms) {
          useAuthStore.getState().clearCmsAuth()
          window.location.href = '/cms/login/'
        } else {
          useAuthStore.getState().clearAuth()
          const next = encodeURIComponent(window.location.pathname + window.location.search)
          window.location.href = `/login/?next=${next}`
        }
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
    return Promise.reject(new Error(getApiErrorMessage(err)))
  }
)

export interface BackendStatusServices {
  api: { ok: boolean; message: string }
  data: { ok: boolean; message: string }
  ollama: { ok: boolean; configured: boolean; message: string }
  openai: { ok: boolean; configured: boolean; message: string }
  wordpress: { ok: boolean; configured: boolean; message: string }
}

export const healthApi = {
  /** Backend may probe Ollama Cloud (up to ~10s); allow headroom for slow networks. */
  status: () =>
    api.get<{ ok: boolean; services?: BackendStatusServices; error?: string }>('/status', { timeout: 15000 }),
}

export interface AuthUserDto {
  id: string
  email: string
  name: string
  isAdmin?: boolean
  role?: string
  access?: ('studio' | 'cms')[]
}

export const authApi = {
  register: (data: { email: string; password: string; name?: string; inviteToken?: string }) =>
    api.post<{ data: { user: AuthUserDto; token: string } }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ data: { user: AuthUserDto; token: string; redirect?: string } }>('/auth/login', data),
  loginStudio: (data: { email: string; password: string }) =>
    api.post<{ data: { user: AuthUserDto; token: string; redirect?: string } }>('/auth/studio/login', data),
  loginCms: (data: { email: string; password: string }) =>
    api.post<{ data: { user: AuthUserDto; token: string; redirect?: string } }>('/auth/cms/login', data),
  refresh: () =>
    api.post<{ data: { token: string; user: AuthUserDto } }>('/auth/refresh'),
  logout: () => api.post<{ data: { ok: boolean } }>('/auth/logout'),
  me: () => api.get<{ data: { user: AuthUserDto } }>('/auth/me'),
  updateProfile: (data: { name?: string }) =>
    api.patch<{ data: { user: { id: string; email: string; name: string } } }>('/auth/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<{ data: { ok: boolean } }>('/auth/password', data),
}

/**
 * Parse POST /auth/* success body: `{ data: { user, token, redirect? } }` or a flat `{ user, token }`.
 */
export function parseAuthSuccessPayload(res: { data?: unknown }): {
  token: string
  user: AuthUserDto
  redirect?: string
} {
  const body = res?.data as Record<string, unknown> | null | undefined
  if (!body) throw new Error('Empty response from server')

  const tryPick = (o: Record<string, unknown> | undefined | null) => {
    if (!o || typeof o !== 'object') return null
    const token = o.token
    const user = o.user
    if (typeof token === 'string' && user && typeof user === 'object') {
      return {
        token,
        user: user as AuthUserDto,
        redirect: typeof o.redirect === 'string' ? o.redirect : undefined,
      }
    }
    return null
  }

  const nested = tryPick(body.data as Record<string, unknown> | undefined)
  if (nested) return nested
  const flat = tryPick(body)
  if (flat) return flat
  throw new Error('Invalid auth response from server')
}

/** Use `/auth/studio/login`; if the API returns 404 (older backend), fall back to `/auth/login`. */
export async function authLoginStudioCompat(credentials: { email: string; password: string }) {
  try {
    return await authApi.loginStudio(credentials)
  } catch (err) {
    const ax = err as AxiosError
    if (ax.response?.status === 404) {
      return await authApi.login(credentials)
    }
    throw err
  }
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
  /** When true, only articles flagged as trending (Pending + My sources still apply). */
  trendingOnly?: boolean
}

export const inboxApi = {
  list: (params: InboxListParams) => api.get('/inbox', { params, timeout: 6000 }),
  get:     (id: string)  => api.get(`/inbox/${id}`),
  approve: (id: string)  => api.post(`/inbox/${id}/approve`, { approvedBy: 'admin' }),
  reject:  (id: string, reason?: string) =>
    api.post(`/inbox/${id}/reject`, { rejectedBy: 'admin', reason }),
  /** Rejected → Pending (manual undo). */
  restore: (id: string) => api.post(`/inbox/${id}/restore`, {}),
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

export interface ApprovalStats {
  pending: number
  autoApprovedToday: number
  humanReviewed: number
  rejected: number
  published: number
  autoRate: number
}

export interface AutoApproveSettings {
  enabled: boolean
  threshold: number
  trustedSources: string[]
  blockedKeywords: string[]
  publishDelay: number
  notifyOnReject: boolean
}

export const trendsApi = {
  get: () => api.get<{ success: boolean; data: { trends: { lastFetched: string | null; all: unknown[]; english: unknown[]; hindi: unknown[]; realtime: unknown[] } } }>('/trends').then(r => r.data.data.trends),
  fetch: () => api.post<{ success: boolean; trendsCount?: number; matchesCount?: number; trends?: unknown[]; error?: string }>('/trends/fetch').then(r => r.data),
  trendingInbox: () => api.get<{ success: boolean; data: { articles: unknown[] } }>('/articles/trending-inbox').then(r => r.data.data.articles),
  settings: {
    get: () => api.get<{ data: { enabled: boolean; fetchInterval: number; autoAddToInbox: boolean; autoRewrite: boolean; autoPublish: boolean } }>('/trends/settings').then(r => r.data.data),
    save: (s: Record<string, unknown>) => api.post<{ success: boolean; data: unknown }>('/trends/settings', s).then(r => r.data.data),
  },
}

export const websiteApi = {
  /** Normalizes `{ article }`, `{ data: { article } }`, or nested `slug` from common backend shapes. */
  publish: async (
    articleId: string,
    overrides?: { title?: string; featuredImage?: string; category?: string; language?: string }
  ) => {
    const r = await api.post<unknown>('/website/publish', { articleId, overrides })
    const d = r.data as Record<string, unknown>
    const inner =
      d.data && typeof d.data === 'object' ? (d.data as Record<string, unknown>) : null
    const article = (d.article ?? inner?.article) as { slug?: string; id?: string } | undefined
    const slug = article?.slug
    if (slug) return { slug, id: article?.id }
    const err =
      (typeof d.error === 'string' && d.error) ||
      (typeof d.message === 'string' && d.message) ||
      'No slug in publish response'
    throw new Error(err)
  },
}

export interface CmsWebsiteArticle {
  id: string
  slug: string
  title?: string
  seoTitle?: string
  /** Meta description for search / social previews */
  seoDescription?: string
  metaDescription?: string
  /** Article HTML shown on the reader site */
  content?: string
  body?: string
  featuredImage?: string
  language?: string
  status?: string
  category?: string
  updatedAt?: string
  createdAt?: string
  views?: number
}

/** Body for PUT /website/cms/articles/:id (field names follow common backend conventions). */
export type CmsWebsiteArticleUpdate = Partial<{
  title: string
  slug: string
  seoTitle: string
  seoDescription: string
  metaDescription: string
  content: string
  body: string
  category: string
  language: string
  featuredImage: string
  status: string
}>

export const cmsApi = {
  listArticles: (params?: { status?: string; category?: string; language?: string }) =>
    api.get<{ articles: CmsWebsiteArticle[]; total: number }>('/website/cms/articles', { params }).then(r => r.data),
}

export const approvalApi = {
  pending: () =>
    api.get<{ data: { items: import('@/types/article').ScraperArticle[] } }>('/articles/pending').then(r => r.data.data.items),
  stats: () =>
    api.get<{ data: ApprovalStats }>('/articles/approval-stats').then(r => r.data.data),
  autoReview: (id: string) =>
    api.post<{ data: { score: number; reasons: string[]; autoApprove: boolean; approvalStatus: string } }>(`/articles/${id}/auto-review`).then(r => r.data.data),
  approve: (id: string) =>
    api.post<{ data: { id: string; approvalStatus: string } }>(`/articles/${id}/approve`).then(r => r.data.data),
  reject: (id: string, reason: string) =>
    api.post<{ data: { id: string; approvalStatus: string } }>(`/articles/${id}/reject`, { reason }).then(r => r.data.data),
  edit: (id: string, rewritten: Record<string, string>) =>
    api.post<{ data: { id: string; approvalStatus: string } }>(`/articles/${id}/edit`, { rewritten }).then(r => r.data.data),
  autoApproveSettings: {
    get: () => api.get<{ data: AutoApproveSettings }>('/settings/auto-approve').then(r => r.data.data),
    save: (s: Partial<AutoApproveSettings>) =>
      api.post<{ data: AutoApproveSettings }>('/settings/auto-approve', s).then(r => r.data.data),
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

export type PublishApi = typeof publishApi

export type { WpPublishHistoryEntry }

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

export type WpMetaApi = typeof wpMetaApi
export type MediaApi = typeof mediaApi

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
  /** Ollama Cloud API keys (optional for local Ollama). Multiple keys rotate round-robin. */
  ollama?: {
    configured: boolean
    keyMask: string
    keyMasks?: string[]
    keyCount?: number
    keysFromEnv?: boolean
  }
  aiModel: string
  /** Default: Ollama first, then ChatGPT if Ollama fails. */
  rewriteProvider?: 'ollama_first' | 'openai_only'
  ollamaBaseUrl?: string
  ollamaModel?: string
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
  /** GA4 Measurement ID (G-XXXXXXXX). Env `GOOGLE_ANALYTICS_MEASUREMENT_ID` overrides saved value when set. */
  googleAnalyticsMeasurementId?: string
  /** HTML tag verification: value of `content` in Search Console’s meta tag. */
  googleSearchConsoleVerification?: string
  /** AdSense publisher ID (ca-pub-…). Env `GOOGLE_ADSENSE_PUBLISHER_ID` overrides when set. */
  googleAdsensePublisherId?: string
  /** Taboola publisher / account id used in placement scripts. */
  taboolaPublisherId?: string
  googleAnalyticsFromEnv?: boolean
  googleAdsenseFromEnv?: boolean
}

export const teamApi = {
  listUsers: () => api.get<{ data: { users: AuthUserDto[] } }>('/team/users').then(r => r.data.data),
  updateUser: (id: string, body: { name?: string; role?: string; access?: ('studio' | 'cms')[] }) =>
    api.put<{ data: { user: AuthUserDto } }>(`/team/users/${id}`, body).then(r => r.data.data),
  deleteUser: (id: string) => api.delete<{ data: { ok: boolean } }>(`/team/users/${id}`).then(r => r.data.data),
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
    rewriteProvider?: 'ollama_first' | 'openai_only'
    ollamaBaseUrl?: string
    ollamaModel?: string
    ollamaApiKey?: string
    ollamaApiKeys?: string[]
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
    googleAnalyticsMeasurementId?: string
    googleSearchConsoleVerification?: string
    googleAdsensePublisherId?: string
    taboolaPublisherId?: string
  }) => api.put<{ data: SettingsData }>('/settings', data).then(r => r.data.data),
}

export type SettingsApi = typeof settingsApi
