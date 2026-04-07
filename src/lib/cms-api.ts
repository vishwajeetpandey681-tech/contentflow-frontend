/**
 * CMS workspace HTTP client: always sends the CMS JWT only (never the Studio token).
 * Use for all `/cms/**` editorial flows so CMS stays independent from Studio auth.
 */
import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { CreateSourceInput } from '@/types/source'
import { useAuthStore } from './auth-store'
import { getApiErrorMessage, inboxApi } from './api'
import type {
  InboxListParams,
  RewriteStartOpts,
  SettingsData,
  WpFieldMapEntry,
  WpSiteEntry,
  WpCustomFieldEntry,
  PublishApi,
  WpMetaApi,
  MediaApi,
  SettingsApi,
} from './api'
import type { WpPublishHistoryEntry } from '@/types/article'
import type { CmsWebsiteArticle, CmsWebsiteArticleUpdate } from './api'

const studioOnlyWp = () => {
  throw new Error('WordPress publishing and media are only available in Studio.')
}

/** Satisfies `PublishApi` — CMS uses the news website (`websiteApi`) instead of WordPress. */
export const cmsPublishApiStub: PublishApi = {
  wordpress: async () => studioOnlyWp(),
  uploadSourceImage: async () => studioOnlyWp(),
  unpublish: async () => studioOnlyWp(),
  history: async (_articleId: string): Promise<WpPublishHistoryEntry[]> => [],
  wpStatus: async () => ({ published: false }),
}

/** Satisfies `WpMetaApi` — not used in CMS workspace. */
export const cmsWpMetaApiStub: WpMetaApi = {
  categories: async () => [],
  tags: async () => [],
  users: async () => [],
  uploadImage: async () => studioOnlyWp(),
}

/** Satisfies `MediaApi` — WordPress media library is Studio-only. */
export const cmsMediaApiStub: MediaApi = {
  list: async () => ({ items: [], total: 0 }),
  delete: async () => ({ deleted: false, id: 0 }),
  fetchFromUrl: async () => studioOnlyWp(),
  upload: async () => studioOnlyWp(),
}

const getApiBase = () => {
  if (typeof window !== 'undefined') return '/api'
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4500/api'
}

export const cmsHttp = axios.create({
  baseURL: getApiBase(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

cmsHttp.interceptors.request.use(config => {
  const token = useAuthStore.getState().cmsToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  return config
})

cmsHttp.interceptors.response.use(
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
        useAuthStore.getState().clearCmsAuth()
        window.location.href = '/cms/login/'
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
      return cmsHttp.request(config)
    }
    return Promise.reject(new Error(getApiErrorMessage(err)))
  }
)

export const cmsInboxApi = {
  list: (params: InboxListParams) => cmsHttp.get('/inbox', { params, timeout: 6000 }),
  get: (id: string) => cmsHttp.get(`/inbox/${id}`),
  approve: (id: string) => cmsHttp.post(`/inbox/${id}/approve`, { approvedBy: 'admin' }),
  reject: (id: string, reason?: string) =>
    cmsHttp.post(`/inbox/${id}/reject`, { rejectedBy: 'admin', reason }),
  restore: (id: string) => cmsHttp.post(`/inbox/${id}/restore`, {}),
  delete: (id: string) => cmsHttp.delete(`/inbox/${id}`),
  /** Studio-only; satisfies shared `inboxApi` typing — CMS UI never calls this. */
  unlinkWpPublish: ((id: string) =>
    Promise.reject(new Error('WordPress actions are only available in Studio.'))) as typeof inboxApi.unlinkWpPublish,
  markRead: (id: string, read: boolean) => cmsHttp.patch(`/inbox/${id}/read`, { read }),
  markStar: (id: string, starred: boolean) => cmsHttp.patch(`/inbox/${id}/star`, { starred }),
  bulk: (action: 'delete' | 'rewrite' | 'markRead' | 'markUnread' | 'star' | 'unstar', ids: string[]) =>
    cmsHttp.post<{ data: { processed: number; errors: { id: string; error: string }[] } }>('/inbox/bulk', { action, ids }, { timeout: 300000 }),
  stats: () => cmsHttp.get('/inbox/meta/stats', { timeout: 6000 }),
  fetchFull: (id: string) => cmsHttp.post(`/inbox/${id}/fetch`),
  extractImage: (id: string) => cmsHttp.post<{ data: { image: string } }>(`/inbox/${id}/extract-image`).then(r => r.data.data),
  rewrite: (id: string) => cmsHttp.post(`/inbox/${id}/rewrite`),
  lock: (id: string, takeOver?: boolean) =>
    cmsHttp.post<{ data: { locked: true; lockedBy: string; lockedByName: string; lockExpiresAt: string } }>(
      `/inbox/${id}/lock`,
      {},
      { params: takeOver ? { takeOver: 'true' } : undefined }
    ),
  unlock: (id: string) => cmsHttp.post<{ data: { unlocked: boolean } }>(`/inbox/${id}/unlock`),
  heartbeat: (id: string) =>
    cmsHttp.post<{ data: { extended: boolean; lockExpiresAt: string } }>(`/inbox/${id}/heartbeat`),
}

export const cmsRewriteApi = {
  get: (articleId: string) => cmsHttp.get(`/rewrite/${articleId}`),
  start: (articleId: string, opts?: RewriteStartOpts) => cmsHttp.post(`/rewrite/${articleId}/start`, opts || {}),
  rerun: (articleId: string, passIds: string[], opts?: RewriteStartOpts) =>
    cmsHttp.post(`/rewrite/${articleId}/rerun`, { passIds, ...opts }),
  updatePass: (articleId: string, passId: string, output: string) =>
    cmsHttp.put(`/rewrite/${articleId}/pass/${passId}`, { output }),
  updateCustomFooter: (articleId: string, customFooter: string | null) =>
    cmsHttp.patch(`/rewrite/${articleId}`, { customFooter }),
  quality: (articleId: string) =>
    cmsHttp.get<{ data: import('@/types/article').RewriteQuality | null }>(`/rewrite/${articleId}/quality`).then(r => r.data.data),
  versions: {
    list: (articleId: string) =>
      cmsHttp.get<{ data: import('@/types/article').RewriteVersion[] }>(`/rewrite/${articleId}/versions`).then(r => r.data.data),
    save: (articleId: string, label?: string) =>
      cmsHttp.post<{ data: import('@/types/article').RewriteVersion }>(`/rewrite/${articleId}/versions`, { label }),
    restore: (articleId: string, versionId: string) =>
      cmsHttp.post(`/rewrite/${articleId}/versions/${versionId}/restore`),
  },
  suggestHeadlines: (articleId: string) =>
    cmsHttp.post<{ data: { headlines: string[] } }>(`/rewrite/${articleId}/suggest-headlines`).then(r => r.data.data),
  suggestKeywords: (articleId: string) =>
    cmsHttp.post<{ data: { keywords: string[] } }>(`/rewrite/${articleId}/suggest-keywords`).then(r => r.data.data),
  batch: {
    queue: (ids: string[], opts?: Record<string, unknown>) =>
      cmsHttp.post<{ data: { queued: number; total: number } }>('/rewrite/batch/queue', { ids, opts }),
    status: () =>
      cmsHttp
        .get<{
          data: {
            queue: { id: string; articleId: string; status: string; error?: string; completedAt?: string }[]
            total: number
            pending: number
            running: number
            done: number
            failed: number
          }
        }>('/rewrite/batch/status')
        .then(r => r.data.data),
  },
}

export const cmsWebsiteApi = {
  publish: async (
    articleId: string,
    overrides?: { title?: string; featuredImage?: string; category?: string; language?: string }
  ) => {
    const r = await cmsHttp.post<unknown>('/website/publish', { articleId, overrides })
    const d = r.data as Record<string, unknown>
    const inner = d.data && typeof d.data === 'object' ? (d.data as Record<string, unknown>) : null
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

function unwrapWebsiteCmsList(d: unknown): { articles: CmsWebsiteArticle[]; total: number } {
  if (!d || typeof d !== 'object') return { articles: [], total: 0 }
  const o = d as Record<string, unknown>
  const inner = o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : null
  const articles = (o.articles ?? inner?.articles) as CmsWebsiteArticle[] | undefined
  const totalRaw = o.total ?? inner?.total
  const total = typeof totalRaw === 'number' ? totalRaw : Array.isArray(articles) ? articles.length : 0
  return { articles: Array.isArray(articles) ? articles : [], total }
}

function unwrapWebsiteCmsArticle(d: unknown): CmsWebsiteArticle | null {
  if (!d || typeof d !== 'object') return null
  const o = d as Record<string, unknown>
  const inner = o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : null
  const from =
    (o.article && typeof o.article === 'object' ? o.article : null) ||
    (inner?.article && typeof inner.article === 'object' ? inner.article : null) ||
    (typeof o.id === 'string' ? o : null) ||
    (inner && typeof inner.id === 'string' ? inner : null)
  const raw = from as Record<string, unknown> | null
  if (!raw || typeof raw.id !== 'string' || !raw.id) return null
  return raw as unknown as CmsWebsiteArticle
}

/** List / get / update published website articles — uses CMS JWT only. */
export const cmsWebsiteCmsArticlesApi = {
  list: async (params?: { status?: string; category?: string; language?: string }) => {
    const r = await cmsHttp.get<unknown>('/website/cms/articles', { params })
    return unwrapWebsiteCmsList(r.data)
  },
  get: async (id: string) => {
    const r = await cmsHttp.get<unknown>(`/website/cms/articles/${id}`)
    const a = unwrapWebsiteCmsArticle(r.data)
    if (!a) throw new Error('Article not found')
    return a
  },
  update: async (id: string, patch: CmsWebsiteArticleUpdate) => {
    const r = await cmsHttp.put<unknown>(`/website/cms/articles/${id}`, patch)
    const a = unwrapWebsiteCmsArticle(r.data)
    if (a) return a
    return cmsWebsiteCmsArticlesApi.get(id)
  },
}

export const cmsSourcesApi = {
  list: () => cmsHttp.get('/sources', { timeout: 6000 }),
  create: (data: CreateSourceInput) => cmsHttp.post('/sources', data),
  update: (id: string, data: Partial<CreateSourceInput> & { isActive?: boolean; isBlocked?: boolean; blockedReason?: string | null }) =>
    cmsHttp.put(`/sources/${id}`, data),
  updatePrefs: (id: string, data: { customPrompt?: string | null; isActive?: boolean }) =>
    cmsHttp.patch<{ data: { customPrompt?: string | null; isActive?: boolean } }>(`/sources/${id}/prefs`, data),
  delete: (id: string) => cmsHttp.delete(`/sources/${id}`),
  trigger: (id: string) =>
    cmsHttp.post<{ data: { scraped: number; duplicatesSkipped?: number; fullFetched?: number; message?: string } }>(
      `/sources/${id}/trigger`,
      {},
      { timeout: 120000 }
    ),
  validateUrl: (url: string) =>
    cmsHttp.post<{ ok: boolean; type: string | null; error?: string; note?: string; metadata?: { title: string | null; description: string | null; favicon: string | null } }>(
      '/sources/validate-url',
      { url },
      { timeout: 15000 }
    ),
  importSources: (sources: { name: string; url: string; type?: string }[]) =>
    cmsHttp.post<{ data: { created: number; sources: unknown[]; errors: { index: number; name: string; error: string }[] } }>(
      '/sources/import',
      { sources },
      { timeout: 60000 }
    ),
}

export const cmsTrendsApi = {
  get: () =>
    cmsHttp
      .get<{ success: boolean; data: { trends: { lastFetched: string | null; all: unknown[]; english: unknown[]; hindi: unknown[]; realtime: unknown[] } } }>('/trends')
      .then(r => r.data.data.trends),
  fetch: () =>
    cmsHttp.post<{ success: boolean; trendsCount?: number; matchesCount?: number; trends?: unknown[]; error?: string }>('/trends/fetch').then(r => r.data),
  trendingInbox: () =>
    cmsHttp
      .get<{ success: boolean; data: { articles: unknown[] } }>('/articles/trending-inbox')
      .then(r => r.data.data.articles),
  settings: {
    get: () =>
      cmsHttp
        .get<{ data: { enabled: boolean; fetchInterval: number; autoAddToInbox: boolean; autoRewrite: boolean; autoPublish: boolean } }>('/trends/settings')
        .then(r => r.data.data),
    save: (s: Record<string, unknown>) => cmsHttp.post<{ success: boolean; data: unknown }>('/trends/settings', s).then(r => r.data.data),
  },
}

const cmsSettingsCore = {
  get: () => cmsHttp.get<{ data: SettingsData }>('/settings').then(r => r.data.data),
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
  }) => cmsHttp.put<{ data: SettingsData }>('/settings', data).then(r => r.data.data),
}

/** Settings read/write for CMS — WordPress test endpoints are no-ops (Studio-only). */
export const cmsSettingsApi: SettingsApi = {
  ...cmsSettingsCore,
  testWordpress: async () => ({ ok: false }),
  checkWordpressRestApi: async (_siteId?: string) => ({
    ok: false,
    checks: [] as { name: string; url: string; ok: boolean; status?: number; message: string; details?: string }[],
    wpUrl: undefined,
  }),
}
