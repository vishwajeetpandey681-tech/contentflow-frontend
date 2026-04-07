import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setCmsAuthCookie, clearAllAuthCookies } from './auth-cookies'

export interface AuthUser {
  id: string
  email: string
  name: string
  isAdmin?: boolean
  role?: string
  access?: string[]
}

interface AuthState {
  cmsToken: string | null
  cmsUser: AuthUser | null
  setCmsAuth: (token: string, user: AuthUser) => void
  clearCmsAuth: () => void
  clearAllAuth: () => void
  isCmsAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      cmsToken: null,
      cmsUser: null,
      setCmsAuth: (cmsToken, cmsUser) => {
        setCmsAuthCookie(cmsToken)
        set({ cmsToken, cmsUser })
      },
      clearCmsAuth: () => {
        setCmsAuthCookie(null)
        set({ cmsToken: null, cmsUser: null })
      },
      clearAllAuth: () => {
        clearAllAuthCookies()
        set({ cmsToken: null, cmsUser: null })
      },
      isCmsAuthenticated: () => !!get().cmsToken,
    }),
    { name: 'charcha-cms-auth' }
  )
)

/** CMS JWT for the shared `api` axios client (auth, health, etc.). */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return useAuthStore.getState().cmsToken
}

export function getStoredTokenSyncForPath(_pathname: string): string | null {
  return useAuthStore.getState().cmsToken
}
