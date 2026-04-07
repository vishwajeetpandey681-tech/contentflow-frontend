export type SourceType = 'RSS' | 'ATOM' | 'HTML_LISTING' | 'JSON_FEED'

export type OutputLanguage =
  | 'english' | 'hindi' | 'gujarati' | 'marathi' | 'tamil' | 'telugu' | 'bengali'
  | 'kannada' | 'malayalam' | 'punjabi' | 'urdu' | 'odia' | 'assamese'

export const ARTICLE_CATEGORIES = [
  'Business',
  'Sport',
  'Bollywood',
  'Entertainment',
  'Technology',
  'Politics',
  'World',
  'Lifestyle',
  'Other',
] as const

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number]

export const CRON_PRESETS = [
  { label: 'Every 1 minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 10 minutes', value: '*/10 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 4 hours', value: '0 */4 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily (midnight)', value: '0 0 * * *' },
  { label: 'Manual only', value: '' },
] as const

export const FETCH_INTERVAL_PRESETS = [
  { label: '15 minutes', value: '15m' },
  { label: '1 hour', value: '1h' },
  { label: '6 hours', value: '6h' },
  { label: '12 hours', value: '12h' },
  { label: '24 hours', value: '24h' },
  { label: 'Manual only', value: '' },
] as const

export interface SourceHealth {
  lastFetchedAt: string | null
  successRate: number | null
  avgArticlesPerFetch: number | null
  alert: boolean
  healthStatus: 'green' | 'yellow' | 'red'
}

export interface ScraperSource {
  id:            string
  name:          string
  url:           string
  type:          SourceType
  /** When RSS fails (403, etc.), try scraping this URL with htmlListingConfig instead. */
  fallbackUrl?:  string | null
  fallbackHtmlListingConfig?: HtmlListingConfig | null
  isActive:      boolean
  isBlocked:     boolean
  blockedReason: string | null
  cronSchedule:  string
  fetchInterval?: string
  lastScrapedAt: string | null
  maxPerRun:     number
  failCount:     number
  successCount?: number
  createdAt:     string
  customPrompt?: string | null
  defaultOutputLanguage?: OutputLanguage | null
  channel?: string | null
  category?: ArticleCategory | string | null
  keywordWhitelist?: string | null
  keywordBlacklist?: string | null
  minArticleLength?: number | null
  maxArticleLength?: number | null
  languageFilter?: string | null
  maxArticleAgeDays?: number | null
  feedTitle?: string | null
  feedDescription?: string | null
  feedFavicon?: string | null
  counts?: {
    pending:  number
    approved: number
    rejected: number
    failed:   number
    total:    number
  }
  health?: SourceHealth
}

export interface HtmlListingConfig {
  baseUrl?: string
  cardSelector?: string
  titleSelector?: string
  urlSelector?: string
  /** When set, scrape by finding all links matching this selector (use for 403 sites). Title = link text, url = href. */
  linkSelector?: string
  /** Alternative URLs to try if primary returns 403. */
  fallbackUrls?: string[]
}

export interface CreateSourceInput {
  name:                   string
  url:                    string
  type:                   SourceType
  maxPerRun:              number
  cronSchedule:           string
  fetchInterval?:         string
  htmlListingConfig?:     HtmlListingConfig
  fallbackUrl?:           string | null
  fallbackHtmlListingConfig?: HtmlListingConfig | null
  customPrompt?:          string | null
  defaultOutputLanguage?: OutputLanguage | null
  channel?:               string | null
  category?:              ArticleCategory | string | null
  keywordWhitelist?:      string | null
  keywordBlacklist?:      string | null
  minArticleLength?:      number | null
  maxArticleLength?:      number | null
  languageFilter?:        string | null
  maxArticleAgeDays?:     number | null
  feedTitle?:             string | null
  feedDescription?:       string | null
  feedFavicon?:           string | null
}
