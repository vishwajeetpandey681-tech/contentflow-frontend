import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setStudioAuthCookie, setCmsAuthCookie, clearAllAuthCookies } from './auth-cookies'
import { normalizeAppPathname } from './pathname'

export interface AuthUser {
  id: string
  email: string
  name: string
  isAdmin?: boolean
  role?: string
  access?: ('studio' | 'cms')[]
}

interface AuthState {
  /** CSR Studio JWT */
  token: string | null
  user: AuthUser | null
  /** Charcha CMS JWT */
  cmsToken: string | null
  cmsUser: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  setCmsAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  clearCmsAuth: () => void
  clearAllAuth: () => void
  isAuthenticated: () => boolean
  isCmsAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      cmsToken: null,
      cmsUser: null,
      setAuth: (token, user) => {
        setStudioAuthCookie(token)
        set({ token, user })
      },
      setCmsAuth: (cmsToken, cmsUser) => {
        setCmsAuthCookie(cmsToken)
        set({ cmsToken, cmsUser })
      },
      clearAuth: () => {
        setStudioAuthCookie(null)
        set({ token: null, user: null })
      },
      clearCmsAuth: () => {
        setCmsAuthCookie(null)
        set({ cmsToken: null, cmsUser: null })
      },
      clearAllAuth: () => {
        clearAllAuthCookies()
        set({ token: null, user: null, cmsToken: null, cmsUser: null })
      },
      isAuthenticated: () => !!get().token,
      isCmsAuthenticated: () => !!get().cmsToken,
    }),
    { name: 'contentflow-auth' }
  )
)

/** Token sent to API: studio token except on CMS app routes (uses cmsToken). */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  const path = normalizeAppPathname(window.location.pathname)
  const state = useAuthStore.getState()
  if (path.startsWith('/cms') && path !== '/cms/login' && path !== '/cms/register') {
    return state.cmsToken
  }
  return state.token
}

export function getStoredTokenSyncForPath(pathname: string): string | null {
  const state = useAuthStore.getState()
  const p = normalizeAppPathname(pathname)
  if (p.startsWith('/cms') && p !== '/cms/login') {
    return state.cmsToken
  }
  return state.token
}
