/**
 * Charcha Network CMS — API base URL for your Charcha backend.
 * Set `NEXT_PUBLIC_CHARCHA_API_URL` in `.env.local` (must include `/api`, e.g. `http://localhost:4600/api`).
 * Next.js rewrites browser requests from `/api/*` to that host.
 */
const DEFAULT_DEV_API = 'http://localhost:4500/api'

export function getCharchaApiBaseUrl(): string {
  if (typeof window !== 'undefined') return '/api'
  return process.env.NEXT_PUBLIC_CHARCHA_API_URL || DEFAULT_DEV_API
}
