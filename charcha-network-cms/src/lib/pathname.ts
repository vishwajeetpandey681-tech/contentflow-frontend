/**
 * App uses `trailingSlash: true` in next.config — `usePathname()` and
 * `window.location.pathname` are often `/foo/`; normalize for comparisons.
 */
export function normalizeAppPathname(pathname: string): string {
  if (pathname === '/') return '/'
  return pathname.replace(/\/+$/, '')
}

export function isCmsLoginRoute(pathname: string): boolean {
  return normalizeAppPathname(pathname) === '/cms/login'
}

/** After auth redirect: keep absolute URLs as-is; internal paths get a trailing slash (matches next.config). */
export function ensureTrailingSlashForInternalNav(href: string): string {
  if (!href) return '/'
  if (/^https?:\/\//i.test(href)) return href

  let hash = ''
  let rest = href
  const hashIdx = href.indexOf('#')
  if (hashIdx >= 0) {
    hash = href.slice(hashIdx)
    rest = href.slice(0, hashIdx)
  }
  let search = ''
  let pathname = rest
  const qIdx = rest.indexOf('?')
  if (qIdx >= 0) {
    search = rest.slice(qIdx)
    pathname = rest.slice(0, qIdx)
  }

  if (pathname === '' || pathname === '/') return `/${search}${hash}`
  const withSlash = pathname.endsWith('/') ? pathname : `${pathname.replace(/\/+$/, '')}/`
  return `${withSlash}${search}${hash}`
}

/**
 * Decode `next` from login redirect query. Same-origin path only (no protocol / //).
 * For CMS login, optionally require path under `/cms`.
 */
export function safeLoginNextDestination(
  nextParam: string | null,
  opts?: { cmsOnly?: boolean }
): string | null {
  if (!nextParam) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(nextParam)
  } catch {
    return null
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
  if (decoded.includes('://')) return null
  if (opts?.cmsOnly) {
    const pathOnly = decoded.split('?')[0].split('#')[0]
    const p = normalizeAppPathname(pathOnly)
    if (p !== '/cms' && !p.startsWith('/cms/')) return null
  }
  return decoded
}

/** Register with invite — trailing slash + encoded token (matches next.config). */
export function buildRegisterInviteUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/register/?invite=${encodeURIComponent(token)}`
}

/** Fix backend-generated links that omit the register trailing slash. */
export function normalizeRegisterInviteUrl(link: string): string {
  try {
    const u = new URL(link)
    if (normalizeAppPathname(u.pathname) === '/register') {
      u.pathname = '/register/'
      return u.toString()
    }
    return link
  } catch {
    return link.includes('/register?') && !link.includes('/register/?')
      ? link.replace('/register?', '/register/?')
      : link
  }
}
