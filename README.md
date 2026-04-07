# ContentFlow Frontend monorepo

## Charcha Network CMS (default for Charcha work)

If you are only building or testing **Charcha**, you do **not** need the ContentFlow app at the repository root or **contentflow-backend**.

1. Use only **`charcha-network-cms/`** — its own `package.json`, `npm install`, and `.env.local` from **`charcha-network-cms/.env.example`** (`NEXT_PUBLIC_CHARCHA_API_URL`).
2. Full steps: [**charcha-network-cms/README.md**](charcha-network-cms/README.md).

```bash
cd charcha-network-cms
cp .env.example .env.local
npm install
npm run dev
# If port 3000 is taken: npm run dev -- -p 3002
```

Run **ContentFlow** (below) only when you explicitly need CSR Studio or Charcha CMS in this repo.

---

## ContentFlow — CSR Studio + Charcha CMS (optional)

Next.js app at the **repository root** for **CSR Studio** (`/login/`) and **Charcha CMS** (`/cms/login/`), with JWT cookies `csr_token` / `cms_token`. Requires **contentflow-backend** and **`NEXT_PUBLIC_API_URL`** in the root `.env.local` (see root `.env.example`).

| Path | Product | API / env |
|------|---------|-----------|
| **Repository root** (`/`) | CSR Studio + Charcha CMS | **contentflow-backend** — `NEXT_PUBLIC_API_URL` (default `http://localhost:4500/api`) |
| **`charcha-network-cms/`** | Charcha Network CMS | **Charcha API** — `NEXT_PUBLIC_CHARCHA_API_URL` in that folder only |

### Prerequisites (ContentFlow only)

- **Node.js 18+**
- **contentflow-backend** on default **port 4500**

### Local setup (ContentFlow only)

1. **Backend** (sibling repo `contentflow-backend`):

   ```bash
   cd ../contentflow-backend
   npm install
   npm start   # or: node server.js  — listen on PORT (default 4500)
   ```

2. **Frontend** (repo root):

   ```bash
   cp .env.example .env.local
   npm install
   npm run dev
   ```

3. Open **http://localhost:3000/** — Studio **http://localhost:3000/login/**, CMS **http://localhost:3000/cms/login/**

`NEXT_PUBLIC_API_URL` in `.env.local` must match your API. The dev server rewrites `/api/*` to that host.

### Scripts (ContentFlow root)

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Next.js dev (port 3000)  |
| `npm run build`| Production build         |
| `npm run start`| Production server        |
| `npm run dev:3001` | Dev on port 3001   |

### Notes (ContentFlow)

- **`trailingSlash: true`** — prefer `/login/` and `/cms/login/` to avoid extra redirects.
- If you see **API / 500 errors**, start the backend and check its logs.
