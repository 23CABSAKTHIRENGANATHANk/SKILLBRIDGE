# SkillBridge — Complete Production Deployment Runbook

This guide covers the deployment of the SkillBridge frontend, PHP 8 REST API, and MySQL database to production servers.

---

## 1. Domain & DNS Configuration

Configure DNS A records with your registrar or Cloudflare:

| Type | Name / Host | Target IP | Proxy Status |
|---|---|---|---|
| **A** | `skillbridge.dev` | `<YOUR_VPS_IP>` | Proxied (Cloudflare) / DNS Only |
| **A** | `www` | `<YOUR_VPS_IP>` | Proxied (Cloudflare) / DNS Only |
| **A** | `api` | `<YOUR_VPS_IP>` | DNS Only (or Proxied) |

---

## 2. Server Setup (Single-Command Bootstrap)

On a fresh **Ubuntu 22.04 / 24.04 LTS VPS**:

```bash
# 1. Clone repository to /var/www/skillbridge
sudo git clone https://github.com/<your-username>/skill-bridge-connect.git /var/www/skillbridge

# 2. Run automated server provisioner
cd /var/www/skillbridge
sudo bash setup-server.sh
```

The script automatically:
- Installs Nginx, PHP 8.1 FPM, MariaDB, Node.js, and Certbot.
- Creates least-privilege MySQL user `skillbridge_app`.
- Generates a random cryptographic `JWT_SECRET`.
- Configures firewall (UFW) and daily automated database backups.

---

## 3. SSL / HTTPS Certificate Installation

Run Certbot to obtain free Let's Encrypt certificates:

```bash
sudo certbot --nginx -d skillbridge.dev -d www.skillbridge.dev -d api.skillbridge.dev
```

---

## 4. Production Database Initialization

Import the database schema:

```bash
mysql -u root -p skillbridge < /var/www/skillbridge/backend/database/schema.sql
```

*(Optional)* Import seed data for staging/demo environments:
```bash
mysql -u root -p skillbridge < /var/www/skillbridge/backend/database/seed.sql
```

---

## 5. Environment Variables Configuration

Ensure `/var/www/skillbridge/backend/.env` has production credentials:

```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=skillbridge
DB_USER=skillbridge_app
DB_PASS=YourStrongProductionPassword
JWT_SECRET=YourGenerated48CharacterHexSecret
APP_ENV=production
API_PORT=80
```

---

## 6. Continuous Zero-Downtime Deployments

To deploy new code and updates:

```bash
cd /var/www/skillbridge
sudo bash deploy.sh
```

---

## 7. Production Observability & Monitoring

### A. Live Health Diagnostics
```bash
curl https://api.skillbridge.dev/api/health
```

Expected output:
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy", "latency_ms": 2.1, "connected": true },
    "storage": { "status": "healthy", "resumes_writable": true, "logs_writable": true },
    "system": { "php_version": "8.1.25", "memory_used_mb": 2.4 }
  }
}
```

### B. Live Application Logs
```bash
tail -f /var/www/skillbridge/backend/storage/logs/app-$(date +%F).log
```

### C. Automated Database Backups
Backups are compressed and saved to `/var/backups/skillbridge/` daily at 02:00 AM.
To run manual backup:
```bash
sudo bash /var/www/skillbridge/backend/database/backup.sh
```
