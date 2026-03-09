'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, RotateCw, Send, Loader2, Eye, Code } from 'lucide-react'
import { RichTextEditor } from './RichTextEditor'
import { MetaBox } from './MetaBox'
import { RewriteStatusStepper } from './RewriteStatusStepper'
import { WPPublishPanel } from './WPPublishPanel'
import type { ScraperArticle, ArticleRewrite, RewritePass } from '@/types/article'
import { REWRITE_LANGUAGES, HEADING_FORMATS, SUBHEADING_FORMATS, PARAGRAPH_TAGS } from '@/lib/rewrite-options'

function getPass(passes: RewritePass[], id: string) {
  return passes.find(p => p.id === id)
}

function wordCount(text: string): number {
  if (!text || typeof text !== 'string') return 0
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return stripped ? stripped.split(' ').length : 0
}

const DEFAULT_NEWSPIN_FOOTER = `<h4><em>Long or Short, get news the way you like. No ads. No redirections. Download Newspin and Stay Alert, The CSR Journal Mobile app, for fast, crisp, clean updates!</em></h4>
<h4><em>App Store – <a href="https://apps.apple.com/in/app/newspin/id6746449540">https://apps.apple.com/in/app/newspin/id6746449540</a></em></h4>
<h4><em>Google Play Store – <a href="https://play.google.com/store/apps/details?id=com.inventifweb.newspin&pcampaignid=web_share">https://play.google.com/store/apps/details?id=com.inventifweb.newspin&pcampaignid=web_share</a></em></h4>`

interface RewriteEditorLayoutProps {
  article: ScraperArticle
  rewrite: ArticleRewrite | undefined
  onOutputChange: (passId: string, value: string) => void
  onCustomFooterChange?: (value: string | null) => void
  onPublish: (opts: { status: string; categoryId: string; authorId: string; tagIds?: number[]; featuredMediaId?: number; wordpressSiteId?: string }) => Promise<void>
  onReject?: () => Promise<void>
  onBack: () => void
  onRerunAll: () => void
  onPublishClick: () => void
  onSwitchToCards?: () => void
  onReleaseArticle?: () => void
  lockedByMe?: boolean
  outputLanguage: string
  customPrompt: string
  onOutputLanguageChange: (lang: string) => void
  onCustomPromptChange: (prompt: string) => void
  headingFormat: string
  subheadingFormat: string
  paragraphTag: string
  onHeadingFormatChange: (format: string) => void
  onSubheadingFormatChange: (format: string) => void
  onParagraphTagChange: (tag: string) => void
  allDone: boolean
  publishLoading: boolean
  runningPassIndex: number
}

export function RewriteEditorLayout({
  article,
  rewrite,
  onOutputChange,
  onCustomFooterChange,
  onPublish,
  onReject,
  onBack,
  onRerunAll,
  onPublishClick,
  onSwitchToCards,
  onReleaseArticle,
  lockedByMe,
  outputLanguage,
  customPrompt,
  onOutputLanguageChange,
  onCustomPromptChange,
  headingFormat,
  subheadingFormat,
  paragraphTag,
  onHeadingFormatChange,
  onSubheadingFormatChange,
  onParagraphTagChange,
  allDone,
  publishLoading,
  runningPassIndex,
}: RewriteEditorLayoutProps) {
  const passes = rewrite?.passes ?? []
  const fullPass = getPass(passes, 'full')
  const excerptPass = getPass(passes, 'shortnews')
  const metaDescPass = getPass(passes, 'char120')
  const seoTitlePass = getPass(passes, 'char65')
  const keywordsPass = getPass(passes, 'keywords')

  const [title, setTitle] = useState(article.title)
  const [slug, setSlug] = useState(article.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ?? '')
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual')

  useEffect(() => {
    const seoTitle = seoTitlePass?.output?.trim()
    if (seoTitle) setTitle(seoTitle)
  }, [seoTitlePass?.output])

  const fullContent = fullPass?.output ?? ''
  const wordCountVal = wordCount(fullContent)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Top bar - WordPress style (wraps on mobile) */}
      <div
        className="rewrite-topbar flex flex-wrap items-center gap-2 lg:gap-3 p-3 lg:p-4 shrink-0 border-b border-[var(--border)] bg-[var(--surface)]"
      >
        <button
          onClick={onBack}
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
        {lockedByMe && onReleaseArticle && (
          <button
            onClick={onReleaseArticle}
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
        {onSwitchToCards && (
          <button
            onClick={onSwitchToCards}
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
              cursor: 'pointer',
            }}
          >
            Cards
          </button>
        )}
        <button
          onClick={onRerunAll}
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
            cursor: 'pointer',
          }}
        >
          <RotateCw size={12} />
          Re-run All
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={onPublishClick}
          disabled={!allDone || publishLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            background: allDone ? (article.wpPostId ? 'var(--accent)' : 'var(--green)') : 'var(--surface)',
            color: allDone ? '#fff' : 'var(--text-dim)',
            border: 'none',
            borderRadius: 6,
            cursor: allDone && !publishLoading ? 'pointer' : 'not-allowed',
            boxShadow: allDone ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
          }}
        >
          {publishLoading ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Send size={14} />}
          {article.wpPostId ? 'Republish to WP →' : 'Publish to WP →'}
        </button>
      </div>

      <div className="rewrite-editor-layout flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Main content area - WordPress editor style */}
        <div
          className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-5 min-w-0"
        >
          {/* Article info badge */}
          {article.source?.name && (
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 5,
                border: '1px solid rgba(124,58,237,0.2)',
                color: 'var(--accent-light)',
                background: 'var(--accent-glow)',
                fontFamily: 'Geist Mono, monospace',
                alignSelf: 'flex-start',
              }}
            >
              {article.source.name}
            </span>
          )}

          {/* Post title - synced with char65 (SEO title) from rewrite */}
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Post Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => {
                const v = e.target.value
                setTitle(v)
                onOutputChange('char65', v)
              }}
              placeholder="Enter post title (or run rewrite to generate)"
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 18,
                fontWeight: 600,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Permalink */}
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Permalink
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'Geist Mono, monospace' }}>
                /{slug || 'post-slug'}/
              </span>
              <button
                type="button"
                style={{
                  fontSize: 11,
                  color: 'var(--accent-light)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
            </div>
          </div>

          {/* Main content - Full Article */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Content</label>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                  Format: {headingFormat.toUpperCase()} (headline) + {subheadingFormat.toUpperCase()} (subheading) + {paragraphTag.toUpperCase()} (body)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    fontSize: 11,
                    background: editorMode === 'visual' ? 'var(--accent-glow)' : 'transparent',
                    color: editorMode === 'visual' ? 'var(--accent-light)' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Eye size={12} />
                  Visual
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('code')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    fontSize: 11,
                    background: editorMode === 'code' ? 'var(--accent-glow)' : 'transparent',
                    color: editorMode === 'code' ? 'var(--accent-light)' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Code size={12} />
                  Code
                </button>
              </div>
            </div>

            {fullPass && (
              editorMode === 'visual' ? (
                <RichTextEditor
                  value={fullContent}
                  onChange={v => onOutputChange('full', v)}
                  disabled={fullPass.status === 'RUNNING'}
                  minHeight={320}
                />
              ) : (
                <textarea
                  value={fullContent}
                  onChange={e => onOutputChange('full', e.target.value)}
                  disabled={fullPass.status === 'RUNNING'}
                  placeholder={fullPass.status === 'RUNNING' ? 'Generating…' : ''}
                  style={{
                    width: '100%',
                    minHeight: 320,
                    padding: 12,
                    fontSize: 13,
                    fontFamily: 'Geist Mono, monospace',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    resize: 'vertical',
                  }}
                />
              )
            )}
          </div>

          {/* Word count */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Geist Mono, monospace' }}>
            Word count: {wordCountVal}
          </div>

          {/* Newspin app footer - editable, appended when publishing to WordPress */}
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Newspin app footer (appended when publishing to WordPress)
            </label>
            <textarea
              value={rewrite?.customFooter ?? ''}
              onChange={e => {
                const v = e.target.value
                onCustomFooterChange?.(v || null)
              }}
              placeholder={DEFAULT_NEWSPIN_FOOTER}
              rows={4}
              style={{
                width: '100%',
                padding: 12,
                fontSize: 12,
                fontFamily: 'Geist Mono, monospace',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                resize: 'vertical',
              }}
            />
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
              Leave empty to use default. Edit to customize or remove footer.
            </div>
          </div>

          {/* Source URL */}
          {article.url && (
            <div style={{ fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>Source: </span>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--cyan)', textDecoration: 'none' }}
              >
                {article.url}
              </a>
            </div>
          )}
        </div>

        {/* Right sidebar - Meta boxes (stacks below on mobile) */}
        <div
          className="rewrite-editor-sidebar w-full lg:w-[320px] lg:flex-shrink-0 lg:border-l border-t lg:border-t-0 border-[var(--border)] p-4 overflow-y-auto bg-[var(--surface)]"
        >
          <RewriteStatusStepper article={article} runningPassIndex={runningPassIndex} passes={passes} />

          <MetaBox title="Language & Format" defaultOpen={true}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Output language</div>
              <select
                value={outputLanguage}
                onChange={e => onOutputLanguageChange(e.target.value)}
                style={inputStyle}
              >
                {REWRITE_LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Heading (main headline)</div>
              <select
                value={headingFormat}
                onChange={e => onHeadingFormatChange(e.target.value)}
                style={inputStyle}
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
                onChange={e => onSubheadingFormatChange(e.target.value)}
                style={inputStyle}
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
                onChange={e => onParagraphTagChange(e.target.value)}
                style={inputStyle}
              >
                {PARAGRAPH_TAGS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Custom prompt (optional)</div>
              <textarea
                value={customPrompt}
                onChange={e => onCustomPromptChange(e.target.value)}
                placeholder="Override full-article prompt. Use {{LANGUAGE}}, {{TITLE}}, {{CONTENT}}"
                rows={3}
                style={inputStyle}
              />
            </div>
          </MetaBox>

          <MetaBox title="Short News / Excerpt" defaultOpen={true}>
            <textarea
              value={excerptPass?.output ?? ''}
              onChange={e => onOutputChange('shortnews', e.target.value)}
              disabled={excerptPass?.status === 'RUNNING'}
              placeholder={excerptPass?.status === 'RUNNING' ? 'Generating…' : 'Brief summary → WP post_excerpt'}
              rows={4}
              style={inputStyle}
            />
          </MetaBox>

          <MetaBox title="Mobile Title (max 65 chars)" defaultOpen={true}>
            <input
              type="text"
              value={seoTitlePass?.output ?? ''}
              onChange={e => onOutputChange('char65', e.target.value)}
              disabled={seoTitlePass?.status === 'RUNNING'}
              placeholder={seoTitlePass?.status === 'RUNNING' ? 'Generating…' : 'SEO title / Mobile headline'}
              maxLength={65}
              style={inputStyle}
            />
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
              {(seoTitlePass?.output ?? '').length}/65 characters
            </div>
          </MetaBox>

          <MetaBox title="Mobile Short Description (max 120 chars)" defaultOpen={true}>
            <textarea
              value={metaDescPass?.output ?? ''}
              onChange={e => onOutputChange('char120', e.target.value)}
              disabled={metaDescPass?.status === 'RUNNING'}
              placeholder={metaDescPass?.status === 'RUNNING' ? 'Generating…' : 'Meta description / Short description for mobile'}
              maxLength={120}
              rows={2}
              style={inputStyle}
            />
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
              {(metaDescPass?.output ?? '').length}/120 characters
            </div>
          </MetaBox>

          <MetaBox title="Yoast SEO" defaultOpen={true}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 10 }}>
              Sent as metal_* meta when publishing (matches n8n flow).
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Focus keyphrase</div>
              <input
                type="text"
                value={keywordsPass?.output ?? ''}
                onChange={e => onOutputChange('keywords', e.target.value)}
                disabled={keywordsPass?.status === 'RUNNING'}
                placeholder={keywordsPass?.status === 'RUNNING' ? 'Generating…' : '2–4 word SEO keyphrase'}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>SEO title (max 65 chars)</div>
              <input
                type="text"
                value={seoTitlePass?.output ?? ''}
                onChange={e => onOutputChange('char65', e.target.value)}
                disabled={seoTitlePass?.status === 'RUNNING'}
                placeholder={seoTitlePass?.status === 'RUNNING' ? 'Generating…' : 'yoast_wpseo_title'}
                maxLength={65}
                style={inputStyle}
              />
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                {(seoTitlePass?.output ?? '').length}/65
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Meta description (max 120 chars)</div>
              <textarea
                value={metaDescPass?.output ?? ''}
                onChange={e => onOutputChange('char120', e.target.value)}
                disabled={metaDescPass?.status === 'RUNNING'}
                placeholder={metaDescPass?.status === 'RUNNING' ? 'Generating…' : 'yoast_wpseo_metadesc'}
                maxLength={120}
                rows={2}
                style={inputStyle}
              />
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                {(metaDescPass?.output ?? '').length}/120
              </div>
            </div>
          </MetaBox>

          <MetaBox title="Source Category">
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {article.category || '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>From RSS feed. Use Category below for WordPress.</div>
          </MetaBox>

          <div style={{ marginTop: 24 }}>
            <WPPublishPanel
              articleId={article.id}
              rewrite={rewrite}
              article={{ title: article.title, description: article.description ?? undefined, fullContent: article.fullContent ?? undefined, category: article.category ?? undefined, image: article.image ?? undefined }}
              wpPostId={article.wpPostId}
              onPublish={onPublish}
              onReject={onReject}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 12,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontFamily: 'inherit',
  resize: 'vertical',
}
