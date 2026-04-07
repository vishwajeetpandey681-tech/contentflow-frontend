#!/usr/bin/env bash
# One-shot Charcha Express deploy on the VPS (Docker). Run as root after SSH.
# Clones/updates /opt/contentflow-frontend and starts the stack on port 3000.
# Optional: BIND_LOCALHOST=1 bash deploy/charcha-express-install.sh (Nginx on same host)
set -euo pipefail
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://backend.charchaexpress.com/api}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://charchaexpress.com}"
export NEXT_PUBLIC_WEBSITE_URL="${NEXT_PUBLIC_WEBSITE_URL:-https://charchaexpress.com}"
export NEXT_PUBLIC_WEBSITE_DOMAIN="${NEXT_PUBLIC_WEBSITE_DOMAIN:-charchaexpress.com}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/vps-install.sh"
