/**
 * Absolute API base for Server Components / Route Handlers.
 * `NEXT_PUBLIC_API_URL` may be relative (`/api`) in some setups — that does not work with `fetch` in Node.
 */
export function getApiBaseForServer(): string {
  const u = (process.env.NEXT_PUBLIC_API_URL || '').trim()
  if (u.startsWith('http')) return u.replace(/\/$/, '')
  return 'http://127.0.0.1:4500/api'
}
