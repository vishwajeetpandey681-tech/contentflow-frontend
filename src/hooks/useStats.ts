import useSWR from 'swr'
import { inboxApi } from '@/lib/api'
import type { InboxStats } from '@/types/article'

export function useStats() {
  const { data, mutate } = useSWR(
    'inbox-stats',
    () => inboxApi.stats().then(r => r.data),
    { refreshInterval: 30000, errorRetryCount: 3, errorRetryInterval: 2000 }
  )
  const defaultStats: InboxStats = { pending: 0, approved: 0, rejected: 0, failed: 0 }
  return {
    stats:   (data?.inbox ? { ...defaultStats, ...data.inbox } : defaultStats) as InboxStats,
    sources: data?.sources?.active || 0,
    refresh: mutate,
  }
}
