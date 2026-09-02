# SkillBridge

SkillBridge is a career platform that connects student skills with real job opportunities through evidence-backed skill profiles, deterministic matching, recruiter workflows, and optional Gemini-assisted guidance.

The application is an existing production-oriented codebase. It is not a demo application and does not use frontend mock business data.

## Stack

- Frontend: React 19, TypeScript, Vite, TanStack Router, TanStack Query, Tailwind CSS
- Backend: PHP 8.2+, REST API, PDO
- Database: PostgreSQL 16+ or Neon PostgreSQL
- Authentication: JWT access tokens with rotating, HttpOnly refresh-token cookies
- AI: Backend-only Google Gemini integration, configured with `GEMINI_MODEL`
- Storage: Private resume storage outside the public document root

## Architecture

```text
React UI
  -> ApiClient
  -> PHP REST API
  -> JWT/RBAC and ownership checks
  -> PostgreSQL / private storage / optional Gemini
  -> JSON response
  -> UI state refresh
```

All user-specific data must be resolved from the authenticated JWT on the server. Frontend-supplied student or recruiter IDs are not authorization boundaries.

## Local Setup

### Prerequisites

- Node.js 20 or newer
- PHP 8.2 or newer with `pdo_pgsql`, `curl`, `mbstring`, `fileinfo`, and `openssl`
- PostgreSQL 16+ or a Neon database

### Install frontend dependencies

```bash
npm ci
```

### Configure the backend

```bash
copy backend/.env.example backend/.env
```

Set real local values in `backend/.env`:

```ini
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
APP_ENV=development
FRONTEND_URL=http://localhost:5173
GEMINI_MODEL=gemini-3.7-flash
GEMINI_API_KEY=
```

Never commit `.env` files or place secrets in frontend variables. The frontend may only use `VITE_API_URL`.

### Apply the database

For a new database, apply the base schema and every incremental migration in filename order:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrate_v2.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrate_v3.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrate_v4.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrate_v5.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrate_v6.sql
```

Or use the migration runner:

```bash
php backend/database/migrate.php
```

`--reset` is development-only and is blocked when `APP_ENV=production`. It drops data and must never be used against a real production database.

Development seed data is optional and must not be used as production data:

```bash
php backend/database/migrate.php --seed
```

### Start the application

Start the API:

```bash
php -S 127.0.0.1:8000 backend/index.php
```

Configure the frontend in `.env`:

```ini
VITE_API_URL=http://127.0.0.1:8000/api
```

Start Vite in a second terminal:

```bash
npm run dev
```

Useful endpoints:

- API health: `http://127.0.0.1:8000/api/health`
- API ping: `http://127.0.0.1:8000/api/ping`
- API documentation UI: `http://127.0.0.1:8000/api/docs`
- OpenAPI file: `http://127.0.0.1:8000/api/openapi.yaml`

## Product Workflows

### Student

1. Register and complete the profile.
2. Add skills, projects, certificates, and an optional private resume.
3. Complete a skill assessment.
4. Review evidence and confidence in Proof of Skill.
5. Browse database-backed jobs and inspect explainable matches.
6. Review target-job skill gaps and learning paths.
7. Optionally connect GitHub public repositories.
8. Generate a zero-PII Skill Passport.
9. Apply to a job and follow the application, interview, offer, and hired stages.

### Recruiter

1. Register and configure a company profile.
2. Create job openings with required skills.
3. Review applications for the recruiter-owned company.
4. Inspect deterministic match explanations and evidence signals.
5. Shortlist candidates, schedule interviews, and progress applications.
6. Make final offer and hiring decisions. AI output is advisory only.

## Proof of Skill

Skill confidence is calculated on the server using configurable weights:

- Self-declared: 10%
- Resume evidence: 20%
- Project evidence: 20%
- Assessment: 35%
- GitHub evidence: 15%

A listed skill is not automatically considered verified. Assessment, project, resume, and GitHub evidence are stored separately in PostgreSQL and combined deterministically.

## Matching and Skill Gaps

Job matching remains deterministic and explainable. Responses can include:

- Overall match
- Skill fit
- Experience fit
- Education fit when data exists
- Location fit when data exists
- Verified skill confidence
- Matched skills
- Missing skills
- Learning recommendations

AI can explain or enrich the result, but it does not replace the deterministic match calculation or make employment decisions.

## AI and GitHub Safety

- Gemini requests are made only by the PHP backend.
- `GEMINI_API_KEY`, database credentials, JWT secrets, and private storage keys are never frontend data.
- Gemini responses are parsed and bounded before use.
- Deterministic fallbacks are used where they can be derived from real input; unavailable states are shown where they cannot.
- GitHub analysis reads public repositories only and stores limited metadata.
- GitHub failures do not create synthetic repositories, skills, or activity.

## Authentication and Security

- Access JWTs are short-lived and stored by the frontend for API authorization.
- Refresh tokens are stored server-side by hash and transported in an HttpOnly cookie.
- Refresh tokens rotate on use and reuse is rejected.
- JWT algorithm, required claims, role, expiry, and signature are validated.
- Student, recruiter, company, application, interview, notification, resume, and passport access is ownership-checked server-side.
- Resume uploads use MIME detection, size limits, extension blocking, private storage, and protected streaming.
- Production CORS uses explicit configured origins.
- Production errors return generic messages while technical details are logged server-side.

## Branding

The supplied SkillBridge logo is available at:

- `public/skillbridge-logo.jpeg`
- `public/site.webmanifest`

The logo is used by the shared brand component, browser metadata, favicon, Apple touch icon, social previews, and web manifest.

## Validation

Frontend checks:

```bash
npx tsc --noEmit
npm run lint
npm run build
npm audit --audit-level=high
```

Backend syntax checks on Windows PowerShell:

```powershell
Get-ChildItem backend -Recurse -Filter *.php | ForEach-Object { php -l $_.FullName }
```

Backend integration and security suites require a configured PostgreSQL database and running API:

```bash
node backend/tests/test_runner.cjs
node backend/tests/audit_runner.cjs
```

CI runs frontend type, lint, audit, and build checks; PHP syntax checks; PostgreSQL schema and migration setup; the backend integration suite; and the authorization audit suite.

## Current Limitations

The project is not declared fully production-ready until these are verified or completed:

- Resume text extraction and automatic resume-to-skill evidence require a production PDF/DOCX parsing service.
- Full OpenAPI parity with every active endpoint still needs completion.
- Some recruiter metadata and settings fields require real persisted columns/endpoints rather than inferred or unavailable values.
- Complete project/certificate update operations and recruiter shortlist/note persistence need final API coverage.
- Live Neon, deployed frontend/API, browser responsive, and multi-user IDOR verification require deployment credentials and environments.

Do not describe the system as production-ready until those checks pass in the target deployment.

## Deployment

The documented deployment topology is:

- Frontend: Vercel or another static frontend host
- Backend: PHP 8.2 Docker service, such as Render
- Database: Neon PostgreSQL with TLS

Before deployment:

1. Set `APP_ENV=production`.
2. Configure a strong `JWT_SECRET`.
3. Configure `DATABASE_URL` with TLS enabled.
4. Set `FRONTEND_URL` and explicit `CORS_ALLOWED_ORIGINS`.
5. Set `GEMINI_MODEL=gemini-3.7-flash` and the backend-only Gemini key if AI is enabled.
6. Apply incremental migrations without reset mode.
7. Verify `/api/health` and the CORS preflight.
8. Run the integration, security, and multi-user checks against the deployed API.

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for provider-specific deployment steps.
