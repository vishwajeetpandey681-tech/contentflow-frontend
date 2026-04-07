import useSWR from 'swr'
import { sourcesApi } from '@/lib/api'
import type { ScraperSource } from '@/types/source'

const defaultFetcher = () => sourcesApi.list().then(r => r.data?.data || r.data || [])

export function useSources(opts?: { swrKey?: string; listFn?: () => Promise<ScraperSource[]> }) {
  const swrKey = opts?.swrKey ?? 'sources'
  const fetcher = opts?.listFn ?? defaultFetcher
  const { data, error, isLoading, mutate } = useSWR<ScraperSource[]>(
    swrKey,
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
