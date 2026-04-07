/**
 * Build a Google News RSS URL for topic-based ingestion (no Twitter/X API).
 * Same pipeline as any RSS source: backend fetches → inbox → rewrite.
 */
export type GoogleNewsRegion = 'IN' | 'US' | 'GB'

const GOOGLE_NEWS_REGION_PARAMS: Record<GoogleNewsRegion, string> = {
  IN: 'hl=en-IN&gl=IN&ceid=IN:en',
  US: 'hl=en-US&gl=US&ceid=US:en',
  GB: 'hl=en-GB&gl=GB&ceid=GB:en',
}

export function buildGoogleNewsRssUrl(topic: string, region: GoogleNewsRegion = 'IN'): string {
  const q = topic.trim()
  if (!q) return ''
  const params = GOOGLE_NEWS_REGION_PARAMS[region]
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${params}`
}

export function suggestedSourceNameForTopic(topic: string): string {
  const t = topic.trim()
  if (!t) return 'Google News topic'
  const short = t.length > 40 ? `${t.slice(0, 37)}…` : t
  return `News: ${short}`
}
