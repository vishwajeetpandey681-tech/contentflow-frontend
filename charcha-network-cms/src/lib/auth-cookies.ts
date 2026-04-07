/** Client-set cookie so Next.js middleware can gate CMS routes (not httpOnly). */
const CMS = 'charcha_cms_token'
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

export function setCmsAuthCookie(token: string | null) {
  if (!token) clearCookie(CMS)
  else setCookie(CMS, token, MAX_AGE)
}

export function clearAllAuthCookies() {
  clearCookie(CMS)
}

/** Re-sync cookie after zustand rehydrates (middleware needs cookies). */
export function syncAuthCookiesFromStore(getState: () => { cmsToken: string | null }) {
  const { cmsToken } = getState()
  if (cmsToken) setCmsAuthCookie(cmsToken)
  else clearCookie(CMS)
}
