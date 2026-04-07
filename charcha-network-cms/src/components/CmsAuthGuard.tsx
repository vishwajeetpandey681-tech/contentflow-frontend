'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { syncAuthCookiesFromStore } from '@/lib/auth-cookies'

export default function CmsAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const cmsToken = useAuthStore(s => s.cmsToken)
  const [checked, setChecked] = useState(false)
  const didSetChecked = useRef(false)

  useEffect(() => {
    syncAuthCookiesFromStore(() => ({
      cmsToken: useAuthStore.getState().cmsToken,
    }))
  }, [cmsToken])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const apply = () => {
      if (didSetChecked.current) return
      didSetChecked.current = true
      setChecked(true)
      const t = useAuthStore.getState().cmsToken
      if (!t) {
        router.replace('/cms/login/')
      }
    }
    const t1 = setTimeout(apply, 80)
    const t2 = setTimeout(apply, 400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [router, pathname])

  if (!checked) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f0606',
          minHeight: '100dvh',
        }}
      >
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>Loading…</span>
      </div>
    )
  }

  if (!cmsToken) return null
  return <>{children}</>
}
