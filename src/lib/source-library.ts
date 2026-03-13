/** Pre-built library of feeds for quick add. Supports RSS, ATOM, JSON Feed, HTML listing. Channel = publisher, category = topic. */

import type { SourceType, HtmlListingConfig } from '@/types/source'

export interface LibrarySource {
  name: string
  url: string
  channel: string
  category: string
  language: 'english' | 'hindi'
  type: SourceType
  htmlListingConfig?: HtmlListingConfig
  /** When RSS fails (403, etc.), auto-switch to scraping this URL with fallbackHtmlListingConfig. */
  fallbackUrl?: string
  fallbackHtmlListingConfig?: HtmlListingConfig
}

const R = 'RSS' as const
const J = 'JSON_FEED' as const
const H = 'HTML_LISTING' as const

const EN = 'english' as const
const HI = 'hindi' as const

const news18Html = { baseUrl: 'https://www.news18.com', linkSelector: 'a[href*="news18.com"][href$=".html"]' } as const

// ─── English Sources ────────────────────────────────────────────────────────

const ENGLISH_SOURCES: LibrarySource[] = [
  // TOI - Times of India
  { name: 'TOI Top Stories', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', channel: 'TOI', category: 'General', language: EN, type: R },
  { name: 'TOI India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', channel: 'TOI', category: 'Politics', language: EN, type: R },
  { name: 'TOI World', url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms', channel: 'TOI', category: 'World', language: EN, type: R },
  { name: 'TOI Business', url: 'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms', channel: 'TOI', category: 'Business', language: EN, type: R },
  { name: 'TOI Sports', url: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms', channel: 'TOI', category: 'Sports', language: EN, type: R },
  { name: 'TOI Cricket', url: 'https://timesofindia.indiatimes.com/rssfeeds/54829575.cms', channel: 'TOI', category: 'Sports', language: EN, type: R },
  { name: 'TOI Entertainment', url: 'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms', channel: 'TOI', category: 'Entertainment', language: EN, type: R },
  { name: 'TOI Technology', url: 'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms', channel: 'TOI', category: 'Technology', language: EN, type: R },
  // NDTV
  { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-india-news', channel: 'NDTV', category: 'Politics', language: EN, type: R },
  { name: 'NDTV World', url: 'https://feeds.feedburner.com/ndtvnews-world-news', channel: 'NDTV', category: 'World', language: EN, type: R },
  { name: 'NDTV Business', url: 'https://feeds.feedburner.com/ndtvprofit-latest', channel: 'NDTV', category: 'Business', language: EN, type: R },
  { name: 'NDTV Sports', url: 'https://feeds.feedburner.com/ndtvsports-latest', channel: 'NDTV', category: 'Sports', language: EN, type: R },
  { name: 'NDTV Technology', url: 'https://feeds.feedburner.com/gadgets360-latest', channel: 'NDTV', category: 'Technology', language: EN, type: R },
  // Indian Express
  { name: 'Indian Express India', url: 'https://indianexpress.com/feed/', channel: 'Indian Express', category: 'Politics', language: EN, type: R },
  { name: 'Indian Express World', url: 'https://indianexpress.com/section/world/feed/', channel: 'Indian Express', category: 'World', language: EN, type: R },
  { name: 'Indian Express Business', url: 'https://indianexpress.com/section/business/feed/', channel: 'Indian Express', category: 'Business', language: EN, type: R },
  { name: 'Indian Express Sports', url: 'https://indianexpress.com/section/sports/feed/', channel: 'Indian Express', category: 'Sports', language: EN, type: R },
  { name: 'Indian Express Technology', url: 'https://indianexpress.com/section/technology/feed/', channel: 'Indian Express', category: 'Technology', language: EN, type: R },
  // Hindustan Times
  { name: 'HT India', url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', channel: 'Hindustan Times', category: 'Politics', language: EN, type: R },
  { name: 'HT World', url: 'https://www.hindustantimes.com/feeds/rss/world-news/rssfeed.xml', channel: 'Hindustan Times', category: 'World', language: EN, type: R },
  { name: 'HT Business', url: 'https://www.hindustantimes.com/feeds/rss/business/rssfeed.xml', channel: 'Hindustan Times', category: 'Business', language: EN, type: R },
  { name: 'HT Sports', url: 'https://www.hindustantimes.com/feeds/rss/sports/rssfeed.xml', channel: 'Hindustan Times', category: 'Sports', language: EN, type: R },
  // The Hindu
  { name: 'The Hindu National', url: 'https://www.thehindu.com/news/national/feeder/default.rss', channel: 'The Hindu', category: 'Politics', language: EN, type: R },
  { name: 'The Hindu World', url: 'https://www.thehindu.com/news/international/feeder/default.rss', channel: 'The Hindu', category: 'World', language: EN, type: R },
  { name: 'The Hindu Business', url: 'https://www.thehindu.com/business/feeder/default.rss', channel: 'The Hindu', category: 'Business', language: EN, type: R },
  { name: 'The Hindu Sport', url: 'https://www.thehindu.com/sport/feeder/default.rss', channel: 'The Hindu', category: 'Sports', language: EN, type: R },
  // Economic Times
  { name: 'ET Markets', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977029391.cms', channel: 'Economic Times', category: 'Business', language: EN, type: R },
  { name: 'ET Markets (Alt)', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', channel: 'Economic Times', category: 'Business', language: EN, type: R },
  { name: 'ET Economy', url: 'https://economictimes.indiatimes.com/news/economy/rssfeeds/20908763.cms', channel: 'Economic Times', category: 'Business', language: EN, type: R },
  { name: 'ET Tech', url: 'https://economictimes.indiatimes.com/tech/rssfeeds/13358110.cms', channel: 'Economic Times', category: 'Technology', language: EN, type: R },
  { name: 'ET India', url: 'https://economictimes.indiatimes.com/news/politics-and-nation/rssfeeds/4229393.cms', channel: 'Economic Times', category: 'Politics', language: EN, type: R },
  // BBC
  { name: 'BBC India', url: 'https://feeds.bbci.co.uk/news/world/asia/india/rss.xml', channel: 'BBC', category: 'Politics', language: EN, type: R },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', channel: 'BBC', category: 'World', language: EN, type: R },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', channel: 'BBC', category: 'Business', language: EN, type: R },
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', channel: 'BBC', category: 'Sports', language: EN, type: R },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', channel: 'BBC', category: 'Technology', language: EN, type: R },
  // ANI - RSS feeds
  { name: 'ANI National', url: 'https://aninews.in/rss/feed/category/national.xml', channel: 'ANI', category: 'Politics', language: EN, type: R },
  { name: 'ANI World', url: 'https://aninews.in/rss/feed/category/world.xml', channel: 'ANI', category: 'World', language: EN, type: R },
  { name: 'ANI Business', url: 'https://aninews.in/rss/feed/category/business.xml', channel: 'ANI', category: 'Business', language: EN, type: R },
  { name: 'ANI Sports', url: 'https://aninews.in/rss/feed/category/sports.xml', channel: 'ANI', category: 'Sports', language: EN, type: R },
  { name: 'ANI Entertainment', url: 'https://aninews.in/rss/feed/category/entertainment.xml', channel: 'ANI', category: 'Entertainment', language: EN, type: R },
  { name: 'ANI Technology', url: 'https://aninews.in/rss/feed/category/tech.xml', channel: 'ANI', category: 'Technology', language: EN, type: R },
  { name: 'ANI News (HTML)', url: 'https://aninews.in/category/national/politics/, https://aninews.in/category/national/general-news/', channel: 'ANI', category: 'Politics', language: EN, type: H, htmlListingConfig: { baseUrl: 'https://aninews.in', cardSelector: '.card', titleSelector: 'h1.title', urlSelector: "a[href^='/news']" } },
  // Al Jazeera
  { name: 'Al Jazeera All', url: 'https://www.aljazeera.com/xml/rss/all.xml', channel: 'Al Jazeera', category: 'General', language: EN, type: R },
  { name: 'Al Jazeera World', url: 'https://www.aljazeera.com/xml/rss/world.xml', channel: 'Al Jazeera', category: 'World', language: EN, type: R },
  { name: 'Al Jazeera Economy', url: 'https://www.aljazeera.com/xml/rss/economy.xml', channel: 'Al Jazeera', category: 'Business', language: EN, type: R },
  // Bollywood / Entertainment
  { name: 'Pinkvilla', url: 'https://www.pinkvilla.com/rss.xml', channel: 'Pinkvilla', category: 'Entertainment', language: EN, type: R },
  { name: 'Bollywood Hungama', url: 'https://www.bollywoodhungama.com/rss/news.xml', channel: 'Bollywood Hungama', category: 'Entertainment', language: EN, type: R },
  { name: 'BollywoodLife', url: 'https://www.bollywoodlife.com/feed/', channel: 'BollywoodLife', category: 'Entertainment', language: EN, type: R },
  { name: 'ESPNCricinfo', url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', channel: 'ESPNCricinfo', category: 'Sports', language: EN, type: R },
  { name: 'BGR India', url: 'https://bgr.com/feed/', channel: 'BGR India', category: 'Technology', language: EN, type: R },
  { name: 'MySmartPrice', url: 'https://www.mysmartprice.com/gear/feed/', channel: 'MySmartPrice', category: 'Technology', language: EN, type: R },
  { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', channel: 'Economic Times', category: 'Business', language: EN, type: R },
  { name: 'Business Standard', url: 'https://www.business-standard.com/rss/home_page_top_stories.rss', channel: 'Business Standard', category: 'Business', language: EN, type: R },
  { name: 'Business Standard Markets', url: 'https://www.business-standard.com/rss/markets-106.rss', channel: 'Business Standard', category: 'Business', language: EN, type: R },
  { name: 'LiveMint', url: 'https://www.livemint.com/rss/news', channel: 'LiveMint', category: 'Business', language: EN, type: R },
  { name: 'LiveMint Markets', url: 'https://www.livemint.com/rss/markets', channel: 'LiveMint', category: 'Business', language: EN, type: R },
  // Moneycontrol — English
  { name: 'Moneycontrol Latest News', url: 'https://www.moneycontrol.com/rss/latestnews.xml', channel: 'Moneycontrol', category: 'Business', language: EN, type: R },
  { name: 'Moneycontrol Markets', url: 'https://www.moneycontrol.com/rss/marketsnews.xml', channel: 'Moneycontrol', category: 'Business', language: EN, type: R },
  { name: 'Moneycontrol Economy', url: 'https://www.moneycontrol.com/rss/economy.xml', channel: 'Moneycontrol', category: 'Business', language: EN, type: R },
  { name: 'Moneycontrol Stocks', url: 'https://www.moneycontrol.com/rss/marketreports.xml', channel: 'Moneycontrol', category: 'Business', language: EN, type: R },
  { name: 'Moneycontrol Personal Finance', url: 'https://www.moneycontrol.com/rss/personalfinance.xml', channel: 'Moneycontrol', category: 'Business', language: EN, type: R },
  { name: 'Moneycontrol Mutual Funds', url: 'https://www.moneycontrol.com/rss/mutualfunds.xml', channel: 'Moneycontrol', category: 'Business', language: EN, type: R },
  { name: 'ANI News', url: 'https://aninews.in/rss.xml', channel: 'ANI', category: 'General', language: EN, type: R },
  { name: 'Navbharat Times', url: 'https://navbharattimes.indiatimes.com/rssfeedsdefault.cms', channel: 'Navbharat Times', category: 'General', language: EN, type: R, fallbackUrl: 'https://navbharattimes.indiatimes.com/', fallbackHtmlListingConfig: { baseUrl: 'https://navbharattimes.indiatimes.com', linkSelector: 'a[href*="/articleshow/"], a[href*="/liveblog/"]' } },
  { name: 'News18 India (HTML)', url: 'https://www.news18.com/india/', channel: 'News18', category: 'Politics', language: EN, type: H, htmlListingConfig: news18Html },
  { name: 'News18 India', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/india.xml', channel: 'News18', category: 'Politics', language: EN, type: R, fallbackUrl: 'https://www.news18.com/india/', fallbackHtmlListingConfig: news18Html },
  { name: 'News18 Politics', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/politics.xml', channel: 'News18', category: 'Politics', language: EN, type: R, fallbackUrl: 'https://www.news18.com/politics/', fallbackHtmlListingConfig: news18Html },
  { name: 'News18 Business', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/business.xml', channel: 'News18', category: 'Business', language: EN, type: R, fallbackUrl: 'https://www.news18.com/business/', fallbackHtmlListingConfig: news18Html },
  { name: 'News18 Cricket', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/cricket.xml', channel: 'News18', category: 'Sports', language: EN, type: R, fallbackUrl: 'https://www.news18.com/cricket/', fallbackHtmlListingConfig: news18Html },
  { name: 'News18 Tech', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/tech.xml', channel: 'News18', category: 'Technology', language: EN, type: R, fallbackUrl: 'https://www.news18.com/tech/', fallbackHtmlListingConfig: news18Html },
  { name: 'News18 Entertainment', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/entertainment.xml', channel: 'News18', category: 'Entertainment', language: EN, type: R, fallbackUrl: 'https://www.news18.com/entertainment/', fallbackHtmlListingConfig: news18Html },
]

// ─── Hindi Sources ───────────────────────────────────────────────────────────

const HINDI_SOURCES: LibrarySource[] = [
  // === TV CHANNELS ===
  { name: 'Aaj Tak', url: 'https://feeds.feedburner.com/aajtaknews', channel: 'Aaj Tak', category: 'General', language: HI, type: R },
  { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvkhabar', channel: 'NDTV India', category: 'General', language: HI, type: R },
  { name: 'ABP News', url: 'https://www.abplive.com/feed', channel: 'ABP News', category: 'General', language: HI, type: R },
  { name: 'Zee News India', url: 'https://zeenews.india.com/hindi/rss/india.xml', channel: 'Zee News', category: 'General', language: HI, type: R },
  { name: 'News18 Hindi', url: 'https://hindi.news18.com/rss/khabar/nation.xml', channel: 'News18 Hindi', category: 'General', language: HI, type: R },
  { name: 'India TV', url: 'https://www.indiatvnews.com/rssnews/india-news.xml', channel: 'India TV', category: 'General', language: HI, type: R },
  { name: 'TV9 Bharatvarsh', url: 'https://www.tv9hindi.com/feed', channel: 'TV9 Bharatvarsh', category: 'General', language: HI, type: R },
  { name: 'Republic Bharat', url: 'https://www.republicworld.com/feeds/hindi.xml', channel: 'Republic Bharat', category: 'General', language: HI, type: R },
  { name: 'Jan TV', url: 'https://www.jantv.in/feed', channel: 'Jan TV', category: 'General', language: HI, type: R },
  // === NEWSPAPERS ===
  { name: 'Dainik Bhaskar', url: 'https://www.bhaskar.com/rss-feed/1061/', channel: 'Dainik Bhaskar', category: 'Newspaper', language: HI, type: R },
  { name: 'Dainik Bhaskar Business', url: 'https://www.bhaskar.com/rss-feed/1062/', channel: 'Dainik Bhaskar', category: 'Business', language: HI, type: R },
  { name: 'Dainik Bhaskar Sports', url: 'https://www.bhaskar.com/rss-feed/1063/', channel: 'Dainik Bhaskar', category: 'Sports', language: HI, type: R },
  { name: 'Dainik Jagran National', url: 'https://www.jagran.com/rss/news-national.xml', channel: 'Dainik Jagran', category: 'Newspaper', language: HI, type: R },
  { name: 'Dainik Jagran Business', url: 'https://www.jagran.com/rss/news-business.xml', channel: 'Dainik Jagran', category: 'Business', language: HI, type: R },
  { name: 'Dainik Jagran Sports', url: 'https://www.jagran.com/rss/news-sports.xml', channel: 'Dainik Jagran', category: 'Sports', language: HI, type: R },
  { name: 'Amar Ujala National', url: 'https://www.amarujala.com/rss/breaking-news.xml', channel: 'Amar Ujala', category: 'Newspaper', language: HI, type: R },
  { name: 'Amar Ujala Business', url: 'https://www.amarujala.com/rss/business.xml', channel: 'Amar Ujala', category: 'Business', language: HI, type: R },
  { name: 'Amar Ujala Sports', url: 'https://www.amarujala.com/rss/sports.xml', channel: 'Amar Ujala', category: 'Sports', language: HI, type: R },
  { name: 'Navbharat Times', url: 'https://navbharattimes.indiatimes.com/rssfeedstopstories.cms', channel: 'Navbharat Times', category: 'Newspaper', language: HI, type: R },
  { name: 'Navbharat Times Business', url: 'https://navbharattimes.indiatimes.com/business/rssfeed.cms', channel: 'Navbharat Times', category: 'Business', language: HI, type: R },
  { name: 'Hindustan', url: 'https://www.livehindustan.com/rss/India.xml', channel: 'Hindustan', category: 'Newspaper', language: HI, type: R },
  { name: 'Hindustan Business', url: 'https://www.livehindustan.com/rss/business.xml', channel: 'Hindustan', category: 'Business', language: HI, type: R },
  { name: 'Hindustan Sports', url: 'https://www.livehindustan.com/rss/sports.xml', channel: 'Hindustan', category: 'Sports', language: HI, type: R },
  { name: 'Jansatta', url: 'https://www.jansatta.com/feed/', channel: 'Jansatta', category: 'Newspaper', language: HI, type: R },
  { name: 'Prabhat Khabar', url: 'https://www.prabhatkhabar.com/feed', channel: 'Prabhat Khabar', category: 'Newspaper', language: HI, type: R },
  { name: 'Patrika National', url: 'https://www.patrika.com/rss/news.xml', channel: 'Patrika', category: 'Newspaper', language: HI, type: R },
  { name: 'Patrika Business', url: 'https://www.patrika.com/rss/business-news.xml', channel: 'Patrika', category: 'Business', language: HI, type: R },
  { name: 'Nai Dunia', url: 'https://www.naidunia.com/feed', channel: 'Nai Dunia', category: 'Newspaper', language: HI, type: R },
  // === DIGITAL / WEB PORTALS ===
  { name: 'News18 Hindi Politics', url: 'https://hindi.news18.com/rss/khabar/politics.xml', channel: 'News18 Hindi', category: 'Politics', language: HI, type: R },
  { name: 'News18 Hindi Business', url: 'https://hindi.news18.com/rss/business/economy.xml', channel: 'News18 Hindi', category: 'Business', language: HI, type: R },
  { name: 'News18 Hindi Sports', url: 'https://hindi.news18.com/rss/khel/cricket.xml', channel: 'News18 Hindi', category: 'Sports', language: HI, type: R },
  { name: 'ABP Live Politics', url: 'https://www.abplive.com/politics/feed', channel: 'ABP News', category: 'Politics', language: HI, type: R },
  { name: 'ABP Live Business', url: 'https://www.abplive.com/business/feed', channel: 'ABP News', category: 'Business', language: HI, type: R },
  { name: 'ABP Live Sports', url: 'https://www.abplive.com/sports/feed', channel: 'ABP News', category: 'Sports', language: HI, type: R },
  { name: 'Zee Business Hindi', url: 'https://www.zeebiz.com/hindi/rss', channel: 'Zee News', category: 'Business', language: HI, type: R },
  { name: 'Zee Sports Hindi', url: 'https://zeenews.india.com/hindi/rss/sports.xml', channel: 'Zee News', category: 'Sports', language: HI, type: R },
  { name: 'NDTV Hindi Business', url: 'https://feeds.feedburner.com/ndtvprofit-latest', channel: 'NDTV India', category: 'Business', language: HI, type: R },
  { name: 'OpIndia Hindi', url: 'https://hindi.opindia.com/feed/', channel: 'OpIndia', category: 'Politics', language: HI, type: R },
  { name: 'Swarajya', url: 'https://swarajyamag.com/feed', channel: 'Swarajya', category: 'Politics', language: HI, type: R },
  { name: 'Bharat Express', url: 'https://bharatexpress.com/feed', channel: 'Bharat Express', category: 'Digital', language: HI, type: R },
  // === HINDI BUSINESS DEDICATED ===
  { name: 'Moneycontrol Hindi News', url: 'https://hindi.moneycontrol.com/rss/latestnews.xml', channel: 'Moneycontrol', category: 'Business', language: HI, type: R },
  { name: 'Moneycontrol Hindi Markets', url: 'https://hindi.moneycontrol.com/rss/marketsnews.xml', channel: 'Moneycontrol', category: 'Business', language: HI, type: R },
  { name: 'Moneycontrol Hindi Economy', url: 'https://hindi.moneycontrol.com/rss/economy.xml', channel: 'Moneycontrol', category: 'Business', language: HI, type: R },
  { name: 'Moneycontrol Hindi Personal Finance', url: 'https://hindi.moneycontrol.com/rss/personalfinance.xml', channel: 'Moneycontrol', category: 'Business', language: HI, type: R },
  { name: 'Business Standard Hindi', url: 'https://hindi.business-standard.com/rss/latest.rss', channel: 'Business Standard', category: 'Business', language: HI, type: R },
  { name: 'Mint Hindi', url: 'https://www.livemint.com/hindi/rss/news.xml', channel: 'Mint', category: 'Business', language: HI, type: R },
]

export const SOURCE_LIBRARY: LibrarySource[] = [...ENGLISH_SOURCES, ...HINDI_SOURCES]

export const ENGLISH_CHANNELS = Array.from(new Set(ENGLISH_SOURCES.map(s => s.channel))).sort()
export const HINDI_CHANNELS = Array.from(new Set(HINDI_SOURCES.map(s => s.channel))).sort()
export const CHANNELS = Array.from(new Set(SOURCE_LIBRARY.map(s => s.channel))).sort()

export const ENGLISH_CATEGORIES = Array.from(new Set(ENGLISH_SOURCES.map(s => s.category))).sort()
export const HINDI_CATEGORIES = ['General', 'Politics', 'Business', 'Sports', 'Newspaper', 'Digital']

export const LIBRARY_CATEGORIES = Array.from(new Set(SOURCE_LIBRARY.map(s => s.category))).sort()
