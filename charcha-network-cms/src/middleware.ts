import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ensureTrailingSlashForInternalNav, normalizeAppPathname, safeLoginNextDestination } from '@/lib/pathname'

const CMS_COOKIE = 'charcha_cms_token'

function isCmsProtected(pathname: string) {
  const p = normalizeAppPathname(pathname)
  return p.startsWith('/cms') && p !== '/cms/login'
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const cmsToken = request.cookies.get(CMS_COOKIE)?.value

  if (isCmsProtected(pathname) && !cmsToken) {
    return NextResponse.redirect(new URL('/cms/login/', request.url))
  }

  const p = normalizeAppPathname(pathname)

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
  matcher: ['/cms/:path*', '/cms/login', '/cms/login/'],
}
