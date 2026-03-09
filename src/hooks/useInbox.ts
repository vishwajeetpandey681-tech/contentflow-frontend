import { useState, useEffect, useCallback, useRef } from 'react'
import { inboxApi } from '@/lib/api'
import type { ScraperArticle, ArticleStatus } from '@/types/article'

const LIMIT_OPTIONS = [10, 30, 50, 100] as const

export function useInbox(status: ArticleStatus, search = '', limit: number = 30, category = '', fromDate = '', toDate = '', published = false, activeSourcesOnly = false) {
  const [articles, setArticles] = useState<ScraperArticle[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  const key = `inbox-${status}-${search}-${limit}-${category}-${fromDate}-${toDate}-${published}-${activeSourcesOnly}`

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    const id = ++fetchIdRef.current
    if (p === 1) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    try {
      const res = await inboxApi.list({
        status,
        page: p,
        limit,
        search: search || undefined,
        category: category || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        published: published || undefined,
        activeSourcesOnly: activeSourcesOnly || undefined,
      })
      if (id !== fetchIdRef.current) return
      const data = (res.data?.data ?? res.data ?? []) as ScraperArticle[]
      const meta = (res.data as { meta?: { total: number } })?.meta
      const totalCount = meta?.total ?? data.length

      if (append) {
        setArticles(prev => (p === 1 ? data : [...prev, ...data]))
      } else {
        setArticles(data)
      }
      setTotal(totalCount)
      setPage(p)
    } catch (err) {
      if (id !== fetchIdRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load')
      if (!append) setArticles([])
    } finally {
      if (id === fetchIdRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [status, search, limit, category, fromDate, toDate, published, activeSourcesOnly])

  useEffect(() => {
    setPage(1)
    setArticles([])
    fetchPage(1, false)
  }, [key, fetchPage])

  const loadMore = useCallback(() => {
    const nextPage = Math.floor(articles.length / limit) + 1
    if (articles.length < total) {
      fetchPage(nextPage, true)
    }
  }, [articles.length, total, limit, fetchPage])

  const refresh = useCallback(() => {
    fetchPage(1, false)
  }, [fetchPage])

  const hasMore = articles.length < total && total > 0

  return {
    articles,
    total,
    page,
    limit,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    limitOptions: LIMIT_OPTIONS,
  }
}
