#!/usr/bin/env bash
# ========================================================================
# SkillBridge Automated Production PostgreSQL Backup Script
# Uses pg_dump with gzip compression and automated 30-day retention
# ========================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/skillbridge}"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/skillbridge_pg_${DATE}.sql.gz"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-skillbridge}"
DB_USER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASS:-}"

echo "[SkillBridge Backup] Starting PostgreSQL automated backup at $(date)..."

# Perform pg_dump with custom plain-text SQL compressed with gzip
if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip > "${BACKUP_FILE}"; then
    chmod 600 "${BACKUP_FILE}"
    echo "[SkillBridge Backup] Backup saved successfully: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
    echo "[SkillBridge Backup] ERROR: pg_dump failed!" >&2
    exit 1
fi

# Prune old backups older than retention window
echo "[SkillBridge Backup] Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "skillbridge_pg_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[SkillBridge Backup] Backup process completed successfully."

# ========================================================================
# RESTORE INSTRUCTIONS:
# To restore a backup:
#   gunzip -c /var/backups/skillbridge/skillbridge_pg_YYYYMMDD_HHMMSS.sql.gz | psql -h 127.0.0.1 -p 5432 -U postgres -d skillbridge
# ========================================================================
