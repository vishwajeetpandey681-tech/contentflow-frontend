export type ArticleStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FETCH_FAILED'
  | 'EXTRACTION_FAILED'
  | 'EXPORTED'

export type RewriteStatus = 'IDLE' | 'RUNNING' | 'DONE' | 'FAILED'

export interface TokenUsageSnapshot {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ProviderUsageTotals {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  requests: number
}

export interface RewritePass {
  id: 'full' | 'shortnews' | 'char120' | 'char65' | 'keywords' | 'social_caption' | 'push_notification'
  label: string
  description: string
  wpField: string
  charLimit?: number
  status: RewriteStatus
  output: string
  originalOutput: string
  aiProvider?: 'ollama' | 'openai'
  aiModel?: string
  tokenUsage?: TokenUsageSnapshot | null
}

export interface RewriteQuality {
  wordCount: number
  readTime: number
  fleschKincaid: number | null
  seoScore: number | null
  similarityPercent: number | null
}

export interface ArticleRewrite {
  articleId: string
  passes: RewritePass[]
  startedAt?: string
  completedAt?: string
  outputLanguage?: string
  customPrompt?: string | null
  customFooter?: string | null
  tone?: string | null
  targetAudience?: string | null
  customInstruction?: string | null
  targetWordCount?: number | null
  quality?: RewriteQuality | null
  usageTotals?: {
    ollama: ProviderUsageTotals
    openai: ProviderUsageTotals
  } | null
  rewriteProviderSetting?: 'ollama_first' | 'openai_only'
  ollamaModelLabel?: string
  openaiModelLabel?: string
}

export interface RewriteVersion {
  id: string
  label: string
  createdAt: string
  passes: RewritePass[]
}

export interface ScraperArticle {
  id:            string
  title:         string
  url:           string
  image:         string | null
  description:   string | null
  fullContent:   string | null
  rewrittenContent?: string | null
  author:        string | null
  siteName:      string | null
  wordCount:     number
  readTime:      number
  language:      string | null
  publishedAt:   string | null
  status:        ArticleStatus
  createdAt:     string
  sourceId:      string
  category?:     string | null
  source?: {
    id:   string
    name: string
  }
  rewriteStatus?: RewriteStatus
  rewrite?:      ArticleRewrite
  wpPostId?:     number | null
  wpPostUrl?:    string | null
  wpPublishes?:  Record<string, number>
  wpPublishHistory?: WpPublishHistoryEntry[]
  assignedTo?:   string | null
  assignedToName?: string | null
  assignedAt?:   string | null
  lockedBy?:     string | null
  lockedByName?: string | null
  lockedAt?:    string | null
  lockExpiresAt?: string | null
  isRead?:      boolean
  isStarred?:   boolean
  approvalStatus?: 'pending' | 'auto_approved' | 'human_approved' | 'rejected' | 'published'
  approvalScore?: number
  approvalReasons?: string[]
  approvedBy?: string | null
  approvedAt?: string | null
  rejectedReason?: string | null
  sourceName?: string
  publishedToWebsite?: boolean
  websiteArticleId?: string | null
  websiteSlug?: string | null
  quickRewriteMeta?: {
    provider: 'ollama' | 'openai'
    model: string
    usage: TokenUsageSnapshot | null
    at: string
  } | null
  isTrending?: boolean
  trendKeyword?: string | null
  trendTraffic?: string | null
  trendRelated?: string[] | null
}

export type InboxArticle = ScraperArticle

export interface WpPublishHistoryEntry {
  id: string
  siteId: string
  siteLabel: string
  siteUrl?: string
  attemptedAt: string
  publishedAt?: string
  status: 'published' | 'draft' | 'scheduled' | 'failed' | 'unpublished' | 'pending'
  postId?: number | null
  postUrl?: string | null
  title?: string
  error?: string | null
}

export interface InboxStats {
  pending:   number
  approved:  number
  rejected:  number
  failed:    number
  published?: number
}
