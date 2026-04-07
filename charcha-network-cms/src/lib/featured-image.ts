import type { ArticleRewrite, ScraperArticle } from '@/types/article'

const IMG_SRC_RE = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/i

function firstImgSrcFromHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return ''
  const m = html.match(IMG_SRC_RE)
  if (!m?.[1]) return ''
  let u = m[1].trim()
  if (u.startsWith('//')) u = `https:${u}`
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  return ''
}

/**
 * Best URL for featured image: stored article image, else first image in rewrite/full content.
 */
export function resolveFeaturedImageUrl(article: ScraperArticle, rewrite?: ArticleRewrite | null): string {
  if (article.image?.trim()) {
    const u = article.image.trim()
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('//')) {
      return u.startsWith('//') ? `https:${u}` : u
    }
  }
  const fullPass = rewrite?.passes?.find(p => p.id === 'full')?.output
  const sources = [fullPass, article.rewrittenContent, article.fullContent]
  for (const html of sources) {
    const found = firstImgSrcFromHtml(html)
    if (found) return found
  }
  return ''
}
