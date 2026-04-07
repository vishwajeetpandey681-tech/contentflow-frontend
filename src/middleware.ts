import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ensureTrailingSlashForInternalNav, normalizeAppPathname, safeLoginNextDestination } from '@/lib/pathname'

const STUDIO_COOKIE = 'csr_token'
const CMS_COOKIE = 'cms_token'

const studioPrefixes = ['/scraper', '/approval', '/files', '/wordpress', '/settings', '/profile', '/team']

function isStudioRoute(pathname: string) {
  const p = normalizeAppPathname(pathname)
  return studioPrefixes.some(prefix => p === prefix || p.startsWith(`${prefix}/`))
}

function isCmsProtected(pathname: string) {
  const p = normalizeAppPathname(pathname)
  return p.startsWith('/cms') && p !== '/cms/login'
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const studioToken = request.cookies.get(STUDIO_COOKIE)?.value
  const cmsToken = request.cookies.get(CMS_COOKIE)?.value

  if (isStudioRoute(pathname) && !studioToken) {
    const next = encodeURIComponent(pathname + request.nextUrl.search)
    return NextResponse.redirect(new URL(`/login/?next=${next}`, request.url))
  }

  if (isCmsProtected(pathname) && !cmsToken) {
    return NextResponse.redirect(new URL('/cms/login/', request.url))
  }

  const p = normalizeAppPathname(pathname)

  if (p === '/login' && studioToken) {
    const rawNext = request.nextUrl.searchParams.get('next')
    const dest = safeLoginNextDestination(rawNext)
    if (dest) {
      return NextResponse.redirect(new URL(ensureTrailingSlashForInternalNav(dest), request.url))
    }
    return NextResponse.redirect(new URL('/scraper/inbox/', request.url))
  }

  if (p === '/cms/login' && cmsToken) {
    const rawNext = request.nextUrl.searchParams.get('next')
    const dest = safeLoginNextDestination(rawNext, { cmsOnly: true })
    if (dest) {
      return NextResponse.redirect(new URL(ensureTrailingSlashForInternalNav(dest), request.url))
    }
    return NextResponse.redirect(new URL('/cms/inbox/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/scraper/:path*',
    '/approval/:path*',
    '/files/:path*',
    '/wordpress/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/team/:path*',
    '/cms/:path*',
    '/login',
    '/login/',
    '/cms/login',
    '/cms/login/',
  ],
}
