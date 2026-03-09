import useSWR from 'swr'
import { sourcesApi } from '@/lib/api'
import type { ScraperSource } from '@/types/source'

const fetcher = () => sourcesApi.list().then(r => r.data?.data || r.data || [])

export function useSources() {
  const { data, error, isLoading, mutate } = useSWR<ScraperSource[]>(
    'sources',
    fetcher,
    {
      refreshInterval: 30000,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      dedupingInterval: 2000,
    }
  )
  return {
    sources: data || [],
    loading: isLoading,
    error: error?.message,
    refresh: mutate,
  }
}
