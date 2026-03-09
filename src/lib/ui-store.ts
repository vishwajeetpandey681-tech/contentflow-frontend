import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  sourcesTab: 'active' | 'library' | 'logs'
  setSourcesTab: (tab: 'active' | 'library' | 'logs') => void
  sourcesActiveCount: number
  setSourcesActiveCount: (n: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      sourcesTab: 'active',
      setSourcesTab: tab => set({ sourcesTab: tab }),
      sourcesActiveCount: 0,
      setSourcesActiveCount: n => set({ sourcesActiveCount: n }),
    }),
    { name: 'contentflow-ui' }
  )
)
