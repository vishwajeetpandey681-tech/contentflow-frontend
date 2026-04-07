import { useState, useEffect, useCallback, useRef } from 'react'
import { approvalApi, type ApprovalStats } from '@/lib/api'

export function useApprovalStats(pollIntervalMs = 30000) {
  const [stats, setStats] = useState<ApprovalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const prevPendingRef = useRef<number>(0)

  const refresh = useCallback(async () => {
    try {
      const data = await approvalApi.stats()
      setStats(data)
      if (typeof window !== 'undefined' && data.pending > 0 && data.pending > prevPendingRef.current && prevPendingRef.current > 0) {
        if (Notification.permission === 'granted') {
          new Notification('CSR Studio', {
            body: `${data.pending} article${data.pending !== 1 ? 's' : ''} need your review`,
            icon: '/favicon.ico',
          })
        }
      }
      prevPendingRef.current = data.pending
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, pollIntervalMs)
    return () => clearInterval(id)
  }, [refresh, pollIntervalMs])

  return { stats, loading, refresh }
}
