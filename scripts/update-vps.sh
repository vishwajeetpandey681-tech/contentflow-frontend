#!/usr/bin/env bash
# Run on the VPS to pull latest code and restart services.
# Usage: cd /opt/contentflow-frontend && bash scripts/update-vps.sh
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[UPDATE]${NC} $*"; }

# ── Frontend ──
FRONTEND_DIR="/opt/contentflow-frontend"
cd "$FRONTEND_DIR"
log "Pulling latest frontend..."
git pull origin main
npm ci --prefer-offline --quiet 2>/dev/null || npm install --quiet
npm run build
pm2 restart contentflow-web --update-env
log "Frontend restarted."

# ── Backend (if present) ──
BACKEND_DIR="/opt/contentflow-backend"
if [[ -d "$BACKEND_DIR/.git" ]]; then
  log "Pulling latest backend..."
  cd "$BACKEND_DIR"
  git pull origin main
  npm ci --production --quiet 2>/dev/null || npm install --production --quiet
  pm2 restart contentflow-api --update-env
  log "Backend restarted."
fi

pm2 save
echo ""
echo -e "${GREEN}Done — changes are live.${NC}"
echo -e "  Logs: ${YELLOW}pm2 logs${NC}"
