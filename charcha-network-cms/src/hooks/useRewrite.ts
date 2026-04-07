'use client'

import { useCallback, useRef } from 'react'
import useSWR from 'swr'
import type { RewriteStartOpts } from '@/lib/api'
import { useContentWorkspace } from '@/lib/content-workspace'
import type { ArticleRewrite, RewritePass } from '@/types/article'

function hasRunningPass(passes: RewritePass[]): boolean {
  return passes?.some(p => p.status === 'RUNNING') ?? false
}

export function useRewrite(articleId: string | null, fallbackRewrite?: ArticleRewrite | null) {
  const { apis, mode } = useContentWorkspace()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const updatePassRef = useRef<{ passId: string; output: string } | null>(null)

  const fetcher = useCallback(
    (id: string) => apis.rewrite.get(id).then(r => r.data?.data as ArticleRewrite),
    [apis.rewrite]
  )

  const { data: rewrite, error, isLoading, mutate } = useSWR<ArticleRewrite | undefined>(
    articleId ? `${mode}-rewrite-${articleId}` : null,
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
    await apis.rewrite.start(articleId, opts)
    mutate()
  }, [articleId, mutate, apis.rewrite])

  const rerunPasses = useCallback(async (passIds: string[], opts?: RewriteStartOpts) => {
    if (!articleId || passIds.length === 0) return
    await apis.rewrite.rerun(articleId, passIds, opts)
    mutate()
  }, [articleId, mutate, apis.rewrite])

  const debounceFooterRef = useRef<ReturnType<typeof setTimeout>>()
  const updateCustomFooter = useCallback((customFooter: string | null) => {
    if (!articleId) return
    clearTimeout(debounceFooterRef.current)
    debounceFooterRef.current = setTimeout(() => {
      apis.rewrite.updateCustomFooter(articleId, customFooter).then(() => mutate()).catch(() => {})
    }, 500)
  }, [articleId, mutate, apis.rewrite])

  const updatePassOutput = useCallback((passId: string, output: string) => {
    if (!articleId) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        await apis.rewrite.updatePass(articleId, passId, output)
        mutate()
      } catch {
        // ignore
      }
    }, 500)
  }, [articleId, mutate, apis.rewrite])

  const resetPass = useCallback(async (passId: string, originalOutput: string) => {
    if (!articleId) return
    try {
      await apis.rewrite.updatePass(articleId, passId, originalOutput)
      mutate()
    } catch {
      // Error surfaced via mutate/refetch - ignore here, caller can toast
    }
  }, [articleId, mutate, apis.rewrite])

  const publishToWP = useCallback(async (options: {
    status?: string
    categoryId?: string
    authorId?: string
    tagNames?: string[]
    featuredMediaId?: number
    wordpressSiteId?: string
  }) => {
    if (!articleId) return
    await apis.publish.wordpress(articleId, options)
    mutate()
  }, [articleId, mutate, apis.publish])

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
