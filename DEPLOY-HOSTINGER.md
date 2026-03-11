# CSR Studio — Hostinger VPS Deployment

Deploy CSR Studio to Hostinger VPS with Traefik, PM2, and SSL.

**VPS:** 62.72.12.114 | **Domain:** app.adtech365.com | **OS:** Ubuntu 24.04

---

## 1. Fix Git & Push to GitHub

### Ensure .gitignore excludes node_modules, .next, .env

Both repos now have updated `.gitignore`. Verify before pushing.

### Remove node_modules from tracking (if already committed)

```bash
# Frontend
cd contentflow-frontend
git rm -r --cached node_modules 2>/dev/null || true
git rm -r --cached .next 2>/dev/null || true
git add .
git commit -m "Remove node_modules and .next from tracking"

# Backend
cd ../contentflow-backend
git rm -r --cached node_modules 2>/dev/null || true
git add .
git commit -m "Remove node_modules from tracking"
```

### Push clean code

```bash
# Frontend
cd contentflow-frontend
git remote add origin https://github.com/vishwajeetpandey681-tech/csr-studio-frontend.git
git branch -M main
git push -u origin main

# Backend
cd contentflow-backend
git remote add origin https://github.com/vishwajeetpandey681-tech/csr-studio-backend.git
git branch -M main
git push -u origin main
```

If remote already exists: `git push -u origin main` (or `master`).

---

## 2. SSH into VPS

```bash
ssh root@62.72.12.114
# or: ssh your-user@62.72.12.114
```

---

## 3. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

# Git (if not installed)
sudo apt install -y git
```

---

## 4. Create Backend Repo (if not exists)

On GitHub: **New repository** → name: `csr-studio-backend` → Create (no README).

Then push from your machine:
```powershell
cd c:\Users\7DT\contentflow-backend
git push -u origin main
```

---

## 5. Clone Repos

```bash
sudo mkdir -p /var/www/csr-studio
sudo chown $USER:$USER /var/www/csr-studio
cd /var/www/csr-studio

git clone https://github.com/vishwajeetpandey681-tech/csr-studio-backend.git backend
git clone https://github.com/vishwajeetpandey681-tech/csr-studio-frontend.git frontend

mkdir -p logs
```

---

## 6. Environment Variables

### Backend (`/var/www/csr-studio/backend/.env`)

```env
PORT=3001
JWT_SECRET=your-random-32-char-secret-change-this
OPENAI_API_KEY=sk-...   # Optional, for AI rewrite
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (`/var/www/csr-studio/frontend/.env.production`)

```env
NEXT_PUBLIC_API_URL=https://app.adtech365.com/api
```

---

## 7. Build & Install

```bash
cd /var/www/csr-studio/backend
npm install --production

cd /var/www/csr-studio/frontend
npm install
npm run build
```

---

## 8. PM2

Copy ecosystem config and start:

```bash
cd /var/www/csr-studio
cp frontend/ecosystem.config.cjs .
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # Enable restart on reboot
```

Verify:
```bash
pm2 status
# csr-studio-api  (port 3001)
# csr-studio-web  (port 3000)
```

---

## 9. Traefik Configuration

### Option A: Traefik already running

Copy dynamic config to Traefik's file provider directory:

```bash
sudo cp /var/www/csr-studio/frontend/traefik-csr-studio.yml /etc/traefik/dynamic/
# or wherever your Traefik file provider points
sudo systemctl reload traefik
```

### Option B: Fresh Traefik install

1. Install Traefik (Docker or binary)
2. Static config (`traefik.yml`) must include:
   - File provider pointing to dynamic config directory
   - certResolver for Let's Encrypt
   - Entry points: web (80), websecure (443)

3. Add `traefik-csr-studio.yml` to the dynamic config directory
4. Ensure `app.adtech365.com` DNS points to 62.72.12.114

---

## 10. DNS

Point `app.adtech365.com` A record to `62.72.12.114`.

---

## 11. Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## Update VPS after git push (changes not visible until you do this)

Pulling alone is not enough: the frontend must be **rebuilt** and PM2 **restarted**, or you will still see the old version.

**Option A — one command (recommended):**
```bash
cd /var/www/csr-studio
bash frontend/scripts/update-vps.sh
```

**Option B — step by step:**
```bash
cd /var/www/csr-studio/backend
git pull origin main
npm install --production

cd /var/www/csr-studio/frontend
git pull origin main
npm install
npm run build

cd /var/www/csr-studio
pm2 restart all
pm2 save
```

Then hard-refresh the browser (Ctrl+Shift+R or Cmd+Shift+R) to avoid cached assets.

---

## Quick Commands

| Action | Command |
|--------|---------|
| **Update from Git** | `cd /var/www/csr-studio && bash frontend/scripts/update-vps.sh` |
| View logs | `pm2 logs` |
| Restart all | `pm2 restart all` |
| Restart API | `pm2 restart csr-studio-api` |
| Restart frontend | `pm2 restart csr-studio-web` |
| Rebuild & restart | `cd frontend && npm run build && pm2 restart csr-studio-web` |

---

## Troubleshooting

- **502 Bad Gateway:** Check PM2 (`pm2 status`). Ensure backend on 3001, frontend on 3000.
- **API 404:** Verify Traefik routes `/api` to backend. Check `traefik-csr-studio.yml` and Traefik logs.
- **SSL errors:** Ensure certResolver is configured and port 80 is open for ACME challenge.
- **CORS:** Backend allows all origins. If issues persist, check Traefik `passHostHeader`.
