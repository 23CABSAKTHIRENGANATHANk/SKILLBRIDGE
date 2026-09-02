# SkillBridge Production Deployment Guide

SkillBridge consists of a React/Vite frontend, a PHP 8.x REST API, and PostgreSQL 16+ (including Neon). MySQL, MariaDB, and PDO MySQL are not supported.

## 1. Database

Create a PostgreSQL 16+ database, either in Neon or on a managed/private server. Require TLS for remote connections. Apply the schema from the repository:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/schema.sql
```

For a staging environment only, load the deterministic seed data:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/seed.sql
```

Use a dedicated least-privilege PostgreSQL role. [backend/database/production-setup.sql](backend/database/production-setup.sql) contains the role and grant statements; replace its password placeholder before execution and never commit the replacement.

For Neon, copy the pooled or direct connection string from the Neon dashboard and preserve `sslmode=require`. Do not place credentials in documentation, source code, or frontend variables.

## 2. Backend environment

Copy `backend/.env.example` to `backend/.env` and set real values outside version control:

```ini
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
DB_CONNECTION=pgsql
JWT_SECRET=<at-least-32-random-characters>
APP_ENV=production
API_PORT=8000
FRONTEND_URL=https://skillbridge.dev
NOMINATIM_USER_AGENT=SkillBridge/1.0 contact@example.com
UPLOAD_MAX_SIZE=5242880
```

`DATABASE_URL` and `JWT_SECRET` are mandatory. The API rejects placeholders. Keep the file mode restricted, for example `chmod 600 backend/.env`.

## 3. Backend deployment

Install PHP 8.x with `pdo_pgsql`, `curl`, `mbstring`, `xml`, `zip`, `gd`, and `intl`, plus Nginx and PHP-FPM. Serve `backend/index.php` through Nginx/FPM and keep `backend/storage` outside the public web root. The existing `setup-server.sh` provisions PostgreSQL, PHP-FPM, Nginx, Node.js, TLS tooling, storage permissions, and backups for a Linux VPS.

After deployment, verify:

```bash
curl -fsS https://api.skillbridge.dev/api/ping
curl -fsS https://api.skillbridge.dev/api/health
```

The health endpoint must report a healthy database and writable required storage before traffic is enabled.

## 4. Frontend deployment

Set the API URL at build time:

```ini
VITE_API_URL=https://api.skillbridge.dev/api
```

Build and publish the generated Vite assets:

```bash
npm ci
npm run lint
npm run build
```

Configure the web server to serve the SPA entry point for client-side routes. Do not expose backend `.env`, storage, logs, or uploaded files through the frontend host.

## 5. CORS and HTTPS

Set the backend frontend origin to the exact production origin. CORS must allow only configured frontend origins and the `Authorization` and `Content-Type` headers. Use HTTPS for both hosts and enable HSTS only after HTTPS is working. Never use wildcard origins with credentials.

## 6. Backups and recovery

Use `backend/database/backup.sh` with a protected `DATABASE_URL` or PostgreSQL environment variables. Store encrypted backups outside the application server, retain multiple recovery points, and periodically test restoration into an isolated database. Do not print connection strings in backup or CI logs.

## 7. Rollback

Keep the last known-good frontend artifact and application release. To roll back, deploy that artifact, restore the previous application version, and run only backwards-compatible database changes. Do not rerun the destructive development `schema.sql` against production. Restore a database backup only after confirming the target recovery point and recording the incident.

## 8. Operational checks

- Rotate database and JWT secrets if they were ever exposed.
- Review application and audit logs without exposing them publicly.
- Confirm uploads are stored privately and downloads require authorization.
- Run the repository test suite against a real PostgreSQL environment before production release.
- Keep the production seed process disabled unless explicitly required for a non-production environment.
