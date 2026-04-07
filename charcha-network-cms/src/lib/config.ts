/**
 * Backend API base URL (build-time). CMS/Studio call same-origin `/api` when configured;
 * this value is shown on Settings for copy/debug.
 */
export const CONFIGURED_PUBLIC_API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4500/api'
).replace(/\/$/, '')

/** Default public site domain when building production reader URLs (override with NEXT_PUBLIC_WEBSITE_DOMAIN). */
export const DEFAULT_WEBSITE_DOMAIN =
  process.env.NEXT_PUBLIC_WEBSITE_DOMAIN || 'charchaexpress.com'

/**
 * Full base URL for reader article links (your public news site).
 * - Set `NEXT_PUBLIC_WEBSITE_URL` in `.env.local` to override.
 * - In development, if unset, defaults to http://localhost:3000 (same app serves `/article/[slug]`; match your Next port).
 * - In production builds, falls back to https://{NEXT_PUBLIC_WEBSITE_DOMAIN}.
 */
export const DEFAULT_WEBSITE_URL =
  process.env.NEXT_PUBLIC_WEBSITE_URL?.trim() ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : `https://${DEFAULT_WEBSITE_DOMAIN}`)

/**
 * Path segment for reader-facing article pages (default `article`).
 * Optional override: NEXT_PUBLIC_WEBSITE_ARTICLE_PATH (no slashes).
 */
export const WEBSITE_ARTICLE_PATH =
  (process.env.NEXT_PUBLIC_WEBSITE_ARTICLE_PATH || 'article').replace(/^\/+|\/+$/g, '') || 'article'

/** Homepage / root of the public news site (for “open site” links). */
export const getPublicWebsiteHomeUrl = () => DEFAULT_WEBSITE_URL.replace(/\/$/, '') + '/'

/** Build article URL for readers. Local dev: same origin as Next (set NEXT_PUBLIC_WEBSITE_URL if your port differs). */
export const getArticleUrl = (slug: string) =>
  `${DEFAULT_WEBSITE_URL.replace(/\/$/, '')}/${WEBSITE_ARTICLE_PATH}/${encodeURIComponent(slug)}`
