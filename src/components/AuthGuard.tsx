'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const token = useAuthStore(s => s.token)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const timer = setTimeout(() => {
      const t = useAuthStore.getState().token
      setChecked(true)
      if (!t) {
        router.replace('/login/?next=' + encodeURIComponent(pathname || '/scraper/inbox/'))
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [router, pathname, token])

  if (!checked) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    )
  }

  if (!token) return null
  return <>{children}</>
}
