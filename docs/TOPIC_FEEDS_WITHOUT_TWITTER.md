# Topic feeds without Twitter/X API

**Twitter/X** does not provide a supported public RSS feed anymore. Scraping the site directly (without the official API) is fragile, often blocked, and may conflict with their terms of use.

## What works well in Contentflow

### 1. Google News RSS by topic (built into “Add source”)

Use **Scraper → Add** → expand **“Topic feeds (no Twitter/X API)”**, enter a keyword or phrase, pick region, then **Apply Google News RSS**.  
That fills a normal **RSS** URL; your existing cron/scrape flow pulls articles → **Inbox** → **Rewrite**.

### 2. Trends + rewrite

**Scraper → Trends** surfaces hot keywords; you can route into rewrite with trend context (when your app supports that flow).

### 3. Any third-party “Twitter → RSS” URL

If you run **RSS-Bridge**, **rss.app**, or similar and get a **working HTTP RSS URL**, add it like any other **RSS** source. Reliability depends entirely on that service, not Contentflow.

### 4. Official X API

For first-party tweets, lists, or search, you need **X API** credentials and compliance with their developer policy.

### 5. One account (e.g. [@realDonaldTrump](https://x.com/realDonaldTrump))

The profile URL **is not a feed**. X often shows errors or empty pages to automated clients (and may require login in the browser).

**Workflow:**

1. Subscribe to a **Twitter → RSS** tool you trust (RSS-Bridge with Twitter bridge + cookies, **rss.app**, etc.) and create a feed for that **@handle**.
2. In Contentflow: **Scraper → Add** → open **“Track an X (Twitter) account”**, paste the profile link or `@handle`, paste the **RSS URL** the tool gives you, then **Apply profile + RSS bridge** → **Add Source**.

That uses the same pipeline as any RSS source (scrape → inbox → rewrite).

---

**Summary:** There is no built-in “fetch Twitter without API” that stays reliable. Use **Google News RSS for topics**, optional **Twitter→RSS bridges** as RSS URLs, or the **official API** for X-native data.
