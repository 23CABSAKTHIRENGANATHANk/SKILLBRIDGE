# 🚀 SkillBridge Production Deployment Guide (Vercel + Render + Neon)

SkillBridge is built as a cloud-native platform consisting of:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS deployed on **Vercel**
- **Backend**: PHP 8.2 REST API Docker container deployed on **Render**
- **Database**: PostgreSQL 16+ on **Neon Cloud**
- **AI Engine**: Google Gemini 3.7 Flash (`gemini-3.7-flash`)

---

## 🏗️ Architecture Overview

```
                      ┌────────────────────────────┐
                      │    Client (Web/Mobile)     │
                      └──────────────┬─────────────┘
                                     │
                 HTTPS Requests      │   API Requests (JWT / CORS)
              ┌──────────────────────┴──────────────────────┐
              │                                             │
              ▼                                             ▼
┌───────────────────────────┐                 ┌───────────────────────────┐
│     VERCEL (Frontend)     │                 │   RENDER (Backend API)    │
│  - React 19 + Vite App    │                 │  - PHP 8.2 Docker Service │
│  - Output: .output/public │                 │  - Health: /api/health    │
│  - Base: skillbridge.dev  │                 │  - Base: api.render.com   │
└───────────────────────────┘                 └─────────────┬─────────────┘
                                                            │
                                            ┌───────────────┴───────────────┐
                                            │                               │
                                            ▼                               ▼
                             ┌────────────────────────────┐  ┌────────────────────────────┐
                             │     NEON (PostgreSQL)      │  │      GOOGLE GEMINI AI      │
                             │  - SSL Required + Pooler   │  │  - Model: gemini-3.7-flash │
                             │  - Relational persistence  │  │  - ATS & Career Copilot    │
                             └────────────────────────────┘  └────────────────────────────┘
```

---

## 1. Database Setup (Neon PostgreSQL)

1. Create a project at [Neon](https://neon.tech).
2. Copy your pooled connection string from the Neon dashboard:
   ```ini
   postgresql://neondb_owner:[PASSWORD]@[HOST]-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Run the schema migrations:
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/schema.sql
   ```
4. Verify refresh token revocation support is applied:
   ```sql
   ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE;
   ```

---

## 2. Backend Deployment (Render Web Service)

### Option A: Via Render Blueprint (`render.yaml`)

1. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Blueprint**.
2. Connect your GitHub repository.
3. Render will detect `render.yaml` and configure the `skillbridge-api` web service automatically.
4. Fill in the prompted secret environment variables:
   - `DATABASE_URL`: Your live Neon PostgreSQL connection string.
   - `GEMINI_API_KEY`: Your Google AI Studio API key.
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g. `https://skillbridge.vercel.app`).
   - `CORS_ALLOWED_ORIGINS`: `https://skillbridge.vercel.app,http://localhost:5173`

### Option B: Manual Web Service Setup

1. In Render, click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository.
3. Select **Docker** environment:
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Health Check Path**: `/api/health`
4. Set Environment Variables (**Environment** tab):
   ```ini
   APP_ENV=production
   DB_CONNECTION=pgsql
   DATABASE_URL=postgresql://neondb_owner:[PASSWORD]@[HOST].neon.tech/neondb?sslmode=require
   JWT_SECRET=[GENERATE_STRONG_64_CHAR_HEX_KEY]
   GEMINI_MODEL=gemini-3.7-flash
   GEMINI_API_KEY=[YOUR_GEMINI_API_KEY]
   FRONTEND_URL=https://<your-vercel-app>.vercel.app
   CORS_ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app
   UPLOAD_MAX_SIZE=5242880
   NOMINATIM_USER_AGENT=SkillBridge/1.0 admin@skillbridge.dev
   ```
5. Deploy the service and copy your assigned service URL (e.g., `https://skillbridge-api.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

1. In [Vercel Dashboard](https://vercel.com/new), import your GitHub repository.
2. Configure Project Settings:
   - **Framework Preset**: `Vite` (or `Other`)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.output/public`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://<your-render-service>.onrender.com/api`
4. Click **Deploy**. Vercel will build the frontend with `vercel.json` routing and security headers.

---

## 4. Post-Deployment Operational Verification

Execute these verification checks against your live production endpoints:

### 1. Backend Health Check

```bash
curl -fsS https://<your-render-service>.onrender.com/api/health
```

_Expected Response_:

```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy", "connected": true },
    "storage": {
      "status": "healthy",
      "resumes_writable": true,
      "logs_writable": true,
      "uploads_writable": true
    }
  }
}
```

### 2. CORS Preflight Handshake

```bash
curl -I -X OPTIONS https://<your-render-service>.onrender.com/api/jobs \
  -H "Origin: https://<your-vercel-app>.vercel.app" \
  -H "Access-Control-Request-Method: GET"
```

_Expected Response_: `Access-Control-Allow-Origin: https://<your-vercel-app>.vercel.app`.

### 3. End-to-End User Journey Check

1. Open `https://<your-vercel-app>.vercel.app`.
2. Register a new student account.
3. Explore jobs, apply to a position, and inspect your dashboard.
4. Register a recruiter account, review the candidate pipeline, and schedule an interview.
5. Trigger Gemini 3.7 Flash AI match analysis and skill gap roadmaps.

---

## 5. Security & Maintenance Best Practices

1. **Secret Isolation**: Never commit `.env` files or expose `GEMINI_API_KEY` / `DATABASE_URL` in frontend build artifacts.
2. **CORS Whitelisting**: Keep `CORS_ALLOWED_ORIGINS` locked to your production Vercel domain.
3. **Database Pooler**: Always use Neon's `-pooler` hostname with `sslmode=require` for serverless environments.
4. **Token Invalidation**: User logout revokes the server-side refresh token in Neon PostgreSQL.

---

## 6. Release Operations Runbook

### Environment isolation

Use separate credentials and databases for development, staging, CI, and production:

| Environment | `APP_ENV`     | Database variable      | Purpose                 |
| ----------- | ------------- | ---------------------- | ----------------------- |
| Development | `development` | `DATABASE_URL`         | Local development       |
| Staging     | `staging`     | `STAGING_DATABASE_URL` | Release validation      |
| CI          | `testing`     | `TEST_DATABASE_URL`    | Ephemeral test database |
| Production  | `production`  | `DATABASE_URL`         | Live data               |

Never point CI or staging at production. Keep credentials in the deployment provider secret store and never put them in Vite variables, source control, logs, or issue comments.

### Staging promotion

1. Build the frontend with the staging `VITE_API_URL`.
2. Deploy the backend with `APP_ENV=staging` and the staging database URL.
3. Run `php backend/database/migrate.php` and inspect the migration log.
4. Verify `/api/health` reports healthy application and database checks.
5. Run TypeScript, lint, production build, PHP syntax, Phase 1, integration, and authorization tests.
6. Run student and recruiter smoke journeys with non-production accounts.
7. Promote only the exact build that passed staging.

### Health, monitoring, and alerts

- Liveness: `/api/ping` must return HTTP 200.
- Readiness: `/api/health` must return HTTP 200 with `application=healthy` and `database=healthy`.
- Alert on database unavailability, sustained 5xx responses, authentication failure spikes, AI failure spikes, and elevated p95 latency.
- Initial thresholds: database unavailable for two checks, 5xx above 5% for five minutes, or p95 API latency above two seconds for ten minutes.
- Logs and metrics may contain request IDs and status data only. Never record tokens, credentials, resume paths, answer keys, or private candidate payloads.

### Backup and restore

Use Neon automated backups/branches or the repository backup script in a controlled PostgreSQL environment:

```bash
BACKUP_DIR=/var/backups/skillbridge \
DB_HOST=<staging-or-production-host> \
DB_NAME=<database> \
DB_USER=<user> \
DB_PASS=<secret-from-secret-store> \
bash backend/database/backup.sh
```

Restore-test backups in an isolated database before considering them verified. Never use a production database as the first restore target. Review the target carefully because the script uses `--clean --if-exists`.

### Rollback

- Frontend: promote the previous known-good Vercel deployment.
- Backend: redeploy the previous immutable Render image or release commit.
- Database: prefer a forward-compatible corrective migration. Do not run destructive rollback SQL against production without a tested restore point and compatibility review.
- After rollback, run health checks, authentication smoke tests, and critical student/recruiter journeys.
- Record the release identifier, migration state, failure, and recovery result.

### Incident ownership

The release owner coordinates rollback. Backend owns API/database incidents, frontend owns client deployment issues, and security owns credential exposure, authentication anomalies, and IDOR reports. Suspected secret exposure requires immediate revocation and rotation.
