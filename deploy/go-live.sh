#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Charcha Express — Full VPS Go-Live Script
# Ubuntu 24.04 | Node 20 already installed
#
# What it does:
#   1. Installs Nginx, Certbot, PM2
#   2. Opens firewall ports (22, 80, 443)
#   3. Builds & starts frontend via PM2 on port 3000
#   4. (Optional) Clones & starts backend via PM2 on port 4500
#   5. Writes Nginx config for charchaexpress.com → :3000
#      and backend.charchaexpress.com → :4500
#   6. Issues Let's Encrypt SSL for both domains
#
# Usage (on the VPS as root):
#   cd /opt/contentflow-frontend
#   bash deploy/go-live.sh
#
# Backend repo (optional — skip if not ready):
#   BACKEND_REPO=https://github.com/YOUR/contentflow-backend.git bash deploy/go-live.sh
# ─────────────────────────────────────────────────────────
set -euo pipefail

# ── CONFIG ────────────────────────────────────────────────
FRONTEND_DOMAIN="charchaexpress.com"
BACKEND_DOMAIN="backend.charchaexpress.com"
FRONTEND_DIR="/opt/contentflow-frontend"
BACKEND_DIR="/opt/contentflow-backend"
FRONTEND_PORT=3000
BACKEND_PORT=4500
BACKEND_REPO="${BACKEND_REPO:-}"
EMAIL="${CERTBOT_EMAIL:-admin@charchaexpress.com}"
# ─────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[GO-LIVE]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

[[ $EUID -ne 0 ]] && err "Run as root (sudo -i or root SSH)"

# ── 1. SYSTEM PACKAGES ────────────────────────────────────
log "Installing Nginx, Certbot, PM2..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx ufw git

# PM2
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2 --quiet
fi

# ── 2. FIREWALL ───────────────────────────────────────────
log "Configuring UFW firewall..."
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp   comment 'SSH'    >/dev/null
ufw allow 80/tcp   comment 'HTTP'   >/dev/null
ufw allow 443/tcp  comment 'HTTPS'  >/dev/null
ufw --force enable >/dev/null
log "Firewall: SSH(22), HTTP(80), HTTPS(443) open."

# ── 3. FRONTEND BUILD ─────────────────────────────────────
log "Building frontend at $FRONTEND_DIR..."
cd "$FRONTEND_DIR"

# Write .env.production with correct domains
cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=https://${BACKEND_DOMAIN}/api
NEXT_PUBLIC_APP_URL=https://${FRONTEND_DOMAIN}
NEXT_PUBLIC_WEBSITE_URL=https://${FRONTEND_DOMAIN}
NEXT_PUBLIC_WEBSITE_DOMAIN=${FRONTEND_DOMAIN}
EOF
chmod 600 .env.production
log ".env.production written."

npm ci --prefer-offline --quiet 2>/dev/null || npm install --quiet
npm run build

# ── 4. PM2 — FRONTEND ─────────────────────────────────────
log "Starting frontend with PM2..."
pm2 delete contentflow-web 2>/dev/null || true
pm2 start "npm" --name "contentflow-web" \
  --cwd "$FRONTEND_DIR" \
  -- start -- -p $FRONTEND_PORT
pm2 save

# ── 5. BACKEND (optional) ─────────────────────────────────
BACKEND_UP=false
if [[ -n "$BACKEND_REPO" ]]; then
  log "Setting up backend from $BACKEND_REPO..."
  rm -rf "$BACKEND_DIR"
  git clone --depth 1 "$BACKEND_REPO" "$BACKEND_DIR"
  cd "$BACKEND_DIR"
  npm ci --production --quiet 2>/dev/null || npm install --production --quiet
  # Create backend .env if not present
  [[ -f .env ]] || cat > .env <<EOF
PORT=${BACKEND_PORT}
NODE_ENV=production
JWT_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")
EOF
  pm2 delete contentflow-api 2>/dev/null || true
  pm2 start server.js --name "contentflow-api" \
    --cwd "$BACKEND_DIR" \
    --env production
  pm2 save
  BACKEND_UP=true
elif [[ -d "$BACKEND_DIR" ]]; then
  log "Backend dir found at $BACKEND_DIR, starting via PM2..."
  cd "$BACKEND_DIR"
  pm2 delete contentflow-api 2>/dev/null || true
  pm2 start server.js --name "contentflow-api" \
    --cwd "$BACKEND_DIR" \
    --env production
  pm2 save
  BACKEND_UP=true
else
  warn "BACKEND_REPO not set — skipping backend. Set BACKEND_REPO= and rerun to add backend."
fi

# ── 6. NGINX ──────────────────────────────────────────────
log "Writing Nginx config..."

# Remove default site
rm -f /etc/nginx/sites-enabled/default

NGINX_CONF=/etc/nginx/sites-available/charchaexpress
cat > "$NGINX_CONF" <<NGINX
# charchaexpress.com → Next.js on :${FRONTEND_PORT}
server {
    listen 80;
    server_name ${FRONTEND_DOMAIN} www.${FRONTEND_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
NGINX

# Backend vhost
if [[ "$BACKEND_UP" == true ]]; then
cat >> "$NGINX_CONF" <<NGINX

# backend.charchaexpress.com → Express API on :${BACKEND_PORT}
server {
    listen 80;
    server_name ${BACKEND_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
NGINX
fi

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/charchaexpress
nginx -t && systemctl reload nginx
log "Nginx configured and reloaded."

# ── 7. SSL ─────────────────────────────────────────────────
log "Requesting Let's Encrypt SSL certificates..."
CERTBOT_DOMAINS="-d ${FRONTEND_DOMAIN} -d www.${FRONTEND_DOMAIN}"
[[ "$BACKEND_UP" == true ]] && CERTBOT_DOMAINS+=" -d ${BACKEND_DOMAIN}"

certbot --nginx $CERTBOT_DOMAINS \
  --non-interactive --agree-tos -m "$EMAIL" \
  --redirect || warn "Certbot failed — DNS may not be pointed yet. Run: certbot --nginx $CERTBOT_DOMAINS after DNS propagates."

# ── 8. PM2 STARTUP ────────────────────────────────────────
log "Enabling PM2 startup on reboot..."
pm2 startup | tail -1 | bash >/dev/null 2>&1 || true
pm2 save

# ── DONE ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  CHARCHA EXPRESS IS LIVE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "  Frontend : https://${FRONTEND_DOMAIN}"
echo -e "  CMS      : https://${FRONTEND_DOMAIN}/cms/"
[[ "$BACKEND_UP" == true ]] && echo -e "  Backend  : https://${BACKEND_DOMAIN}/api"
echo ""
echo -e "  PM2 status: ${YELLOW}pm2 status${NC}"
echo -e "  Logs      : ${YELLOW}pm2 logs${NC}"
echo -e "  Nginx logs: ${YELLOW}tail -f /var/log/nginx/error.log${NC}"
echo ""
echo -e "  To update later: ${YELLOW}cd /opt/contentflow-frontend && git pull && bash deploy/go-live.sh${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
