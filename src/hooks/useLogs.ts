import useSWR from 'swr'
import { logsApi, type ScrapeLogEntry } from '@/lib/api'

export function useLogs(fromDate?: string, toDate?: string) {
  const key = fromDate || toDate ? `logs-${fromDate || ''}-${toDate || ''}` : 'logs'
  const { data, error, isLoading, mutate } = useSWR<ScrapeLogEntry[]>(
    key,
    () => logsApi.list({ fromDate, toDate }),
    {
      refreshInterval: 0,
      dedupingInterval: 2000,
    }
  )
  return {
    logs: data || [],
    loading: isLoading,
    error: error?.message,
    refresh: mutate,
  }
}
