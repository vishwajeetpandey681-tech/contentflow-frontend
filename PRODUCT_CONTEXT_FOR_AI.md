# CSR Studio — Product Context for AI Assistants

**Share this document with Claude or other AI assistants so they can understand and work effectively with this SaaS product.**

---

## Product Overview

**CSR Studio** (brand name) is a **content automation SaaS platform** that helps teams:
1. **Scrape** articles from RSS feeds and HTML listing pages
2. **Review** pulled articles in an inbox
3. **Rewrite** articles with AI (OpenAI)
4. **Publish** to WordPress sites

**Tagline:** Content automation platform — scrape, rewrite, and publish to WordPress.

**Credit:** Idea & developed by Vishwajeet Pandey

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI, Zustand, Axios, SWR |
| **Backend** | Node.js (ESM), Express, JWT auth, file-based storage (`data.json`) |
| **Scraping** | rss-parser, JSDOM, @mozilla/readability, undici (fetch + proxy) |
| **AI** | OpenAI API (GPT models) for article rewriting |

---

## Project Structure

```
contentflow-frontend/     # Next.js app (port 3000)
├── src/
│   ├── app/              # App Router pages
│   │   ├── (dashboard)/  # Protected dashboard routes
│   │   │   ├── scraper/       # Sources, Inbox, Logs
│   │   │   ├── scraper/inbox/[id]/rewrite/  # AI rewrite editor
│   │   │   ├── wordpress/     # WP sites config
│   │   │   ├── settings/     # Global settings
│   │   │   ├── profile/      # User profile
│   │   │   └── team/         # Team & invites
│   │   ├── login/
│   │   └── register/
│   ├── components/
│   ├── hooks/
│   ├── lib/               # api.ts, auth-store, source-library, etc.
│   └── types/
└── next.config.js        # Rewrites /api/* to backend

contentflow-backend/      # Express API (port 4500)
├── server.js             # Monolithic API + scraping logic
└── data.json             # Persisted data (sources, articles, users, settings)
```

---

## Core Features

### 1. Sources (Scraper)
- **Source types:** RSS, ATOM, JSON Feed, HTML_LISTING
- **Pre-built library:** TOI, NDTV, Indian Express, BBC, ANI, News18, etc.
- **HTML listing:** For sites that block RSS (403) — scrape category pages with link/card selectors
- **Fallback:** When RSS fails (403), auto-switch to HTML scraping
- **Per-source:** customPrompt, defaultOutputLanguage, cron schedule, maxPerRun
- **Per-user prefs:** isActive, customPrompt (stored in userSourcePrefs)
- **Blocked sources:** After 5 consecutive failures, source is blocked; "Retry" button unblocks and re-scrapes

### 2. Inbox
- Articles in statuses: PENDING_REVIEW, APPROVED, REJECTED, FAILED, EXPORTED
- Filter by status, category, date, active sources only
- Fetch full article content (Readability)
- Approve / Reject / Delete

### 3. AI Rewrite
- Multi-pass rewriting (Full, Short, Mobile desc, Mobile title, Keywords)
- Custom prompts per source or global
- Output languages: English, Hindi, Gujarati, Marathi, Tamil, etc.
- WP field mapping: map rewrite passes to WordPress fields (post_content, excerpt, meta, etc.)
- Auto-publish option when rewrite is done

### 4. WordPress Publishing
- Connect multiple WordPress sites (REST API)
- Publish articles with category, author, tags, featured image
- Custom fields mapping
- Media upload via backend proxy

### 5. Settings
- OpenAI API key, AI model
- WordPress credentials (URL, user, password)
- Global prompt, dedupe settings, headline similarity threshold
- Team name, environment, timezone, log retention
- Residential proxy (optional, for 403 sites)

### 6. Team
- Invite users by email
- First user = admin
- User source prefs (active/customPrompt) are per-user

---

## Key Data Models

### Source
- `id`, `name`, `url`, `type` (RSS|ATOM|JSON_FEED|HTML_LISTING)
- `htmlListingConfig` (baseUrl, cardSelector/linkSelector, titleSelector, urlSelector, fallbackUrls)
- `fallbackUrl`, `fallbackHtmlListingConfig` for RSS→HTML fallback
- `isActive`, `isBlocked`, `blockedReason`, `failCount`
- `cronSchedule`, `maxPerRun`, `lastScrapedAt`
- `channel`, `category`, `customPrompt`, `defaultOutputLanguage`

### Article
- `id`, `sourceId`, `title`, `url`, `description`, `image`, `fullContent`
- `status`: PENDING_REVIEW | APPROVED | REJECTED | FAILED | EXPORTED
- `category`, `publishedAt`, `createdAt`
- Rewrite passes stored separately

### User
- `id`, `email`, `name`, `passwordHash`
- JWT auth, 7-day expiry

---

## API Overview

- **Base:** `http://localhost:4500/api` (dev) or `/api` (proxied by Next.js)
- **Auth:** Bearer token in `Authorization` header
- **Endpoints:** `/auth/*`, `/sources/*`, `/logs/*`, `/inbox/*`, `/rewrite/*`, `/publish/*`, `/settings/*`, `/team/*`

---

## Environment Variables

**Backend:** `PORT`, `JWT_SECRET`, `OPENAI_API_KEY`, `APP_URL`, `RESIDENTIAL_PROXY_URL`  
**Frontend:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`

---

## Deployment

- **Backend:** Node.js, `node server.js`
- **Frontend:** `next build` + `next start`
- **Process manager:** PM2 (ecosystem.config.cjs)
- **Data:** `data.json` in backend — back up regularly

---

## Conventions

- **Brand:** "CSR Studio" in UI; internal/API may still say "ContentFlow"
- **Footer:** "Idea & developed by Vishwajeet Pandey" on login, register, sidebar
- **localStorage keys:** `contentflow-auth`, `contentflow-ui`, `contentflow-inbox-*` (do not rename — breaks sessions)

---

## Common Tasks

- **Add source to library:** Edit `src/lib/source-library.ts`
- **RSS fallback for 403:** Add to `RSS_FALLBACK_MAP` in backend `server.js`
- **New API endpoint:** Add route in `server.js`, add method in `src/lib/api.ts`
- **New page:** Add under `src/app/(dashboard)/` or `src/app/`
