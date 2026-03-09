# ContentFlow — VPS Deployment Guide

Deploy ContentFlow (frontend + backend) on a new VPS using Node.js, PM2, and Nginx.

---

## Prerequisites

- Ubuntu 22.04 LTS (or similar)
- Root or sudo access
- Domain pointed to your VPS IP (e.g. `app.yourdomain.com`)

---

## 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx
```

---

## 2. Clone & Build

```bash
# Create app directory
sudo mkdir -p /var/www/contentflow
sudo chown $USER:$USER /var/www/contentflow
cd /var/www/contentflow

# Clone both repos (or upload via git/scp)
# Option A: Git
git clone <your-frontend-repo-url> frontend
git clone <your-backend-repo-url> backend

# Option B: Or copy from your machine
# scp -r contentflow-frontend user@vps:/var/www/contentflow/frontend
# scp -r contentflow-backend user@vps:/var/www/contentflow/backend
```

### Backend

```bash
cd /var/www/contentflow/backend
npm install --production
# Create data.json if not exists (backend creates on first run)
touch data.json
```

### Frontend

```bash
cd /var/www/contentflow/frontend
npm install
npm run build
```

---

## 3. Environment Variables

### Backend (`/var/www/contentflow/backend/.env`)

```env
PORT=4500
JWT_SECRET=your-random-secret-min-32-chars-change-this
OPENAI_API_KEY=sk-...   # Optional, for AI rewrite
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (`/var/www/contentflow/frontend/.env.production`)

```env
# Backend URL — use localhost when Nginx proxies /api to backend
NEXT_PUBLIC_API_URL=http://127.0.0.1:4500/api
```

---

## 4. PM2 Process Manager

Copy the ecosystem config from the frontend repo:

```bash
cd /var/www/contentflow
mkdir -p logs
cp frontend/ecosystem.config.cjs .
cp frontend/nginx-contentflow.conf .
```

Edit `ecosystem.config.cjs` if your paths differ. Then:

```bash
cd /var/www/contentflow
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # Enable restart on reboot
```

---

## 5. Nginx Configuration

```bash
sudo cp /var/www/contentflow/nginx-contentflow.conf /etc/nginx/sites-available/contentflow
sudo nano /etc/nginx/sites-available/contentflow   # Change app.yourdomain.com to your domain
```

Or create `/etc/nginx/sites-available/contentflow` manually:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;   # Change to your domain

    location /api {
        proxy_pass http://127.0.0.1:4500;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/contentflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. SSL (HTTPS)

```bash
sudo certbot --nginx -d app.yourdomain.com
```

Follow prompts. Certbot will update Nginx for HTTPS.

---

## 7. Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## Quick Commands

| Action | Command |
|--------|---------|
| View logs | `pm2 logs` |
| Restart all | `pm2 restart all` |
| Restart API only | `pm2 restart contentflow-api` |
| Restart frontend only | `pm2 restart contentflow-web` |
| Status | `pm2 status` |

---

## Troubleshooting

- **502 Bad Gateway**: Ensure PM2 apps are running (`pm2 status`). Check backend on 4500, frontend on 3000.
- **API 404**: Verify Nginx `location /api` proxies to port 4500.
- **CORS errors**: Backend uses `cors({ origin: true })` — should accept all. If behind same domain, no CORS.
- **Data loss**: Backend stores in `data.json`. Back it up regularly.
