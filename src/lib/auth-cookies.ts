/** Client-set cookies so Next.js middleware can gate routes (not httpOnly). */
const STUDIO = 'csr_token'
const CMS = 'cms_token'
const MAX_AGE = 60 * 60 * 24 * 7

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return
  const enc = encodeURIComponent(value)
  document.cookie = `${name}=${enc}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; max-age=0`
}

export function setStudioAuthCookie(token: string | null) {
  if (!token) clearCookie(STUDIO)
  else setCookie(STUDIO, token, MAX_AGE)
}

export function setCmsAuthCookie(token: string | null) {
  if (!token) clearCookie(CMS)
  else setCookie(CMS, token, MAX_AGE)
}

export function clearAllAuthCookies() {
  clearCookie(STUDIO)
  clearCookie(CMS)
}

/** Re-sync cookies after zustand rehydrates (middleware needs cookies). */
export function syncAuthCookiesFromStore(getState: () => { token: string | null; cmsToken: string | null }) {
  const { token, cmsToken } = getState()
  if (token) setStudioAuthCookie(token)
  else clearCookie(STUDIO)
  if (cmsToken) setCmsAuthCookie(cmsToken)
  else clearCookie(CMS)
}
