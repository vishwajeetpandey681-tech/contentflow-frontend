export type ArticleStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FETCH_FAILED'
  | 'EXTRACTION_FAILED'
  | 'EXPORTED'

export type RewriteStatus = 'IDLE' | 'RUNNING' | 'DONE' | 'FAILED'

export interface RewritePass {
  id: 'full' | 'shortnews' | 'char120' | 'char65' | 'keywords'
  label: string
  description: string
  wpField: string
  charLimit?: number
  status: RewriteStatus
  output: string
  originalOutput: string
}

export interface ArticleRewrite {
  articleId: string
  passes: RewritePass[]
  startedAt?: string
  completedAt?: string
  outputLanguage?: string
  customPrompt?: string | null
  customFooter?: string | null
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
  assignedTo?:   string | null
  assignedToName?: string | null
  assignedAt?:   string | null
  lockedBy?:     string | null
  lockedByName?: string | null
  lockedAt?:    string | null
  lockExpiresAt?: string | null
}

export interface InboxStats {
  pending:   number
  approved:  number
  rejected:  number
  failed:    number
  published?: number
}
