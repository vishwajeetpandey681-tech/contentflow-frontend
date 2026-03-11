#!/bin/bash
# Run this on the VPS after git push to apply updates.
# Usage: from /var/www/csr-studio run: bash frontend/scripts/update-vps.sh
# Or: cd /var/www/csr-studio && bash frontend/scripts/update-vps.sh

set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "=== Backend ==="
cd backend
git pull origin main
npm install --production
cd ..

echo "=== Frontend ==="
cd frontend
git pull origin main
npm install
npm run build
cd ..

echo "=== Restart PM2 ==="
pm2 restart all
pm2 save

echo "Done. Changes are live."
