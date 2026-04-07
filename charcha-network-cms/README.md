# Charcha Network CMS

Standalone editorial app for **Charcha**. It talks only to your **Charcha API** (`NEXT_PUBLIC_CHARCHA_API_URL`). The HTTP shape matches common CMS patterns (JWT auth, inbox, rewrite, website publish). WordPress-specific actions are disabled in the UI; use **Publish to Website** for the public news site.

You do **not** need to run the ContentFlow app at the repo root or **contentflow-backend** unless you are explicitly working on that product too.

## Auth & cookies

- Login: `/auth/cms/login` via `authApi.loginCms`.
- Session: Zustand persist key `charcha-cms-auth`, cookie **`charcha_cms_token`** for middleware.

## Run locally

```bash
cd charcha-network-cms
cp .env.example .env.local
npm install
npm run dev
```

If **port 3000** is already used (for example by the ContentFlow app at the repo root), start on another port:

```bash
npm run dev:3002
```

The CMS proxies `/api/*` to `NEXT_PUBLIC_CHARCHA_API_URL` (default: `http://localhost:4500/api`).

**Local dev checklist:**
1. `cd contentflow-backend && npm run dev` — starts the shared backend on port 4500.
2. `cd charcha-network-cms && npm run dev` — starts this CMS on port 3000.
3. Open [http://localhost:3000/cms/login/](http://localhost:3000/cms/login/) and log in with your `data.json` credentials.

`localhost:4500` is the same `contentflow-backend` that the root ContentFlow app uses. You do **not** need a separate Charcha backend.

**Start the Charcha API before you log in.** The CMS dev server proxies `/api/*` to that URL. If nothing is listening there, login and other API calls fail with **Internal Server Error** and the terminal shows `ECONNREFUSED` (for example on port `4600`). Fix: run your Charcha backend, or change `NEXT_PUBLIC_CHARCHA_API_URL` in `.env.local` to match the host and port where it actually runs.

## Flow

1. **`/cms/login/`** — sets CMS JWT and cookie.
2. **Middleware** — protects `/cms/*` (except login) using `charcha_cms_token`.
3. **Editorial UI** — inbox, rewrite, trends under `/cms/*`; shared page modules live in `src/app/_workspace/` (not public routes).
4. **Articles** — drafts and SEO editor use `cmsWebsiteCmsArticlesApi`.

## Env

See `.env.example`. Set `NEXT_PUBLIC_WEBSITE_URL` and `NEXT_PUBLIC_WEBSITE_ARTICLE_PATH` for “View on site” links in the article editor.
