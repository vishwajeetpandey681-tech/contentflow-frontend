'use client'

import { useCallback, useRef } from 'react'
import useSWR from 'swr'
import { rewriteApi, publishApi, type RewriteStartOpts } from '@/lib/api'
import type { ArticleRewrite, RewritePass } from '@/types/article'

const fetcher = (articleId: string) =>
  rewriteApi.get(articleId).then(r => r.data?.data as ArticleRewrite)

function hasRunningPass(passes: RewritePass[]): boolean {
  return passes?.some(p => p.status === 'RUNNING') ?? false
}

export function useRewrite(articleId: string | null, fallbackRewrite?: ArticleRewrite | null) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const updatePassRef = useRef<{ passId: string; output: string } | null>(null)

  const { data: rewrite, error, isLoading, mutate } = useSWR<ArticleRewrite | undefined>(
    articleId ? `rewrite-${articleId}` : null,
    () => (articleId ? fetcher(articleId) : Promise.resolve(undefined)),
    {
      fallbackData: fallbackRewrite ?? undefined,
      refreshInterval: (data) => {
        if (!articleId || !data?.passes) return 0
        return hasRunningPass(data.passes) ? 2000 : 0
      },
    }
  )

  const effectiveRewrite = rewrite ?? (error && fallbackRewrite ? fallbackRewrite : undefined)

  const startRewrite = useCallback(async (opts?: RewriteStartOpts) => {
    if (!articleId) return
    await rewriteApi.start(articleId, opts)
    mutate()
  }, [articleId, mutate])

  const rerunPasses = useCallback(async (passIds: string[], opts?: RewriteStartOpts) => {
    if (!articleId || passIds.length === 0) return
    await rewriteApi.rerun(articleId, passIds, opts)
    mutate()
  }, [articleId, mutate])

  const debounceFooterRef = useRef<ReturnType<typeof setTimeout>>()
  const updateCustomFooter = useCallback((customFooter: string | null) => {
    if (!articleId) return
    clearTimeout(debounceFooterRef.current)
    debounceFooterRef.current = setTimeout(() => {
      rewriteApi.updateCustomFooter(articleId, customFooter).then(() => mutate()).catch(() => {})
    }, 500)
  }, [articleId, mutate])

  const updatePassOutput = useCallback((passId: string, output: string) => {
    if (!articleId) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        await rewriteApi.updatePass(articleId, passId, output)
        mutate()
      } catch {
        // ignore
      }
    }, 500)
  }, [articleId, mutate])

  const resetPass = useCallback(async (passId: string, originalOutput: string) => {
    if (!articleId) return
    try {
      await rewriteApi.updatePass(articleId, passId, originalOutput)
      mutate()
    } catch {
      // Error surfaced via mutate/refetch - ignore here, caller can toast
    }
  }, [articleId, mutate])

  const publishToWP = useCallback(async (options: {
    status?: string
    categoryId?: string
    authorId?: string
    tagIds?: number[]
    featuredMediaId?: number
    wordpressSiteId?: string
  }) => {
    if (!articleId) return
    await publishApi.wordpress(articleId, options)
    mutate()
  }, [articleId, mutate])

  return {
    rewrite: effectiveRewrite,
    isLoading,
    isError: !!error,
    error: error?.message,
    startRewrite,
    rerunPasses,
    updatePassOutput,
    updateCustomFooter,
    resetPass,
    publishToWP,
    mutate,
  }
}
