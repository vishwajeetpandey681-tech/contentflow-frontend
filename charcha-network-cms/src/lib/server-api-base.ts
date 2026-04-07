/**
 * Absolute API base for Server Components (Charcha uses NEXT_PUBLIC_CHARCHA_API_URL).
 */
export function getApiBaseForServer(): string {
  const u = (process.env.NEXT_PUBLIC_CHARCHA_API_URL || process.env.NEXT_PUBLIC_API_URL || '').trim()
  if (u.startsWith('http')) return u.replace(/\/$/, '')
  return 'http://127.0.0.1:4500/api'
}
