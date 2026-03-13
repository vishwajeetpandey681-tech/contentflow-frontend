export type ArticleStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FETCH_FAILED'
  | 'EXTRACTION_FAILED'
  | 'EXPORTED'

export type RewriteStatus = 'IDLE' | 'RUNNING' | 'DONE' | 'FAILED'

export interface RewritePass {
  id: 'full' | 'shortnews' | 'char120' | 'char65' | 'keywords' | 'social_caption' | 'push_notification'
  label: string
  description: string
  wpField: string
  charLimit?: number
  status: RewriteStatus
  output: string
  originalOutput: string
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
  wpPublishHistory?: import('@/lib/api').WpPublishHistoryEntry[]
  assignedTo?:   string | null
  assignedToName?: string | null
  assignedAt?:   string | null
  lockedBy?:     string | null
  lockedByName?: string | null
  lockedAt?:    string | null
  lockExpiresAt?: string | null
  isRead?:      boolean
  isStarred?:   boolean
}

export interface InboxStats {
  pending:   number
  approved:  number
  rejected:  number
  failed:    number
  published?: number
}
