/**
 * X/Twitter profile URLs are not valid RSS sources. Users must supply a
 * third-party RSS URL (RSS-Bridge, rss.app, etc.) or use the official X API.
 */

const X_HOST = /^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\//i

/** Extract handle from @user, x.com/user, twitter.com/user */
export function parseXProfileHandle(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  if (raw.startsWith('@')) {
    const h = raw.slice(1).split(/[/?#]/)[0]?.replace(/^@+/, '') || ''
    return /^[A-Za-z0-9_]{1,15}$/.test(h) ? h : null
  }
  if (X_HOST.test(raw)) {
    const path = raw.replace(X_HOST, '').split(/[/?#]/)[0] || ''
    if (!path || ['home', 'search', 'explore', 'messages', 'settings', 'i'].includes(path.toLowerCase())) return null
    return /^[A-Za-z0-9_]{1,15}$/.test(path) ? path : null
  }
  if (/^[A-Za-z0-9_]{1,15}$/.test(raw)) return raw
  return null
}

export function suggestedNameForXAccount(handle: string): string {
  const h = handle.replace(/^@+/, '')
  return `X: @${h} (RSS bridge)`
}
