/** Pre-built library of feeds for quick add. Supports RSS, ATOM, JSON Feed, HTML listing. Channel = publisher, category = topic. */

import type { SourceType, HtmlListingConfig } from '@/types/source'

export interface LibrarySource {
  name: string
  url: string
  channel: string
  category: string
  type: SourceType
  htmlListingConfig?: HtmlListingConfig
  /** When RSS fails (403, etc.), auto-switch to scraping this URL with fallbackHtmlListingConfig. */
  fallbackUrl?: string
  fallbackHtmlListingConfig?: HtmlListingConfig
}

const R = 'RSS' as const
const J = 'JSON_FEED' as const
const H = 'HTML_LISTING' as const

const news18Html = { baseUrl: 'https://www.news18.com', linkSelector: 'a[href*="news18.com"][href$=".html"]' } as const

export const SOURCE_LIBRARY: LibrarySource[] = [
  // TOI - Times of India
  { name: 'TOI Top Stories', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', channel: 'TOI', category: 'News', type: R },
  { name: 'TOI India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', channel: 'TOI', category: 'Politics', type: R },
  { name: 'TOI World', url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms', channel: 'TOI', category: 'World', type: R },
  { name: 'TOI Business', url: 'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms', channel: 'TOI', category: 'Business', type: R },
  { name: 'TOI Sports', url: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms', channel: 'TOI', category: 'Sports', type: R },
  { name: 'TOI Cricket', url: 'https://timesofindia.indiatimes.com/rssfeeds/54829575.cms', channel: 'TOI', category: 'Sports', type: R },
  { name: 'TOI Entertainment', url: 'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms', channel: 'TOI', category: 'Entertainment', type: R },
  { name: 'TOI Technology', url: 'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms', channel: 'TOI', category: 'Technology', type: R },
  // NDTV
  { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-india-news', channel: 'NDTV', category: 'Politics', type: R },
  { name: 'NDTV World', url: 'https://feeds.feedburner.com/ndtvnews-world-news', channel: 'NDTV', category: 'World', type: R },
  { name: 'NDTV Business', url: 'https://feeds.feedburner.com/ndtvprofit-latest', channel: 'NDTV', category: 'Business', type: R },
  { name: 'NDTV Sports', url: 'https://feeds.feedburner.com/ndtvsports-latest', channel: 'NDTV', category: 'Sports', type: R },
  { name: 'NDTV Technology', url: 'https://feeds.feedburner.com/gadgets360-latest', channel: 'NDTV', category: 'Technology', type: R },
  // Indian Express
  { name: 'Indian Express India', url: 'https://indianexpress.com/feed/', channel: 'Indian Express', category: 'Politics', type: R },
  { name: 'Indian Express World', url: 'https://indianexpress.com/section/world/feed/', channel: 'Indian Express', category: 'World', type: R },
  { name: 'Indian Express Business', url: 'https://indianexpress.com/section/business/feed/', channel: 'Indian Express', category: 'Business', type: R },
  { name: 'Indian Express Sports', url: 'https://indianexpress.com/section/sports/feed/', channel: 'Indian Express', category: 'Sports', type: R },
  { name: 'Indian Express Technology', url: 'https://indianexpress.com/section/technology/feed/', channel: 'Indian Express', category: 'Technology', type: R },
  // Hindustan Times
  { name: 'HT India', url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', channel: 'Hindustan Times', category: 'Politics', type: R },
  { name: 'HT World', url: 'https://www.hindustantimes.com/feeds/rss/world-news/rssfeed.xml', channel: 'Hindustan Times', category: 'World', type: R },
  { name: 'HT Business', url: 'https://www.hindustantimes.com/feeds/rss/business/rssfeed.xml', channel: 'Hindustan Times', category: 'Business', type: R },
  { name: 'HT Sports', url: 'https://www.hindustantimes.com/feeds/rss/sports/rssfeed.xml', channel: 'Hindustan Times', category: 'Sports', type: R },
  // The Hindu
  { name: 'The Hindu National', url: 'https://www.thehindu.com/news/national/feeder/default.rss', channel: 'The Hindu', category: 'Politics', type: R },
  { name: 'The Hindu World', url: 'https://www.thehindu.com/news/international/feeder/default.rss', channel: 'The Hindu', category: 'World', type: R },
  { name: 'The Hindu Business', url: 'https://www.thehindu.com/business/feeder/default.rss', channel: 'The Hindu', category: 'Business', type: R },
  { name: 'The Hindu Sport', url: 'https://www.thehindu.com/sport/feeder/default.rss', channel: 'The Hindu', category: 'Sports', type: R },
  // Economic Times
  { name: 'ET Markets', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977029391.cms', channel: 'Economic Times', category: 'Business', type: R },
  { name: 'ET Tech', url: 'https://economictimes.indiatimes.com/tech/rssfeeds/13358110.cms', channel: 'Economic Times', category: 'Technology', type: R },
  { name: 'ET India', url: 'https://economictimes.indiatimes.com/news/politics-and-nation/rssfeeds/4229393.cms', channel: 'Economic Times', category: 'Politics', type: R },
  // BBC
  { name: 'BBC India', url: 'https://feeds.bbci.co.uk/news/world/asia/india/rss.xml', channel: 'BBC', category: 'Politics', type: R },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', channel: 'BBC', category: 'World', type: R },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', channel: 'BBC', category: 'Business', type: R },
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', channel: 'BBC', category: 'Sports', type: R },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', channel: 'BBC', category: 'Technology', type: R },
  // ANI - RSS feeds
  { name: 'ANI National', url: 'https://aninews.in/rss/feed/category/national.xml', channel: 'ANI', category: 'Politics', type: R },
  { name: 'ANI World', url: 'https://aninews.in/rss/feed/category/world.xml', channel: 'ANI', category: 'World', type: R },
  { name: 'ANI Business', url: 'https://aninews.in/rss/feed/category/business.xml', channel: 'ANI', category: 'Business', type: R },
  { name: 'ANI Sports', url: 'https://aninews.in/rss/feed/category/sports.xml', channel: 'ANI', category: 'Sports', type: R },
  { name: 'ANI Entertainment', url: 'https://aninews.in/rss/feed/category/entertainment.xml', channel: 'ANI', category: 'Entertainment', type: R },
  { name: 'ANI Technology', url: 'https://aninews.in/rss/feed/category/tech.xml', channel: 'ANI', category: 'Technology', type: R },
  // ANI - HTML listing (fallback when RSS is unavailable)
  { name: 'ANI News (HTML)', url: 'https://aninews.in/category/national/politics/, https://aninews.in/category/national/general-news/', channel: 'ANI', category: 'Politics', type: H, htmlListingConfig: { baseUrl: 'https://aninews.in', cardSelector: '.card', titleSelector: 'h1.title', urlSelector: "a[href^='/news']" } },
  // Al Jazeera
  { name: 'Al Jazeera All', url: 'https://www.aljazeera.com/xml/rss/all.xml', channel: 'Al Jazeera', category: 'News', type: R },
  { name: 'Al Jazeera World', url: 'https://www.aljazeera.com/xml/rss/world.xml', channel: 'Al Jazeera', category: 'World', type: R },
  { name: 'Al Jazeera Economy', url: 'https://www.aljazeera.com/xml/rss/economy.xml', channel: 'Al Jazeera', category: 'Business', type: R },
  // Al Jazeera Middle East - 404 (removed)
  // Bollywood / Entertainment
  { name: 'Pinkvilla', url: 'https://www.pinkvilla.com/rss.xml', channel: 'Pinkvilla', category: 'Entertainment', type: R },
  { name: 'Bollywood Hungama', url: 'https://www.bollywoodhungama.com/rss/news.xml', channel: 'Bollywood Hungama', category: 'Entertainment', type: R },
  { name: 'BollywoodLife', url: 'https://www.bollywoodlife.com/feed/', channel: 'BollywoodLife', category: 'Entertainment', type: R },
  // Filmfare - feed broken/invalid (removed)
  // FilmiBeat - 403 (removed)
  // Lifestyle (Femina, iDiva, Vogue India - feeds 404/400, removed)
  // Cricket / Sports (Cricbuzz 404, Sportskeeda 500, SportsTak domain for sale - removed)
  { name: 'ESPNCricinfo', url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', channel: 'ESPNCricinfo', category: 'Sports', type: R },
  // Tech (Gadgets360 skipped - same URL as NDTV Technology; 91mobiles 404 - removed)
  { name: 'BGR India', url: 'https://bgr.com/feed/', channel: 'BGR India', category: 'Technology', type: R },
  { name: 'MySmartPrice', url: 'https://www.mysmartprice.com/gear/feed/', channel: 'MySmartPrice', category: 'Technology', type: R },
  // Business
  { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', channel: 'Economic Times', category: 'Business', type: R },
  // Moneycontrol - returns HTML consent page, not RSS (removed)
  { name: 'Business Standard', url: 'https://www.business-standard.com/rss/home_page_top_stories.rss', channel: 'Business Standard', category: 'Business', type: R },
  { name: 'LiveMint', url: 'https://www.livemint.com/rss/news', channel: 'LiveMint', category: 'Business', type: R },
  // International (BBC News India, Al Jazeera skipped - same URLs as BBC India, Al Jazeera All)
  { name: 'ANI News', url: 'https://aninews.in/rss.xml', channel: 'ANI', category: 'News', type: R },
  // Navbharat Times (Times Group Hindi) - RSS may 403; auto-switch to HTML
  { name: 'Navbharat Times', url: 'https://navbharattimes.indiatimes.com/rssfeedsdefault.cms', channel: 'Navbharat Times', category: 'News', type: R, fallbackUrl: 'https://navbharattimes.indiatimes.com/', fallbackHtmlListingConfig: { baseUrl: 'https://navbharattimes.indiatimes.com', linkSelector: 'a[href*="/articleshow/"], a[href*="/liveblog/"]' } },
  { name: 'Navbharat Times (HTML)', url: 'https://navbharattimes.indiatimes.com/', channel: 'Navbharat Times', category: 'News', type: H, htmlListingConfig: { baseUrl: 'https://navbharattimes.indiatimes.com', linkSelector: 'a[href*="/articleshow/"], a[href*="/liveblog/"]' } },
  // News18 - RSS often 403; auto-switch to HTML category URLs
  { name: 'News18 India (HTML)', url: 'https://www.news18.com/india/', channel: 'News18', category: 'Politics', type: H, htmlListingConfig: news18Html },
  { name: 'News18 India', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/india.xml', channel: 'News18', category: 'Politics', type: R, fallbackUrl: 'https://www.news18.com/india/', fallbackHtmlListingConfig: news18Html },
  { name: 'News18 Politics (HTML)', url: 'https://www.news18.com/politics/', channel: 'News18', category: 'Politics', type: H, htmlListingConfig: news18Html },
  { name: 'News18 Politics', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/politics.xml', channel: 'News18', category: 'Politics', type: R, fallbackUrl: 'https://www.news18.com/politics/', fallbackHtmlListingConfig: news18Html },
  { name: 'News18 Business (HTML)', url: 'https://www.news18.com/business/', channel: 'News18', category: 'Business', type: H, htmlListingConfig: news18Html },
  { name: 'News18 Business', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/business.xml', channel: 'News18', category: 'Business', type: R, fallbackUrl: 'https://www.news18.com/business/', fallbackHtmlListingConfig: news18Html },
  { name: 'News18 Cricket (HTML)', url: 'https://www.news18.com/cricket/', channel: 'News18', category: 'Sports', type: H, htmlListingConfig: news18Html },
  { name: 'News18 Cricket', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/cricket.xml', channel: 'News18', category: 'Sports', type: R, fallbackUrl: 'https://www.news18.com/cricket/', fallbackHtmlListingConfig: news18Html },
  { name: 'News18 Tech (HTML)', url: 'https://www.news18.com/tech/', channel: 'News18', category: 'Technology', type: H, htmlListingConfig: news18Html },
  { name: 'News18 Tech', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/tech.xml', channel: 'News18', category: 'Technology', type: R, fallbackUrl: 'https://www.news18.com/tech/', fallbackHtmlListingConfig: news18Html },
  { name: 'News18 Entertainment (HTML)', url: 'https://www.news18.com/entertainment/', channel: 'News18', category: 'Entertainment', type: H, htmlListingConfig: news18Html },
  { name: 'News18 Entertainment', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/entertainment.xml', channel: 'News18', category: 'Entertainment', type: R, fallbackUrl: 'https://www.news18.com/entertainment/', fallbackHtmlListingConfig: news18Html },
]

const BASE_CATEGORIES = ['Entertainment', 'Lifestyle', 'Sports', 'Technology', 'Business', 'International'] as const
export const CHANNELS = Array.from(new Set(SOURCE_LIBRARY.map(s => s.channel))).sort()
export const LIBRARY_CATEGORIES = Array.from(new Set([...BASE_CATEGORIES, ...SOURCE_LIBRARY.map(s => s.category)])).sort()
