#!/usr/bin/env bash
# ========================================================================
# SkillBridge Automated Linux VPS Server Provisioning Script (PostgreSQL Stack)
# Target: Ubuntu 22.04 / 24.04 LTS / Debian 12
# ========================================================================

set -euo pipefail

echo "========================================================"
echo "   SkillBridge Production Server Bootstrap (PostgreSQL) "
echo "========================================================"

DOMAIN="${DOMAIN:-skillbridge.dev}"
API_DOMAIN="${API_DOMAIN:-api.skillbridge.dev}"
APP_DIR="/var/www/skillbridge"
DB_NAME="skillbridge"
DB_USER="skillbridge_app"
DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
JWT_SECRET=$(openssl rand -base64 36 | tr -dc 'a-zA-Z0-9' | head -c 48)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?sslmode=require"

# 1. System Updates & Prerequisites
echo "\n[1/6] Installing Nginx, PHP 8.1 FPM, PostgreSQL 16+ and Tools..."
apt-get update -y
apt-get install -y software-properties-common curl git ufw fail2ban certbot python3-certbot-nginx

# Add PHP and PostgreSQL Repositories
add-apt-repository -y ppa:ondrej/php
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt-get update -y

apt-get install -y nginx postgresql postgresql-contrib \
    php8.1 php8.1-fpm php8.1-pgsql php8.1-curl php8.1-mbstring \
    php8.1-xml php8.1-zip php8.1-gd php8.1-intl

# 2. Node.js LTS
echo "\n[2/6] Installing Node.js LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. Setup PostgreSQL Database
echo "\n[3/6] Configuring Production PostgreSQL Database & Least-Privilege User..."
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} WITH ENCODING 'UTF8';" || true
sudo -u postgres psql -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';" || true
sudo -u postgres psql -c "GRANT CONNECT ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT USAGE ON SCHEMA public TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${DB_USER};"

# 4. Setup Application Directory & Storage
echo "\n[4/6] Setting Up Application Directory..."
mkdir -p "${APP_DIR}/dist"
mkdir -p "${APP_DIR}/backend/storage/resumes"
mkdir -p "${APP_DIR}/backend/storage/logs"
mkdir -p "${APP_DIR}/backend/uploads/logos"
mkdir -p "/var/backups/skillbridge"

# Write Production Backend .env
cat <<EOF > "${APP_DIR}/backend/.env"
DATABASE_URL=${DATABASE_URL}
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
JWT_SECRET=${JWT_SECRET}
APP_ENV=production
API_PORT=80
EOF
chmod 600 "${APP_DIR}/backend/.env"

# 5. Configure Permissions & Firewall
echo "\n[5/6] Configuring System Permissions & Firewall..."
chown -R www-data:www-data "${APP_DIR}"
chmod -R 755 "${APP_DIR}"
chmod -R 775 "${APP_DIR}/backend/storage"
chmod -R 775 "${APP_DIR}/backend/uploads"

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 6. Configure Daily Database Backup Cron
echo "\n[6/6] Scheduling Automated PostgreSQL Backup Cron Job..."
cat <<EOF > /etc/cron.d/skillbridge-backup
0 2 * * * root DB_PASS='${DB_PASS}' /bin/bash ${APP_DIR}/backend/database/backup.sh >> /var/log/skillbridge-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/skillbridge-backup

echo "\n========================================================"
echo "   SERVER BOOTSTRAP COMPLETE! (PostgreSQL 16+)          "
echo "========================================================"
echo "Database: ${DB_NAME}"
echo "DB User:  ${DB_USER}"
echo "Next Step: Run ./deploy.sh to pull code and launch!"
echo "========================================================"
