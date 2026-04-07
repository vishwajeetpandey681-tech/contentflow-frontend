#!/usr/bin/env bash
# Run ON the VPS as root (after SSH login). Docker + Compose required.
#
# 1) Set your backend API URL (must include /api, e.g. https://backend.example.com/api).
#    Optional (same public host for user site + /cms):
#    export NEXT_PUBLIC_APP_URL="https://charchaexpress.com"
#    export NEXT_PUBLIC_WEBSITE_URL="https://charchaexpress.com"
#    export NEXT_PUBLIC_WEBSITE_DOMAIN="charchaexpress.com"
#
# Charcha Express one-liner:
#   NEXT_PUBLIC_API_URL=https://backend.charchaexpress.com/api \
#   NEXT_PUBLIC_APP_URL=https://charchaexpress.com \
#   NEXT_PUBLIC_WEBSITE_URL=https://charchaexpress.com \
#   NEXT_PUBLIC_WEBSITE_DOMAIN=charchaexpress.com \
#   bash /root/vps-install.sh
#
# 2) Copy this script to the server, or clone the repo and run from repo:
#    curl -fsSL ...   # or: git clone then bash deploy/vps-install.sh
#
# 3) From repo root on the server:
#    bash deploy/vps-install.sh
#
# Or one line after cloning:
#    NEXT_PUBLIC_API_URL=https://api.example.com/api bash deploy/vps-install.sh
#
# With Nginx on the same host, bind the app to localhost only:
#    BIND_LOCALHOST=1 bash deploy/vps-install.sh

set -euo pipefail

GIT_REPO="${GIT_REPO:-https://github.com/vishwajeetpandey681-tech/contentflow-frontend.git}"
APP_DIR="${APP_DIR:-/opt/contentflow-frontend}"
BRANCH="${BRANCH:-main}"

if [[ -n "${1:-}" && "${1}" != -* ]]; then
  export NEXT_PUBLIC_API_URL="$1"
fi

if [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo "ERROR: Set NEXT_PUBLIC_API_URL (your live backend, e.g. https://api.example.com/api)" >&2
  echo "Example: NEXT_PUBLIC_API_URL=https://api.example.com/api $0" >&2
  exit 1
fi

COMPOSE=(docker compose)
if ! docker compose version &>/dev/null; then
  COMPOSE=(docker-compose)
fi

if ! command -v docker &>/dev/null; then
  echo "ERROR: docker not found. Install Docker first." >&2
  exit 1
fi

mkdir -p "$(dirname "$APP_DIR")"

if [[ -d "$APP_DIR/.git" ]]; then
  echo "Updating $APP_DIR ..."
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull origin "$BRANCH"
else
  echo "Cloning into $APP_DIR ..."
  rm -rf "$APP_DIR"
  git clone --branch "$BRANCH" --depth 1 "$GIT_REPO" "$APP_DIR"
fi

cd "$APP_DIR"

ENV_FILE="$APP_DIR/.env.production"
{
  echo "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
  echo "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-}"
  echo "NEXT_PUBLIC_WEBSITE_URL=${NEXT_PUBLIC_WEBSITE_URL:-}"
  echo "NEXT_PUBLIC_WEBSITE_DOMAIN=${NEXT_PUBLIC_WEBSITE_DOMAIN:-}"
} >"$ENV_FILE"
chmod 600 "$ENV_FILE"

COMPOSE_FS=(-f docker-compose.yml)
if [[ "${BIND_LOCALHOST:-}" == "1" ]]; then
  COMPOSE_FS+=(-f deploy/docker-compose.bind-localhost.yml)
  echo "Building and starting stack (127.0.0.1:3000 only — use Nginx for TLS) ..."
else
  echo "Building and starting stack (port 3000) ..."
fi

"${COMPOSE[@]}" "${COMPOSE_FS[@]}" --env-file "$ENV_FILE" up -d --build

echo ""
echo "Done. App: http://$(hostname -I 2>/dev/null | awk '{print $1}'):3000 (or your domain behind Nginx)."
echo "Logs: cd $APP_DIR && ${COMPOSE[*]} ${COMPOSE_FS[*]} --env-file .env.production logs -f web"
echo "Nginx TLS: see deploy/nginx-site.example.conf"
if [[ "${BIND_LOCALHOST:-}" != "1" ]]; then
  echo "To bind localhost only (then rebuild): BIND_LOCALHOST=1 bash deploy/vps-install.sh"
fi
