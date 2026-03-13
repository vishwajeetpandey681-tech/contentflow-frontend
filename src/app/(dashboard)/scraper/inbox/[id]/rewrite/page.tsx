'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RotateCw, Send, Loader2, LogOut, ChevronDown, Settings2, Zap, Globe, Clock } from 'lucide-react'
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
import { PrePublishSheet } from '@/components/scraper/PrePublishSheet'
import { PublishHistory } from '@/components/scraper/PublishHistory'
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

  // ─── 3-step wizard stage ─────────────────────────────────────────────────────
  const stage: 'configure' | 'running' | 'done' =
    passes.length === 0 || passes.every(p => p.status === 'IDLE') ? 'configure'
    : allDone ? 'done'
    : 'running'

  const totalPasses = passes.length
  const donePasses = passes.filter(p => p.status === 'DONE').length
  const progressPct = totalPasses > 0 ? Math.round((donePasses / totalPasses) * 100) : 0
  const selectedCount = selectedPassIds.size
  const [quickDraftLoading, setQuickDraftLoading] = useState(false)
  const [topbarPublishLoading, setTopbarPublishLoading] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'editor' | 'cards'>('cards')
  const [versions, setVersions] = useState<import('@/types/article').RewriteVersion[]>([])
  const [versionLabel, setVersionLabel] = useState('')
  const [versionSaveLoading, setVersionSaveLoading] = useState(false)
  const [publishSheetOpen, setPublishSheetOpen] = useState(false)
  const [publishHistoryRefreshKey, setPublishHistoryRefreshKey] = useState(0)
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(true)
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

  // Auto-collapse settings accordion based on wizard stage
  useEffect(() => {
    if (stage === 'running') setMobileSettingsOpen(false)
    if (stage === 'configure') setMobileSettingsOpen(true)
  }, [stage])

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

  const handleOpenPublishSheet = () => {
    if (!allDone) { toast.error('Complete all rewrite passes first'); return }
    setPublishSheetOpen(true)
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

  // ─── Reusable style tokens ───────────────────────────────────────────────────
  const sInput: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 13,
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
  }
  const sLabel: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'var(--text-muted)', marginBottom: 5, letterSpacing: '0.02em',
  }

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

  // ─── Shared settings form ────────────────────────────────────────────────────
  const settingsForm = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Language + Tone row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={sLabel}>Language</label>
          <select value={outputLanguage} onChange={e => setOutputLanguage(e.target.value)} style={sInput}>
            {REWRITE_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label style={sLabel}>Tone</label>
          <select value={tone} onChange={e => setTone(e.target.value)} style={sInput}>
            {REWRITE_TONES.map(t => <option key={t.value || 'default'} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Audience + Word count */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={sLabel}>Audience</label>
          <select value={targetAudience} onChange={e => setTargetAudience(e.target.value)} style={sInput}>
            {REWRITE_AUDIENCES.map(a => <option key={a.value || 'general'} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label style={sLabel}>Words: {targetWordCount}</label>
          <input type="range" min={100} max={2000} step={50} value={targetWordCount}
            onChange={e => setTargetWordCount(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)', marginTop: 6 }} />
        </div>
      </div>

      {/* Format row */}
      <div>
        <label style={sLabel}>Format</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <select value={headingFormat} onChange={e => setHeadingFormat(e.target.value)}
            style={{ ...sInput, padding: '6px 8px', fontSize: 12 }}>
            {HEADING_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={subheadingFormat} onChange={e => setSubheadingFormat(e.target.value)}
            style={{ ...sInput, padding: '6px 8px', fontSize: 12 }}>
            {SUBHEADING_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={paragraphTag} onChange={e => setParagraphTag(e.target.value)}
            style={{ ...sInput, padding: '6px 8px', fontSize: 12 }}>
            {PARAGRAPH_TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, fontSize: 10, color: 'var(--text-dim)' }}>
          <span style={{ flex: 1, textAlign: 'center' }}>Heading</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Subheading</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Paragraph</span>
        </div>
      </div>

      {/* Custom instruction */}
      <div>
        <label style={sLabel}>Custom instruction</label>
        <input type="text" value={customInstruction} onChange={e => setCustomInstruction(e.target.value)}
          placeholder="e.g. Focus on Indian context, Add statistics" style={sInput} />
      </div>

      {/* Custom prompt */}
      <div>
        <label style={sLabel}>Custom prompt <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>(optional)</span></label>
        <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
          placeholder="Override prompt. Use {{LANGUAGE}}, {{TITLE}}, {{CONTENT}}"
          rows={3} style={{ ...sInput, resize: 'vertical' }} />
      </div>

      {/* AI Suggestions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button"
          onClick={async () => { setHeadlineLoading(true); setHeadlineSuggestions([]); try { const d = await rewriteApi.suggestHeadlines(articleId); setHeadlineSuggestions(d.headlines || []); if (!d.headlines?.length) toast.error('No suggestions'); } catch { toast.error('Failed to suggest'); } finally { setHeadlineLoading(false); } }}
          disabled={headlineLoading}
          style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(108,99,255,0.08)', color: 'var(--accent-light)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, cursor: headlineLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Zap size={12} />{headlineLoading ? '…' : 'Suggest Headlines'}
        </button>
        <button type="button"
          onClick={async () => { setKeywordLoading(true); setKeywordSuggestions([]); try { const d = await rewriteApi.suggestKeywords(articleId); setKeywordSuggestions(d.keywords || []); if (!d.keywords?.length) toast.error('No keywords'); } catch { toast.error('Failed'); } finally { setKeywordLoading(false); } }}
          disabled={keywordLoading}
          style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(0,212,255,0.06)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 8, cursor: keywordLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Zap size={12} />{keywordLoading ? '…' : 'NLP Keywords'}
        </button>
      </div>
      {headlineSuggestions.length > 0 && (
        <div style={{ background: 'var(--card)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: '1px' }}>HEADLINES</div>
          {headlineSuggestions.map((h, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text)', padding: '4px 0', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>{i + 1}. {h}</div>
          ))}
        </div>
      )}
      {keywordSuggestions.length > 0 && (
        <div style={{ background: 'var(--card)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          {keywordSuggestions.join(' · ')}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ═══ HEADER — Desktop ═══════════════════════════════════════════════════ */}
      <header className="hidden lg:flex" style={{
        alignItems: 'center', gap: 12, padding: '0 20px', height: 56,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <button onClick={() => router.push('/scraper/inbox/')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', padding: '4px 0', flexShrink: 0 }}>
          <ArrowLeft size={15} /> Inbox
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

        {/* Stage breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {(['configure', 'running', 'done'] as const).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>›</span>}
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: stage === s ? (s === 'done' ? 'rgba(0,229,160,0.15)' : 'rgba(108,99,255,0.15)') : 'transparent',
                color: stage === s ? (s === 'done' ? 'var(--success)' : 'var(--accent-light)') : 'var(--text-dim)',
                border: stage === s ? `1px solid ${s === 'done' ? 'rgba(0,229,160,0.3)' : 'rgba(108,99,255,0.3)'}` : '1px solid transparent',
              }}>
                {s === 'configure' ? '1 · Configure' : s === 'running' ? '2 · Writing…' : '3 · Review & Publish'}
              </span>
            </div>
          ))}
        </div>

        {/* Article title */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {article.source?.name && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(108,99,255,0.12)', color: 'var(--accent-light)', border: '1px solid rgba(108,99,255,0.2)', fontWeight: 700, flexShrink: 0 }}>
              {article.source.name}
            </span>
          )}
          <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
            {article.title}
          </span>
        </div>

        {/* Actions — context-sensitive per stage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {lockedByMe && (
            <button onClick={handleReleaseArticle}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
              <LogOut size={11} /> Release
            </button>
          )}
          {/* Stage 2+: view toggle + re-run */}
          {stage !== 'configure' && (
            <>
              {passes.length > 0 && !passes.every(p => p.status === 'IDLE') && (
                <button onClick={() => setViewMode(m => m === 'editor' ? 'cards' : 'editor')}
                  style={{ padding: '5px 10px', fontSize: 11, background: viewMode === 'cards' ? 'rgba(108,99,255,0.12)' : 'var(--card)', color: viewMode === 'cards' ? 'var(--accent-light)' : 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                  {viewMode === 'editor' ? 'Card view' : 'Editor view'}
                </button>
              )}
              <button onClick={handleRerunSelected} disabled={selectedCount === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, background: 'var(--card)', color: selectedCount > 0 ? 'var(--accent-light)' : 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 8, cursor: selectedCount > 0 ? 'pointer' : 'not-allowed', opacity: selectedCount > 0 ? 1 : 0.5 }}>
                <RotateCw size={11} /> Re-run ({selectedCount})
              </button>
              <button onClick={handleRerunAll}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(108,99,255,0.1)', color: 'var(--accent-light)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 8, cursor: 'pointer' }}>
                <RotateCw size={11} /> Re-run All
              </button>
            </>
          )}
          {/* Stage 3 only: Release button — glowing green */}
          {stage === 'done' && (
            <button onClick={handleOpenPublishSheet}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#00e5a0,#00b87a)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', boxShadow: '0 2px 16px rgba(0,229,160,0.45)', animation: 'pulse-green 2s infinite' }}>
              <Send size={13} />
              {article.wpPostId ? '🌐 Update Post' : '🚀 Release'}
            </button>
          )}
        </div>
      </header>

      {/* ═══ HEADER — Mobile ════════════════════════════════════════════════════ */}
      <header className="lg:hidden flex" style={{
        alignItems: 'center', gap: 10, padding: '0 16px', height: 52,
        borderBottom: '1px solid var(--border)', background: 'var(--surface)',
        flexShrink: 0, position: 'sticky', top: 0, zIndex: 30,
      }}>
        <button onClick={() => router.push('/scraper/inbox/')}
          style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: 'var(--text-muted)', padding: '6px', cursor: 'pointer', borderRadius: 8 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {stage === 'configure' ? 'Configure Rewrite' : stage === 'running' ? 'AI Writing…' : 'Review & Publish'}
          </div>
          {stage === 'running' && runningIndex >= 0 && (
            <div style={{ fontSize: 10, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Loader2 size={9} style={{ animation: 'spin 0.8s linear infinite' }} />
              Pass {runningIndex + 1} of {totalPasses} · {progressPct}% done
            </div>
          )}
          {stage === 'done' && (
            <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>✓ All {totalPasses} passes complete — ready to publish!</div>
          )}
        </div>
        {lockedByMe && (
          <button onClick={handleReleaseArticle}
            style={{ padding: '5px 8px', fontSize: 11, background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>
            Release
          </button>
        )}
        {/* Only show in header on mobile when done */}
        {stage === 'done' && (
          <button onClick={handleOpenPublishSheet}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#00e5a0,#00b87a)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,229,160,0.4)' }}>
            <Send size={12} />{article.wpPostId ? 'Update' : 'Release'}
          </button>
        )}
      </header>

      {/* ═══ MOBILE: Pipeline strip — visible only when passes exist ═══════════ */}
      {stage !== 'configure' && (
        <div className="lg:hidden" style={{ flexShrink: 0, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg)' }}>
          <RewritePipelineStrip passes={passes} />
        </div>
      )}

      {/* ═══ STAGE 2: Full-width progress banner ═══════════════════════════════ */}
      {stage === 'running' && (
        <div style={{
          flexShrink: 0, padding: '10px 20px',
          background: 'linear-gradient(90deg, rgba(108,99,255,0.12), rgba(0,212,255,0.06))',
          borderBottom: '1px solid rgba(108,99,255,0.2)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Loader2 size={16} style={{ color: 'var(--accent-light)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-light)', marginBottom: 5 }}>
              AI is rewriting… Pass {Math.max(runningIndex + 1, donePasses)} of {totalPasses}
            </div>
            <div style={{ height: 5, background: 'rgba(108,99,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, var(--accent), var(--cyan))',
                width: `${progressPct}%`,
                transition: 'width 0.6s ease',
                boxShadow: '0 0 8px rgba(108,99,255,0.6)',
              }} />
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>{progressPct}%</span>
        </div>
      )}

      {/* ═══ STAGE 3: Completion banner ════════════════════════════════════════ */}
      {stage === 'done' && (
        <div style={{
          flexShrink: 0, padding: '10px 20px',
          background: 'linear-gradient(90deg, rgba(0,229,160,0.12), rgba(0,180,120,0.06))',
          borderBottom: '1px solid rgba(0,229,160,0.25)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
              Rewrite complete — {totalPasses} passes done
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
              Review the content below, then hit Release to publish.
            </span>
          </div>
          <button onClick={handleOpenPublishSheet}
            className="hidden lg:flex"
            style={{ alignItems: 'center', gap: 6, padding: '8px 20px', fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#00e5a0,#00b87a)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,229,160,0.4)' }}>
            <Send size={13} /> {article.wpPostId ? '🌐 Update Post' : '🚀 Release'}
          </button>
        </div>
      )}

      {/* ═══ BODY ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ─── DESKTOP LEFT SIDEBAR ────────────────────────────────────────────── */}
        <aside className="hidden lg:flex" style={{
          width: 270, flexShrink: 0, flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          {/* Article info — always visible */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 10, letterSpacing: '1.5px', color: 'var(--text-dim)', fontFamily: 'Geist Mono,monospace', fontWeight: 700, marginBottom: 10 }}>ARTICLE</div>
            <div style={{ padding: 12, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4, lineHeight: 1.4 }}>{article.title}</div>
              {article.wordCount != null && (
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={9} /> {article.wordCount} words
                  {article.wordCount < 300 && <span style={{ color: 'var(--amber)', background: 'var(--amber-bg)', padding: '1px 5px', borderRadius: 4 }}>Thin content</span>}
                </div>
              )}
              {typeof article.url === 'string' && article.url.startsWith('http') && (
                <a href={article.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 10, color: 'var(--cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={9} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{article.url}</span>
                </a>
              )}
            </div>
            {rewrite?.quality && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                {[
                  { label: `${rewrite.quality.wordCount}w`, title: 'Word count' },
                  { label: `~${rewrite.quality.readTime}min`, title: 'Reading time' },
                  rewrite.quality.seoScore != null ? { label: `SEO ${rewrite.quality.seoScore}`, title: 'SEO score' } : null,
                ].filter(Boolean).map((q, i) => (
                  <span key={i} title={q!.title} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    {q!.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stage 1: Full settings + start buttons */}
          {stage === 'configure' && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ fontSize: 10, letterSpacing: '1.5px', color: 'var(--text-dim)', fontFamily: 'Geist Mono,monospace', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Settings2 size={10} /> AI SETTINGS
              </div>
              {settingsForm}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                <button onClick={handleStartRewrite} disabled={rewriteLoading}
                  style={{ width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg,var(--accent),#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: rewriteLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 16px rgba(108,99,255,0.4)' }}>
                  {rewriteLoading ? <Loader2 size={15} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Zap size={15} />}
                  Start Rewrite
                </button>
                <button onClick={handleStartWithFetch} disabled={rewriteLoading}
                  style={{ width: '100%', padding: '9px 0', fontSize: 12, background: 'var(--card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, cursor: rewriteLoading ? 'not-allowed' : 'pointer' }}>
                  Fetch full article & Rewrite
                </button>
              </div>
            </div>
          )}

          {/* Stage 2+: Collapsed re-run settings toggle */}
          {stage !== 'configure' && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setMobileSettingsOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: mobileSettingsOpen ? '8px 8px 0 0' : 8, cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                  <Settings2 size={12} style={{ color: 'var(--text-dim)' }} /> Re-run settings
                </span>
                <ChevronDown size={14} style={{ color: 'var(--text-dim)', transform: mobileSettingsOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
              </button>
              {mobileSettingsOpen && (
                <div style={{ padding: 12, background: 'var(--card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                  {settingsForm}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                    <button onClick={handleStartWithFetch}
                      style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 600, background: 'rgba(108,99,255,0.1)', color: 'var(--accent-light)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, cursor: 'pointer' }}>
                      Fetch & Re-run
                    </button>
                    <button onClick={handleRerunAll}
                      style={{ width: '100%', padding: '8px 0', fontSize: 12, background: 'var(--card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                      ↺ Re-run All
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Version history — only when passes exist */}
          {stage !== 'configure' && (
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: '1.5px', color: 'var(--text-dim)', fontFamily: 'Geist Mono,monospace', fontWeight: 700, marginBottom: 10 }}>VERSION HISTORY</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input type="text" value={versionLabel} onChange={e => setVersionLabel(e.target.value)}
                  placeholder="Label (e.g. Draft 1)"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
                <button type="button"
                  onClick={async () => { setVersionSaveLoading(true); try { await rewriteApi.versions.save(articleId, versionLabel || undefined); setVersions(await rewriteApi.versions.list(articleId)); setVersionLabel(''); mutate(); toast.success('Version saved'); } catch { toast.error('Failed to save'); } finally { setVersionSaveLoading(false); } }}
                  disabled={versionSaveLoading}
                  style={{ padding: '6px 10px', fontSize: 11, background: 'rgba(108,99,255,0.1)', color: 'var(--accent-light)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 6, cursor: versionSaveLoading ? 'not-allowed' : 'pointer' }}>
                  {versionSaveLoading ? '…' : 'Save'}
                </button>
              </div>
              {versions.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {versions.slice(0, 8).map(v => (
                    <li key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderTop: '1px solid var(--border-subtle)', fontSize: 11 }}>
                      <div>
                        <div style={{ color: 'var(--text)', fontWeight: 500 }}>{v.label}</div>
                        <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>{new Date(v.createdAt).toLocaleString()}</div>
                      </div>
                      <button type="button"
                        onClick={async () => { try { await rewriteApi.versions.restore(articleId, v.id); mutate(); toast.success('Restored'); setVersions(await rewriteApi.versions.list(articleId)); } catch { toast.error('Restore failed'); } }}
                        style={{ padding: '3px 8px', fontSize: 10, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-dim)', cursor: 'pointer' }}>
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>

        {/* ─── CENTER: Pass cards ─────────────────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>

          {/* Mobile: Article card (always) */}
          <div className="lg:hidden" style={{ padding: '12px 16px 0' }}>
            <div style={{ padding: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
              {article.source?.name && (
                <span style={{ display: 'inline-block', fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(108,99,255,0.12)', color: 'var(--accent-light)', border: '1px solid rgba(108,99,255,0.2)', fontWeight: 700, marginBottom: 8 }}>
                  {article.source.name}
                </span>
              )}
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                {article.title}
                {article.wordCount != null && article.wordCount < 300 && (
                  <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--amber-bg)', color: 'var(--amber)', borderRadius: 4, fontWeight: 500, marginLeft: 8 }}>Thin &lt;300w</span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile: Settings accordion */}
          <div className="lg:hidden" style={{ padding: '10px 16px 0' }}>
            <button onClick={() => setMobileSettingsOpen(o => !o)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: stage === 'configure' ? 'var(--card)' : 'rgba(108,99,255,0.05)', border: `1px solid ${stage === 'configure' ? 'var(--border)' : 'rgba(108,99,255,0.15)'}`, borderRadius: mobileSettingsOpen ? '10px 10px 0 0' : 10, cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                <Settings2 size={14} style={{ color: stage === 'configure' ? 'var(--accent-light)' : 'var(--text-dim)' }} />
                {stage === 'configure' ? 'AI Settings — configure before starting' : 'Re-run settings'}
              </span>
              <ChevronDown size={16} style={{ color: 'var(--text-dim)', transform: mobileSettingsOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
            </button>
            {mobileSettingsOpen && (
              <div style={{ padding: 14, background: 'var(--card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                {settingsForm}
                {stage === 'configure' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                    <button onClick={handleStartRewrite} disabled={rewriteLoading}
                      style={{ width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,var(--accent),#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: rewriteLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 16px rgba(108,99,255,0.4)' }}>
                      {rewriteLoading ? <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Zap size={16} />}
                      Start Rewrite
                    </button>
                    <button onClick={handleStartWithFetch} disabled={rewriteLoading}
                      style={{ width: '100%', padding: '11px 0', fontSize: 13, background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, cursor: rewriteLoading ? 'not-allowed' : 'pointer' }}>
                      Fetch full article & Rewrite
                    </button>
                  </div>
                )}
                {stage !== 'configure' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={handleStartWithFetch}
                      style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 600, background: 'rgba(108,99,255,0.1)', color: 'var(--accent-light)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, cursor: 'pointer' }}>
                      Fetch & Re-run
                    </button>
                    <button onClick={handleRerunAll}
                      style={{ flex: 1, padding: '10px 0', fontSize: 12, background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                      ↺ Re-run All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center: select all + pass count row */}
          {stage !== 'configure' && (
            <div style={{ padding: '12px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 10, letterSpacing: '1.5px', color: 'var(--text-dim)', fontFamily: 'Geist Mono,monospace', fontWeight: 700 }}>
                AI REWRITE PASSES
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                Select all
              </label>
            </div>
          )}

          {/* Desktop: re-run bar (stage 2/3) */}
          {stage !== 'configure' && (
            <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 8, padding: '8px 16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)' }}>
              <select value={outputLanguage} onChange={e => setOutputLanguage(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>
                {REWRITE_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <select value={headingFormat} onChange={e => setHeadingFormat(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>
                {HEADING_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={subheadingFormat} onChange={e => setSubheadingFormat(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>
                {SUBHEADING_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={paragraphTag} onChange={e => setParagraphTag(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>
                {PARAGRAPH_TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Custom prompt…" rows={1}
                style={{ flex: 1, minWidth: 120, padding: '4px 8px', fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: 'inherit', resize: 'none' }} />
            </div>
          )}

          {/* Error state */}
          {(rewriteError || startError) && (
            <div style={{ margin: '12px 16px', padding: 14, background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginBottom: 10 }}>
                {startError || rewriteErrorMessage || 'Failed to load rewrite'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={handleStartWithFetch}
                  style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, background: 'rgba(108,99,255,0.1)', color: 'var(--accent-light)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 6, cursor: 'pointer' }}>
                  Fetch & Retry
                </button>
                <button onClick={handleRerunAll}
                  style={{ padding: '6px 14px', fontSize: 11, background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>
                  Re-run All
                </button>
              </div>
            </div>
          )}

          {/* Pass cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px 120px' }}>
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

          {/* Mobile: Status stepper always; WPPublishPanel ONLY in stage 3 */}
          <div className="lg:hidden" style={{ padding: '0 16px 24px' }}>
            <div style={{ fontSize: 10, letterSpacing: '1.5px', color: 'var(--text-dim)', fontFamily: 'Geist Mono,monospace', fontWeight: 700, marginBottom: 12 }}>ARTICLE STATUS</div>
            <RewriteStatusStepper article={article} runningPassIndex={runningIndex >= 0 ? runningIndex : 0} passes={passes} />
            {stage === 'done' && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 10, letterSpacing: '1.5px', color: 'var(--text-dim)', fontFamily: 'Geist Mono,monospace', fontWeight: 700, marginBottom: 12 }}>PUBLISH TO WORDPRESS</div>
                <WPPublishPanel
                  articleId={articleId} rewrite={rewrite}
                  article={article ? { title: article.title, description: article.description ?? undefined, fullContent: article.fullContent ?? undefined, category: article.category ?? undefined, image: article.image ?? undefined } : undefined}
                  wpPostId={article?.wpPostId} onPublish={handlePublish} onReject={handleReject} onArticleUpdated={mutateArticle}
                />
              </div>
            )}
          </div>
        </main>

        {/* ─── DESKTOP RIGHT SIDEBAR ───────────────────────────────────────────── */}
        <aside className="hidden lg:flex" style={{
          width: 300, flexShrink: 0, flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
          background: 'var(--surface)',
          overflowY: 'auto',
        }}>
          {/* Status stepper — always visible */}
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, letterSpacing: '1.5px', color: 'var(--text-dim)', fontFamily: 'Geist Mono,monospace', fontWeight: 700, marginBottom: 12 }}>ARTICLE STATUS</div>
            <RewriteStatusStepper article={article} runningPassIndex={runningIndex >= 0 ? runningIndex : 0} passes={passes} />
          </div>

          {/* Stage 1 & 2: placeholder message where publish panel will appear */}
          {stage !== 'done' && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-dim)', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stage === 'configure'
                  ? <Settings2 size={20} style={{ color: 'var(--text-dim)' }} />
                  : <Loader2 size={20} style={{ color: 'var(--accent-light)', animation: 'spin 1.2s linear infinite' }} />
                }
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                {stage === 'configure' ? 'Publish options' : 'Publishing options'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                {stage === 'configure'
                  ? 'Configure settings and start the rewrite. Publish options will appear here when done.'
                  : 'AI is writing your article. Publish options will appear here when all passes are complete.'}
              </div>
            </div>
          )}

          {/* Stage 3 only: WPPublishPanel + history */}
          {stage === 'done' && (
            <>
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                <WPPublishPanel
                  articleId={articleId} rewrite={rewrite}
                  article={article ? { title: article.title, description: article.description ?? undefined, fullContent: article.fullContent ?? undefined, category: article.category ?? undefined, image: article.image ?? undefined } : undefined}
                  wpPostId={article?.wpPostId} onPublish={handlePublish} onReject={handleReject} onArticleUpdated={mutateArticle}
                />
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: '1.5px', color: 'var(--text-dim)', fontFamily: 'Geist Mono,monospace', fontWeight: 700, marginBottom: 12 }}>PUBLISH HISTORY</div>
                <PublishHistory articleId={articleId} refreshKey={publishHistoryRefreshKey} />
              </div>
            </>
          )}
        </aside>

      </div>{/* end BODY */}

      {/* ═══ MOBILE: Sticky bottom bar — stage-aware ══════════════════════════ */}
      <div className="lg:hidden" style={{
        position: 'sticky', bottom: 0, zIndex: 25,
        padding: '10px 16px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        background: 'rgba(8,12,20,0.97)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 10,
      }}>
        {/* Stage 1: big Start Rewrite button only */}
        {stage === 'configure' && (
          <>
            <button onClick={handleStartRewrite} disabled={rewriteLoading}
              style={{ flex: 3, padding: '13px 0', fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,var(--accent),#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: rewriteLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 16px rgba(108,99,255,0.45)' }}>
              {rewriteLoading ? <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Zap size={16} />}
              Start Rewrite
            </button>
            <button onClick={handleStartWithFetch} disabled={rewriteLoading}
              style={{ flex: 2, padding: '13px 0', fontSize: 12, background: 'var(--card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, cursor: rewriteLoading ? 'not-allowed' : 'pointer' }}>
              Fetch & Rewrite
            </button>
          </>
        )}
        {/* Stage 2: minimal re-run, no release */}
        {stage === 'running' && (
          <>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} style={{ color: 'var(--accent-light)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-light)' }}>Writing pass {Math.max(runningIndex + 1, donePasses)} of {totalPasses}…</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{progressPct}% complete</div>
              </div>
            </div>
            <button onClick={handleRerunAll}
              style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, background: 'var(--card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer' }}>
              ↺ Re-run All
            </button>
          </>
        )}
        {/* Stage 3: glowing Release button */}
        {stage === 'done' && (
          <>
            <button onClick={handleRerunAll}
              style={{ flex: 1, padding: '12px 0', fontSize: 12, background: 'var(--card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <RotateCw size={14} /> Re-run
            </button>
            <button onClick={handleOpenPublishSheet}
              style={{ flex: 3, padding: '12px 0', fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,#00e5a0,#00b87a)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,229,160,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Send size={16} />
              {article.wpPostId ? '🌐 Update Post' : '🚀 Release'}
            </button>
          </>
        )}
      </div>

      {/* Pulse animation for done-state release button */}
      <style>{`@keyframes pulse-green { 0%,100%{box-shadow:0 2px 16px rgba(0,229,160,0.45)} 50%{box-shadow:0 2px 28px rgba(0,229,160,0.75)} }`}</style>

      {lockModal}

      <PrePublishSheet
        open={publishSheetOpen}
        article={article}
        rewrite={rewrite}
        onClose={() => setPublishSheetOpen(false)}
        onPublished={() => {
          setPublishSheetOpen(false)
          setPublishHistoryRefreshKey(k => k + 1)
          mutate()
        }}
      />
    </div>
  )
}
