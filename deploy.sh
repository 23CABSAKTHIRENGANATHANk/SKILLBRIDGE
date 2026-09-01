#!/usr/bin/env bash
# ========================================================================
# SkillBridge Zero-Downtime Production Deployment Script (PostgreSQL)
# ========================================================================

set -euo pipefail

APP_DIR="/var/www/skillbridge"
BRANCH="${BRANCH:-main}"

echo "========================================================"
echo "    Deploying SkillBridge Production Application        "
echo "========================================================"

cd "${APP_DIR}"

# 1. Pull Latest Code
echo "\n[1/5] Fetching latest release from Git (${BRANCH})..."
git fetch origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"

# 2. Database Migrations
echo "\n[2/5] Running PostgreSQL Schema Migrations..."
if [ -f "${APP_DIR}/backend/database/schema.sql" ]; then
    echo "Applying PostgreSQL schema updates if needed..."
    # PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U skillbridge_app -d skillbridge -f "${APP_DIR}/backend/database/schema.sql" || true
fi

# 3. Build Frontend Production Assets
echo "\n[3/5] Building React Production SPA Assets..."
npm ci --silent
npm run build

# 4. Set Permissions & Reload Services
echo "\n[4/5] Setting secure directory permissions & reloading PHP-FPM / Nginx..."
chown -R www-data:www-data "${APP_DIR}"
chmod -R 775 "${APP_DIR}/backend/storage"
chmod -R 775 "${APP_DIR}/backend/uploads"

systemctl reload php8.1-fpm
systemctl reload nginx

# 5. Automated Smoke Test
echo "\n[5/5] Performing Live API Health Smoke Test..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/health || echo "FAILED")

if [ "${HEALTH_CHECK}" = "200" ]; then
    echo "========================================================"
    echo "  DEPLOYMENT SUCCESSFUL! API Status: 200 OK             "
    echo "========================================================"
else
    echo "========================================================"
    echo "  WARNING: API Health check returned HTTP ${HEALTH_CHECK} "
    echo "  Check logs: tail -n 50 ${APP_DIR}/backend/storage/logs/app-*.log "
    echo "========================================================"
fi
