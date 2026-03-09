'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export default function Home() {
  const router = useRouter()
  const token = useAuthStore(s => s.token)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (token) {
      router.replace('/scraper/inbox/')
    } else {
      router.replace('/login/')
    }
  }, [router, token])

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</span>
    </div>
  )
}
