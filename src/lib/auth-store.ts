import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const TOKEN_KEY = 'contentflow_token'

export interface AuthUser {
  id: string
  email: string
  name: string
  isAdmin?: boolean
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    { name: 'contentflow-auth' }
  )
)

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('contentflow-auth')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed?.state?.token || null
  } catch {
    return null
  }
}
