'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RotateCw, Send, Loader2, LogOut } from 'lucide-react'
import useSWR from 'swr'
import { inboxApi, sourcesApi, rewriteApi } from '@/lib/api'
import { useRewrite } from '@/hooks/useRewrite'
import { useArticleLock } from '@/hooks/useArticleLock'
import { useAuthStore } from '@/lib/auth-store'
import { LockModal } from '@/components/scraper/LockModal'
import { RewritePassCard } from '@/components/scraper/RewritePassCard'
import { RewriteStatusStepper } from '@/components/scraper/RewriteStatusStepper'
import { WPPublishPanel } from '@/components/scraper/WPPublishPanel'
import { RewritePipelineStrip } from '@/components/scraper/RewritePipelineStrip'
import { RewriteEditorLayout } from '@/components/scraper/RewriteEditorLayout'
import { REWRITE_LANGUAGES, HEADING_FORMATS, SUBHEADING_FORMATS, PARAGRAPH_TAGS, REWRITE_TONES, REWRITE_AUDIENCES } from '@/lib/rewrite-options'
import toast from 'react-hot-toast'
import type { ScraperArticle } from '@/types/article'

const fetcher = (id: string) => inboxApi.get(id).then(r => r.data?.data as ScraperArticle)

export default function RewritePage() {
  const params = useParams()
  const router = useRouter()
  const articleId = params?.id as string
  const [selectedPassIds, setSelectedPassIds] = useState<Set<string>>(new Set())
  const [lockModalOpen, setLockModalOpen] = useState(false)
  const [lockConflict, setLockConflict] = useState<{
    lockedBy: string
    lockedByName: string
    expiresAt: string | null
  } | null>(null)
  const [takeOverLoading, setTakeOverLoading] = useState(false)
  const hasAttemptedLock = useRef(false)

  const { data: article, error: articleError, isLoading: articleLoading, mutate: mutateArticle } = useSWR(articleId ? `article-${articleId}` : null, () => fetcher(articleId))
  const {
    lockedByMe,
    acquireLock,
    releaseLock,
  } = useArticleLock(articleId)
  const isAdmin = useAuthStore(s => s.user?.isAdmin)
  const {
    rewrite,
    isLoading: rewriteLoading,
    isError: rewriteError,
    error: rewriteErrorMessage,
    startRewrite,
    rerunPasses,
    updatePassOutput,
    updateCustomFooter,
    resetPass,
    publishToWP,
    mutate,
  } = useRewrite(articleId, article?.rewrite)

  const passes = rewrite?.passes ?? []
  const allDone = passes.length > 0 && passes.every(p => p.status === 'DONE')
  const runningIndex = passes.findIndex(p => p.status === 'RUNNING')
  const selectedCount = selectedPassIds.size
  const [quickDraftLoading, setQuickDraftLoading] = useState(false)
  const [topbarPublishLoading, setTopbarPublishLoading] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'editor' | 'cards'>('editor')
  const [versions, setVersions] = useState<import('@/types/article').RewriteVersion[]>([])
  const [versionLabel, setVersionLabel] = useState('')
  const [versionSaveLoading, setVersionSaveLoading] = useState(false)
  const [headlineSuggestions, setHeadlineSuggestions] = useState<string[]>([])
  const [headlineLoading, setHeadlineLoading] = useState(false)
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([])
  const [keywordLoading, setKeywordLoading] = useState(false)
  const [outputLanguage, setOutputLanguage] = useState<string>('english')
  const [customPrompt, setCustomPrompt] = useState<string>('')
  const [headingFormat, setHeadingFormat] = useState<string>('h1')
  const [subheadingFormat, setSubheadingFormat] = useState<string>('h2')
  const [paragraphTag, setParagraphTag] = useState<string>('h4')
  const [tone, setTone] = useState<string>('')
  const [targetAudience, setTargetAudience] = useState<string>('')
  const [customInstruction, setCustomInstruction] = useState<string>('')
  const [targetWordCount, setTargetWordCount] = useState<number>(580)

  const { data: sources } = useSWR('sources', () => sourcesApi.list().then(r => r.data?.data || []))
  const sourceCustomPrompt = article?.sourceId
    ? (sources || []).find((s: { id: string; customPrompt?: string }) => s.id === article.sourceId)?.customPrompt
    : undefined
  const sourceDefaultLang = article?.sourceId
    ? (sources || []).find((s: { id: string; defaultOutputLanguage?: string }) => s.id === article.sourceId)?.defaultOutputLanguage
    : undefined

  useEffect(() => {
    const lang = rewrite?.outputLanguage || sourceDefaultLang || 'english'
    setOutputLanguage(lang)
  }, [rewrite?.outputLanguage, sourceDefaultLang])

  useEffect(() => {
    if (rewrite?.customPrompt !== undefined) setCustomPrompt(rewrite.customPrompt || '')
    else if (sourceCustomPrompt) setCustomPrompt(sourceCustomPrompt)
  }, [rewrite?.customPrompt, sourceCustomPrompt])
  useEffect(() => {
    if (rewrite?.tone !== undefined) setTone(rewrite.tone || '')
    if (rewrite?.targetAudience !== undefined) setTargetAudience(rewrite.targetAudience || '')
    if (rewrite?.customInstruction !== undefined) setCustomInstruction(rewrite.customInstruction || '')
    if (rewrite?.targetWordCount != null) setTargetWordCount(rewrite.targetWordCount)
  }, [rewrite?.tone, rewrite?.targetAudience, rewrite?.customInstruction, rewrite?.targetWordCount])

  useEffect(() => {
    if (!articleId) return
    rewriteApi.versions.list(articleId).then(setVersions).catch(() => setVersions([]))
  }, [articleId, rewrite?.passes])

  // Acquire lock when article is loaded
  useEffect(() => {
    if (!articleId || !article || hasAttemptedLock.current) return
    hasAttemptedLock.current = true
    acquireLock().then(result => {
      if (!result.ok) {
        setLockConflict({
          lockedBy: result.lockedBy,
          lockedByName: result.lockedByName,
          expiresAt: result.expiresAt,
        })
        setLockModalOpen(true)
      }
    }).catch(() => {
      hasAttemptedLock.current = false
    })
    return () => {
      hasAttemptedLock.current = false
    }
  }, [articleId, article, acquireLock])

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (articleId && lockedByMe) {
        inboxApi.unlock(articleId).catch(() => {})
      }
    }
  }, [articleId, lockedByMe])

  // Release lock on page close (beforeunload)
  useEffect(() => {
    const handler = () => {
      if (articleId && lockedByMe) {
        const token = typeof window !== 'undefined' && (() => {
          try {
            const s = localStorage.getItem('contentflow-auth')
            if (!s) return null
            const p = JSON.parse(s)
            return p?.state?.token || null
          } catch { return null }
        })()
        if (token) {
          fetch(`/api/inbox/${articleId}/unlock`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            keepalive: true,
          }).catch(() => {})
        }
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handler)
      return () => window.removeEventListener('beforeunload', handler)
    }
  }, [articleId, lockedByMe])

  const handleGoBack = () => {
    setLockModalOpen(false)
    setLockConflict(null)
    router.push('/scraper/inbox/')
  }

  const handleTakeOver = async () => {
    if (!articleId || !isAdmin) return
    setTakeOverLoading(true)
    try {
      const result = await acquireLock(true)
      if (result.ok) {
        setLockModalOpen(false)
        setLockConflict(null)
      } else {
        setLockConflict({
          lockedBy: result.lockedBy,
          lockedByName: result.lockedByName,
          expiresAt: result.expiresAt,
        })
      }
    } finally {
      setTakeOverLoading(false)
    }
  }

  const handleReleaseArticle = async () => {
    await releaseLock()
    router.push('/scraper/inbox/')
  }

  const rewriteOpts = () => ({
    outputLanguage,
    customPrompt: customPrompt.trim() || undefined,
    headingFormat,
    subheadingFormat,
    paragraphTag,
    tone: tone || undefined,
    targetAudience: targetAudience || undefined,
    customInstruction: customInstruction.trim() || undefined,
    targetWordCount: targetWordCount >= 100 && targetWordCount <= 2000 ? targetWordCount : undefined,
  })

  const handleStartRewrite = async () => {
    setStartError(null)
    try {
      await startRewrite(rewriteOpts())
      toast.success('Started AI rewrite')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start'
      setStartError(msg)
      toast.error(msg)
    }
  }

  const handleStartWithFetch = async () => {
    setStartError(null)
    try {
      await inboxApi.fetchFull(articleId)
      mutate()
      await startRewrite(rewriteOpts())
      toast.success('Fetched full article and started AI rewrite')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setStartError(msg)
      toast.error(msg)
    }
  }

  const handleToggleSelect = (passId: string) => {
    setSelectedPassIds(prev => {
      const next = new Set(prev)
      if (next.has(passId)) next.delete(passId)
      else next.add(passId)
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedPassIds(new Set(passes.map(p => p.id)))
    else setSelectedPassIds(new Set())
  }

  const handleRerunSelected = async () => {
    if (selectedCount === 0) return
    try {
      await rerunPasses(Array.from(selectedPassIds), rewriteOpts())
      toast.success(`Re-running ${selectedCount} pass(es)`)
      setSelectedPassIds(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Re-run failed')
    }
  }

  const handleRerunSingle = async (passId: string) => {
    try {
      await rerunPasses([passId], rewriteOpts())
      toast.success('Re-running pass…')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Re-run failed')
    }
  }

  const handleResetSingle = async (passId: string, originalOutput: string) => {
    try {
      await resetPass(passId, originalOutput)
      toast.success('Reset to original')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed')
    }
  }

  const handleRerunAll = async () => {
    setStartError(null)
    try {
      await startRewrite(rewriteOpts())
      toast.success('Re-running all passes')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Re-run failed'
      setStartError(msg)
      toast.error(msg)
    }
  }

  const handlePublish = async (opts: {
    status: string
    categoryId: string
    authorId: string
    tagNames?: string[]
    featuredMediaId?: number
    wordpressSiteId?: string
  }) => {
    try {
      await publishToWP(opts)
      toast.success(opts.status === 'draft' ? 'Saved as draft ✓' : 'Published to WordPress ✓')
      router.push('/scraper/inbox/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    }
  }

  const handleReject = async () => {
    try {
      await inboxApi.reject(articleId)
      toast.success('Article rejected')
      router.push('/scraper/inbox/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reject failed')
    }
  }

  const handleQuickDraft = async () => {
    if (!allDone) return
    setQuickDraftLoading(true)
    try {
      await publishToWP({ status: 'draft', categoryId: '', authorId: '' })
      toast.success('Published to WordPress ✓')
      router.push('/scraper/inbox/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setQuickDraftLoading(false)
    }
  }

  if (articleError) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ color: 'var(--red)', fontSize: 14, textAlign: 'center' }}>
          {articleError?.message || 'Failed to load article'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          Ensure the backend is running: <code style={{ fontSize: 11 }}>cd contentflow-backend && node server.js</code>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => router.push('/scraper/inbox/')}
            style={{ padding: '8px 16px', fontSize: 12, background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
          >
            Back to Inbox
          </button>
          <button
            onClick={() => mutateArticle()}
            style={{ padding: '8px 16px', fontSize: 12, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!article && articleLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
        <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 14 }}>Loading article…</span>
      </div>
    )
  }

  if (!article) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Article not found</span>
        <button
          onClick={() => router.push('/scraper/inbox/')}
          style={{ padding: '8px 16px', fontSize: 12, background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
        >
          Back to Inbox
        </button>
      </div>
    )
  }

  const topbarDesktop = (
    <div
      className="hidden lg:flex"
      style={{
        alignItems: 'center',
        gap: 16,
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => router.push('/scraper/inbox/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={16} />
        Inbox
      </button>
      {lockedByMe && (
        <button
          onClick={handleReleaseArticle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: 11,
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Release article
        </button>
      )}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 300,
        }}
      >
        {article.title}
      </span>
      <button
        onClick={handleRerunSelected}
        disabled={selectedCount === 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          fontSize: 11,
          background: 'var(--surface)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
        }}
      >
        <RotateCw size={12} />
        Re-run Selected ({selectedCount})
      </button>
      {passes.length > 0 && !passes.every(p => p.status === 'IDLE') && (
        <button
          onClick={() => setViewMode(m => (m === 'editor' ? 'cards' : 'editor'))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: 11,
            background: viewMode === 'cards' ? 'var(--accent-glow)' : 'var(--surface)',
            color: viewMode === 'cards' ? 'var(--accent-light)' : 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {viewMode === 'editor' ? 'Cards' : 'Editor'}
        </button>
      )}
      <button
        onClick={handleRerunAll}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          fontSize: 11,
          background: 'var(--accent-glow)',
          color: 'var(--accent-light)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        ↺ Re-run All
      </button>
      <button
        onClick={async () => {
          if (!allDone) return
          setTopbarPublishLoading(true)
          try {
            await handlePublish({ status: 'draft', categoryId: '', authorId: '' })
          } finally {
            setTopbarPublishLoading(false)
          }
        }}
        disabled={!allDone || topbarPublishLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 600,
          background: allDone ? 'var(--green)' : 'var(--surface)',
          color: allDone ? '#fff' : 'var(--text-dim)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          cursor: allDone && !topbarPublishLoading ? 'pointer' : 'not-allowed',
        }}
      >
        {topbarPublishLoading ? <Loader2 size={12} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Send size={12} />}
        {article.wpPostId ? 'Republish →' : 'Publish to WP →'}
      </button>
    </div>
  )

  const topbarMobile = (
    <div
      className="lg:hidden flex"
      style={{
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => router.push('/scraper/inbox/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          padding: 4,
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={20} />
      </button>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>AI Rewrite</span>
      {lockedByMe && (
        <button
          onClick={handleReleaseArticle}
          style={{
            padding: '6px 10px',
            fontSize: 11,
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Release
        </button>
      )}
      <button
        onClick={handleRerunSelected}
        disabled={selectedCount === 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 10px',
          fontSize: 11,
          background: 'var(--surface)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
        }}
      >
        Re-run ({selectedCount})
      </button>
    </div>
  )

  const showEditorLayout = viewMode === 'editor' && passes.length > 0 && !passes.every(p => p.status === 'IDLE')

  const lockModal = (
    <LockModal
      open={lockModalOpen}
      onOpenChange={setLockModalOpen}
      editorName={lockConflict?.lockedByName ?? 'Unknown'}
      expiresAt={lockConflict?.expiresAt ?? null}
      isAdmin={!!isAdmin}
      onGoBack={handleGoBack}
      onTakeOver={handleTakeOver}
      takeOverLoading={takeOverLoading}
    />
  )

  if (showEditorLayout) {
    return (
      <>
        <RewriteEditorLayout
        article={article}
        rewrite={rewrite}
        onOutputChange={(passId, value) => updatePassOutput(passId, value)}
        onCustomFooterChange={updateCustomFooter}
        onPublish={handlePublish}
        onReject={handleReject}
        onBack={() => router.push('/scraper/inbox/')}
        onRerunAll={handleRerunAll}
        onFetchAndRerun={handleStartWithFetch}
        onSwitchToCards={() => setViewMode('cards')}
        onReleaseArticle={handleReleaseArticle}
        lockedByMe={lockedByMe}
        outputLanguage={outputLanguage}
        customPrompt={customPrompt}
        onOutputLanguageChange={setOutputLanguage}
        onCustomPromptChange={setCustomPrompt}
        headingFormat={headingFormat}
        subheadingFormat={subheadingFormat}
        paragraphTag={paragraphTag}
        onHeadingFormatChange={setHeadingFormat}
        onSubheadingFormatChange={setSubheadingFormat}
        onParagraphTagChange={setParagraphTag}
        onPublishClick={async () => {
          setTopbarPublishLoading(true)
          try {
            await handlePublish({ status: 'draft', categoryId: '', authorId: '' })
          } finally {
            setTopbarPublishLoading(false)
          }
        }}
        allDone={allDone}
        publishLoading={topbarPublishLoading}
        runningPassIndex={runningIndex >= 0 ? runningIndex : 0}
        onArticleUpdated={mutateArticle}
      />
      {lockModal}
      </>
    )
  }

  return (
    <div className="rewrite-page flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: 'var(--bg)' }}>
      {topbarDesktop}
      {topbarMobile}

      {/* Mobile: Pipeline strip (sticky below topbar) */}
      <div className="lg:hidden shrink-0" style={{ position: 'sticky', top: 52, zIndex: 15, background: 'var(--bg)', borderBottom: '1px solid var(--border-subtle)' }}>
        <RewritePipelineStrip passes={passes} />
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Mobile: single scroll container for passes + publish; Desktop: passes panel only */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:overflow-y-auto p-4 flex flex-col gap-4 rewrite-mobile-scroll"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              fontFamily: 'Geist Mono, monospace',
              marginBottom: 4,
            }}
          >
            AI REWRITE PASSES
          </div>
          <div
            style={{
              padding: 14,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
          >
            {article.source?.name && (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 5,
                  border: '1px solid rgba(124,58,237,0.2)',
                  color: 'var(--accent-light)',
                  background: 'var(--accent-glow)',
                  fontFamily: 'Geist Mono, monospace',
                  marginBottom: 8,
                }}
              >
                {article.source.name}
              </span>
            )}
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {article.title}
              {article.wordCount != null && article.wordCount < 300 && (
                <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--amber-bg)', color: 'var(--amber)', borderRadius: 4, fontWeight: 500 }}>Thin content (&lt;300 words)</span>
              )}
            </div>
            {typeof article.url === 'string' && article.url.startsWith('http') && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11,
                  color: 'var(--cyan)',
                  textDecoration: 'none',
                  fontFamily: 'Geist Mono, monospace',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {article.url}
              </a>
            )}
          </div>

          {(article.status === 'APPROVED' || article.status === 'EXPORTED') && (passes.length === 0 || passes.every(p => p.status === 'IDLE')) && (
            <div
              style={{
                padding: 14,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Output language</div>
                <select
                  value={outputLanguage}
                  onChange={e => setOutputLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                  }}
                >
                  {REWRITE_LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Tone</div>
                <select value={tone} onChange={e => setTone(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}>
                  {REWRITE_TONES.map(t => (<option key={t.value || 'default'} value={t.value}>{t.label}</option>))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Target audience</div>
                <select value={targetAudience} onChange={e => setTargetAudience(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}>
                  {REWRITE_AUDIENCES.map(a => (<option key={a.value || 'general'} value={a.value}>{a.label}</option>))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Length (words) {targetWordCount}</div>
                <input type="range" min={100} max={2000} step={50} value={targetWordCount} onChange={e => setTargetWordCount(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Custom instruction</div>
                <input
                  type="text"
                  value={customInstruction}
                  onChange={e => setCustomInstruction(e.target.value)}
                  placeholder="e.g. Focus on Indian context, Add statistics"
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <button type="button" onClick={async () => { setHeadlineLoading(true); setHeadlineSuggestions([]); try { const d = await rewriteApi.suggestHeadlines(articleId); setHeadlineSuggestions(d.headlines || []); if (!(d.headlines?.length)) toast.error('No suggestions'); } catch { toast.error('Failed to suggest'); } finally { setHeadlineLoading(false); } }} disabled={headlineLoading} style={{ padding: '6px 12px', fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: headlineLoading ? 'not-allowed' : 'pointer' }}>{headlineLoading ? '…' : 'Suggest 3 headlines'}</button>
                {headlineSuggestions.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
                    {headlineSuggestions.map((h, i) => (
                      <div key={i} style={{ marginBottom: 4 }} title="Click to use as 65-char">{(i + 1)}. {h}</div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 12 }}>
                <button type="button" onClick={async () => { setKeywordLoading(true); setKeywordSuggestions([]); try { const d = await rewriteApi.suggestKeywords(articleId); setKeywordSuggestions(d.keywords || []); if (!(d.keywords?.length)) toast.error('No keywords'); } catch { toast.error('Failed to suggest keywords'); } finally { setKeywordLoading(false); } }} disabled={keywordLoading} style={{ padding: '6px 12px', fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: keywordLoading ? 'not-allowed' : 'pointer' }}>{keywordLoading ? '…' : 'Suggest keywords (NLP)'}</button>
                {keywordSuggestions.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>{keywordSuggestions.join(', ')}</div>
                )}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Heading (main headline)</div>
                <select
                  value={headingFormat}
                  onChange={e => setHeadingFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                  }}
                >
                  {HEADING_FORMATS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Subheading (section titles)</div>
                <select
                  value={subheadingFormat}
                  onChange={e => setSubheadingFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                  }}
                >
                  {SUBHEADING_FORMATS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Paragraph tag (body)</div>
                <select
                  value={paragraphTag}
                  onChange={e => setParagraphTag(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                  }}
                >
                  {PARAGRAPH_TAGS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Custom prompt (optional)
                </div>
                <textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Override full-article prompt. Use {{LANGUAGE}}, {{TITLE}}, {{CONTENT}}"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handleStartRewrite}
                  disabled={rewriteLoading}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-light)',
                    border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: 8,
                    cursor: rewriteLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {rewriteLoading ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : 'Start rewrite'}
                </button>
                <button
                  onClick={handleStartWithFetch}
                  disabled={rewriteLoading}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    background: 'var(--surface)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    cursor: rewriteLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Fetch full article & Start rewrite
                </button>
              </div>
            </div>
          )}

          {rewrite?.quality && (
            <div style={{ padding: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quality</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
                <span title="Word count">{rewrite.quality.wordCount} words</span>
                <span title="Reading time">~{rewrite.quality.readTime} min read</span>
                {rewrite.quality.fleschKincaid != null && <span title="Flesch-Kincaid (higher = easier)">Readability: {rewrite.quality.fleschKincaid}</span>}
                {rewrite.quality.seoScore != null && <span title="SEO score">SEO: {rewrite.quality.seoScore}</span>}
                {rewrite.quality.similarityPercent != null && <span title="Similarity to original (lower = more original)">Similarity: {rewrite.quality.similarityPercent}%</span>}
              </div>
            </div>
          )}

          {passes.length > 0 && (
            <div style={{ padding: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Version history</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input type="text" value={versionLabel} onChange={e => setVersionLabel(e.target.value)} placeholder="Label (e.g. Draft 1)" style={{ flex: 1, padding: '6px 10px', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
                <button type="button" onClick={async () => { setVersionSaveLoading(true); try { await rewriteApi.versions.save(articleId, versionLabel || undefined); setVersions(await rewriteApi.versions.list(articleId)); setVersionLabel(''); mutate(); toast.success('Version saved'); } catch { toast.error('Failed to save'); } finally { setVersionSaveLoading(false); } }} disabled={versionSaveLoading} style={{ padding: '6px 12px', fontSize: 11, background: 'var(--accent-glow)', color: 'var(--accent-light)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 6, cursor: versionSaveLoading ? 'not-allowed' : 'pointer' }}>{versionSaveLoading ? '…' : 'Save version'}</button>
              </div>
              {versions.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 11 }}>
                  {versions.slice(0, 10).map(v => (
                    <li key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text)' }}>{v.label} · {new Date(v.createdAt).toLocaleString()}</span>
                      <button type="button" onClick={async () => { try { await rewriteApi.versions.restore(articleId, v.id); mutate(); toast.success('Restored'); setVersions(await rewriteApi.versions.list(articleId)); } catch { toast.error('Restore failed'); } }} style={{ padding: '4px 8px', fontSize: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>Restore</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {passes.length > 0 && !passes.every(p => p.status === 'IDLE') && (
            <div
              style={{
                padding: 14,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                marginBottom: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Re-run with:</span>
                  <select
                    value={outputLanguage}
                    onChange={e => setOutputLanguage(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text)',
                      fontSize: 12,
                    }}
                  >
                    {REWRITE_LANGUAGES.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                  <select
                    value={headingFormat}
                    onChange={e => setHeadingFormat(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text)',
                      fontSize: 12,
                    }}
                  >
                    {HEADING_FORMATS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    value={subheadingFormat}
                    onChange={e => setSubheadingFormat(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text)',
                      fontSize: 12,
                    }}
                  >
                    {SUBHEADING_FORMATS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    value={paragraphTag}
                    onChange={e => setParagraphTag(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text)',
                      fontSize: 12,
                    }}
                  >
                    {PARAGRAPH_TAGS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Custom prompt (optional)</div>
                <textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Override full-article prompt. Use {{LANGUAGE}}, {{TITLE}}, {{CONTENT}}"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              onChange={e => handleSelectAll(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select all</span>
          </div>

          {(rewriteError || startError) && (
            <div
              style={{
                padding: 14,
                background: 'var(--red-bg)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
                {startError || rewriteErrorMessage || 'Failed to load rewrite'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <select
                  value={outputLanguage}
                  onChange={e => setOutputLanguage(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text)',
                    fontSize: 11,
                  }}
                >
                  {REWRITE_LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <select
                  value={headingFormat}
                  onChange={e => setHeadingFormat(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text)',
                    fontSize: 11,
                  }}
                >
                  {HEADING_FORMATS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={subheadingFormat}
                  onChange={e => setSubheadingFormat(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text)',
                    fontSize: 11,
                  }}
                >
                  {SUBHEADING_FORMATS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={paragraphTag}
                  onChange={e => setParagraphTag(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text)',
                    fontSize: 11,
                  }}
                >
                  {PARAGRAPH_TAGS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handleStartWithFetch}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-light)',
                    border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Fetch full article & Start rewrite
                </button>
                <button
                  onClick={handleRerunAll}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    background: 'var(--surface)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Re-run All
                </button>
              </div>
            </div>
          )}

          {passes.map((pass, i) => (
            <RewritePassCard
              key={pass.id}
              pass={pass}
              passNumber={i + 1}
              selected={selectedPassIds.has(pass.id)}
              onToggleSelect={() => handleToggleSelect(pass.id)}
              onOutputChange={v => updatePassOutput(pass.id, v)}
              onRerun={() => handleRerunSingle(pass.id)}
              onReset={() => handleResetSingle(pass.id, pass.originalOutput)}
            />
          ))}
        </div>

        {/* Mobile: publish panel inside scroll container so it's reachable */}
        <div className="lg:hidden" style={{ padding: '0 0 16px' }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              fontFamily: 'Geist Mono, monospace',
              marginBottom: 12,
            }}
          >
            ARTICLE STATUS
          </div>
          <RewriteStatusStepper article={article} runningPassIndex={runningIndex >= 0 ? runningIndex : 0} passes={passes} />
          <div style={{ marginTop: 12 }}>
            <WPPublishPanel articleId={articleId} rewrite={rewrite} article={article ? { title: article.title, description: article.description ?? undefined, fullContent: article.fullContent ?? undefined, category: article.category ?? undefined, image: article.image ?? undefined } : undefined} wpPostId={article?.wpPostId} onPublish={handlePublish} onReject={handleReject} onArticleUpdated={mutateArticle} />
          </div>
        </div>

        {/* Publish panel - desktop */}
        <div
          className="hidden lg:block"
          style={{
            width: 330,
            flexShrink: 0,
            borderLeft: '1px solid var(--border)',
            padding: 16,
            overflowY: 'auto',
            background: 'var(--surface)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              fontFamily: 'Geist Mono, monospace',
              marginBottom: 12,
            }}
          >
            ARTICLE STATUS
          </div>
          <RewriteStatusStepper article={article} runningPassIndex={runningIndex >= 0 ? runningIndex : 0} passes={passes} />
          <div style={{ marginTop: 24 }}>
            <WPPublishPanel
              articleId={articleId}
              rewrite={rewrite}
              article={article ? { title: article.title, description: article.description ?? undefined, fullContent: article.fullContent ?? undefined, category: article.category ?? undefined, image: article.image ?? undefined } : undefined}
              wpPostId={article?.wpPostId}
              onPublish={handlePublish}
              onReject={handleReject}
              onArticleUpdated={mutateArticle}
            />
          </div>
        </div>
      </div>

      {/* Mobile: sticky bottom bar — Start rewrite / Fetch when needed; Re-run & Quick Draft when passes exist */}
      <div
        className="lg:hidden"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 20,
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {(article.status === 'APPROVED' || article.status === 'EXPORTED') && (passes.length === 0 || passes.every(p => p.status === 'IDLE')) ? (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleStartRewrite}
                disabled={rewriteLoading}
                style={{
                  flex: 1,
                  minWidth: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--accent-glow)',
                  color: 'var(--accent-light)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: 8,
                  cursor: rewriteLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {rewriteLoading ? <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} /> : null}
                Start rewrite
              </button>
              <button
                onClick={handleStartWithFetch}
                disabled={rewriteLoading}
                style={{
                  flex: 1,
                  minWidth: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: 12,
                  fontSize: 13,
                  background: 'var(--surface)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: rewriteLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Fetch full article & Start rewrite
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
              Choose language & format above, then start
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleRerunAll}
                style={{
                  flex: 1,
                  padding: 10,
                  fontSize: 12,
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                ↺ Re-run All
              </button>
              <button
                onClick={handleQuickDraft}
                disabled={!allDone || quickDraftLoading}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  background: allDone ? 'var(--green)' : 'var(--surface)',
                  color: allDone ? '#fff' : 'var(--text-dim)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  opacity: allDone && !quickDraftLoading ? 1 : 0.45,
                  cursor: allDone && !quickDraftLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {quickDraftLoading ? (
                  <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  'Quick Draft →'
                )}
              </button>
            </div>
            <div
              style={{
                textAlign: 'center',
                fontSize: 10,
                fontFamily: 'Geist Mono, monospace',
                color: 'var(--text-muted)',
              }}
            >
              Publishes as draft
            </div>
          </>
        )}
      </div>

      {lockModal}
    </div>
  )
}
