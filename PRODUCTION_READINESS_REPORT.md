# SkillBridge Production Readiness Report

Date: 2026-09-02
Final status: **NOT READY**

## Final Verification Run

This run was performed on 2026-09-02 against the checked-out repository and the
locally started PHP API. The API loaded `backend/.env` with `APP_ENV=development`.
`GET http://127.0.0.1:8000/api/health` returned HTTP 503 with database
`unhealthy`, `connected=false`, and storage `healthy`. No database credential
values were printed or added to this report.

### Requested Verification Matrix

| Item | Result | Exact test and evidence |
|------|--------|-------------------------|
| Cross-student resume download | NOT VERIFIED | Intended `GET /api/student/resume/download/{other_student_id}` with Student A token; live setup stopped at database-backed registration. `StudentController::streamResume` contains owner/admin/company checks. |
| Cross-student profile access | PASS (route design) / NOT VERIFIED (live) | There is no public student-id profile route; `GET /student/profile` derives the profile from the authenticated user. Live multi-user behavior was not executable. |
| Cross-company candidate access | NOT VERIFIED | Intended recruiter B `GET /applications/candidates` against company A data; live setup stopped at database-backed registration. `ApplicationController::getCandidates` filters recruiter results by `companies.user_id`. |
| Cross-company application stage modification | PASS (code) / NOT VERIFIED (live) | `ApplicationController::updateStage` checks `company_user_id` and returns 403 for another recruiter. PHP syntax passed; live mutation test was blocked by the database. |
| Student access to recruiter/admin endpoints | NOT VERIFIED (live) | Existing suite could not authenticate because registration returned 500; role middleware is present on candidate and admin routes. |
| Recruiter access to another recruiter's jobs/applications/interviews | PASS (code) / NOT VERIFIED (live) | Candidate listing, stage updates, interview scheduling/status, and recruiter interview listing apply company ownership predicates. No live two-recruiter dataset was available. |
| Unauthorized resources return 403/404 | NOT VERIFIED | Static route checks use 403 for authenticated ownership failures and 404 for missing resources; live status assertions require a working database. |
| Server-side ownership checks | PASS | Source inspection plus PHP syntax validation confirmed ownership checks in resume streaming, candidate listing, stage updates, interview scheduling/status, and the newly hardened application timeline. |
| Valid PDF resume | NOT VERIFIED | Whitelist source is `application/pdf`; upload request could not be authenticated against a working database. |
| Valid DOCX resume | NOT VERIFIED | Whitelist source is `application/vnd.openxmlformats-officedocument.wordprocessingml.document`; upload request could not be authenticated. |
| PNG/JPEG/WEBP logo | NOT VERIFIED | Whitelist source is `image/png`, `image/jpeg`, and `image/webp`; live upload matrix was blocked. |
| Corrupt, oversized, PHP/HTML/JS/EXE, double-extension, traversal, MIME mismatch, empty files | NOT VERIFIED | `FileUploadService` performs server-side `finfo` inspection, 5 MiB limits, blocked-extension checks, randomized storage names, and protected path resolution. Only the existing live PHP rejection check passed; the complete matrix was not executable. |
| Unauthorized and authorized download | NOT VERIFIED | `streamResume` has server-side authorization and private storage; live owner/non-owner download tests require database-backed users and resumes. |
| Authenticated browser E2E | NOT VERIFIED | Student, recruiter, and admin login workflows could not run because API registration/authentication returned database-dependent 500/401 responses. |
| Public desktop/mobile browser smoke | PASS | Shared browser page rendered at `http://127.0.0.1:8080/`; desktop had no captured console errors. Mobile 390x844 rendered with no horizontal overflow and no captured console errors. |
| Production Neon connectivity | NOT VERIFIED | Local API health returned database unhealthy. `APP_ENV=development`; no production environment was used. |
| CI/CD on pushed commit | NOT VERIFIED | Workflow is present at `.github/workflows/ci.yml`, but no GitHub Actions run was available in this environment. |
| Deployed HTTPS/CSP/HSTS | NOT VERIFIED | `nginx.conf` contains the intended headers, but no deployed HTTPS origin was tested. Local API headers are not deployment evidence. |

**Staging status: NOT VERIFIED. Production status: NOT READY.**

The application is not declared `STAGING VERIFIED` or `PRODUCTION READY` because
the database-backed authorization/upload/E2E tests, production Neon check,
deployed HTTPS/CSP check, and CI run did not complete.

## Verification Update

| Area            | Result        | Evidence                                                                                                                                                            |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PHP             | VERIFIED PASS | PHP 8.5.10 with `pdo_pgsql`, `fileinfo`, `openssl`, `json`, and `mbstring`; every backend PHP file passed `php -l`.                                                 |
| PostgreSQL      | VERIFIED PASS | PostgreSQL 18.6 local service responded; schema applied with `ON_ERROR_STOP=1`; 11 tables, 12 foreign keys, 37 indexes, and refresh-token revocation were verified. |
| API             | VERIFIED PASS | `node backend/tests/test_runner.cjs` completed 23/23 real HTTP scenarios.                                                                                           |
| Auth            | VERIFIED PASS | Registration, login, invalid login, missing token, tampered JWT, refresh, logout, and revoked refresh token checks passed.                                          |
| Authorization   | PARTIAL PASS  | Student/recruiter admin rejection passed; complete cross-user/cross-company IDOR matrix remains unverified.                                                         |
| Upload Security | PARTIAL PASS  | Executable PHP rejection passed; full format/download matrix remains unverified. Current health check reports all storage directories writable.                     |
| Geocoding       | PARTIAL PASS  | Company save passed through the API; cache/failure behavior was not independently instrumented.                                                                     |
| Frontend E2E    | PARTIAL PASS  | Landing page rendered and live stats loaded; authenticated desktop/mobile flows remain unverified.                                                                  |
| Security        | VERIFIED PASS | `tests/security-test.php` passed 7/7 checks.                                                                                                                        |
| CI              | NOT VERIFIED  | Workflow exists but has not executed in GitHub Actions.                                                                                                             |

## Staging Verification Attempt

| Area            | Result             | Evidence                                                                                                                           |
| --------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| PHP             | NOT VERIFIED       | `php -v` and `php -m` returned command-not-found; install PHP 8.x with `pdo_pgsql`, `fileinfo`, `openssl`, `json`, and `mbstring`. |
| PostgreSQL      | NOT VERIFIED       | `psql --version` returned command-not-found; Docker CLI exists but Docker Desktop Linux daemon is unavailable.                     |
| API             | NOT VERIFIED       | PHP backend could not be started without PHP and PostgreSQL.                                                                       |
| Auth            | NOT VERIFIED       | Requires running PHP API and real database.                                                                                        |
| Authorization   | NOT VERIFIED       | Requires multiple real users/companies and API execution.                                                                          |
| Upload Security | NOT VERIFIED       | Requires PHP runtime and executable upload test fixtures.                                                                          |
| Geocoding       | NOT VERIFIED       | Code review confirms timeout/configuration; live Nominatim request was not run.                                                    |
| Frontend E2E    | NOT VERIFIED       | Frontend build/type checks pass, but no backend-backed browser workflow was executed.                                              |
| Security        | PARTIALLY VERIFIED | Static scans and code review completed; live CORS, CSP, JWT, rate-limit, and log-redaction tests were not run.                     |
| CI              | NOT VERIFIED       | Workflow was created but no GitHub Actions run was available in this environment.                                                  |

Environment evidence: `node --version` returned `v26.7.0`; `docker --version` returned `29.7.2`; `php`, `psql`, and the Docker Linux engine were unavailable. No database credentials were printed or used.

### Windows staging commands

The earlier `find | xargs` command is Unix-only. In PowerShell, use:

```powershell
Get-ChildItem backend -Recurse -Filter *.php | ForEach-Object { php -l $_.FullName }
```

Set the database URL in the process environment without printing it, then apply the PostgreSQL schema:

```powershell
$env:DATABASE_URL = 'postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require'
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f backend/database/schema.sql
```

On this Windows host, install the missing runtimes with an elevated PowerShell terminal:

```powershell
winget install --id PHP.PHP.8.3 -e --source winget
winget install --id PostgreSQL.PostgreSQL.16 -e --source winget
```

After restarting the terminal, verify `php -v`, `php -m`, and `psql --version`. Enable `pdo_pgsql` in the PHP `php.ini` if it is not listed, then rerun the syntax and API checks. Do not put real credentials in this report or in Git.

The codebase has a strong staging foundation, but production readiness cannot be claimed until PHP, PostgreSQL, integration, upload-security, and authorization tests run in a configured environment.

## Architecture

- Frontend: React 19, TypeScript, Vite, TanStack Router, TanStack Query.
- Backend: PHP 8.x REST API with a single router in `backend/index.php`.
- Database: PostgreSQL 16+ or Neon using `DATABASE_URL` and `pdo_pgsql`.
- Authentication: JWT access tokens plus server-side refresh tokens.
- Geocoding: OpenStreetMap Nominatim, called only during company save/update.
- Storage: private resume storage and company logo storage managed by `FileUploadService`.

## Frontend Integration

- Frontend API calls are centralized in `src/lib/api-client.ts`.
- The client attaches bearer tokens, handles refresh, parses JSON errors, and enforces a request timeout.
- FormData uploads avoid manually setting a multipart Content-Type.
- API URLs are environment-based through `VITE_API_URL`; production should use `https://api.skillbridge.dev/api`.
- No direct production frontend calls to `http://localhost:8000/api` remain. The only frontend `fetch` is inside the centralized API client.
- Dashboard and recruiter analytics no longer show fabricated business metrics; live values or explicit unavailable states are used.

## Database Status

- PostgreSQL schema, foreign keys, check constraints, indexes, refresh-token storage, and cascade behavior are present.
- Deployment documentation and provisioning scripts now describe PostgreSQL/Neon rather than MySQL/MariaDB.
- `setup-server.sh` now writes `DATABASE_URL` as required by the hardened loader.
- Placeholder database and JWT values are rejected by the backend.

Status: **VERIFIED PASS for local PostgreSQL schema**. Neon production connectivity remains NOT VERIFIED - ENVIRONMENT REQUIRED.

## API Status

Implemented route groups include authentication, jobs, companies, student profiles, applications, interviews, notifications, admin operations, AI features, health, and OpenAPI documentation.

The API has structured JSON responses, request IDs, rate-limit headers, production error masking, and prepared SQL statements.

Status: **VERIFIED PASS for the executed local staging suite**. Production deployment remains NOT VERIFIED - ENVIRONMENT REQUIRED.

## Authentication and Authorization

Implemented:

- JWT secret is environment-only and rejects placeholders.
- Access tokens expire after two hours by default.
- Refresh tokens are stored as SHA-256 hashes and can be revoked.
- Logout revokes server-side refresh tokens.
- Protected routes use authentication and role middleware.
- Student, recruiter, and admin route checks exist.
- Resource queries generally derive ownership from authenticated user context.

Remaining verification:

- Run cross-student and cross-company authorization tests against real data.
- Verify every recruiter mutation rejects jobs/applications outside the recruiter company.
- Verify admin-only metrics, verification, logs, and audit routes.
- Verify expired and tampered tokens return 401 in a running API.

Status: **PARTIALLY VERIFIED**. Basic role rejection and token lifecycle passed; the full IDOR matrix remains NOT VERIFIED.

## File Security

Implemented or improved:

- Server-side MIME inspection with `finfo`.
- Randomized storage keys and filenames.
- PDF/DOCX resume allowlist.
- PNG/JPEG/WEBP logo allowlist.
- Resume maximum size reduced to 5MB.
- Executable extensions blocked.
- Protected storage path is constrained with `realpath`.
- Resume streaming occurs after authorization checks in `StudentController`.
- Download names use `basename` and safe headers.

Remaining verification:

- Add and execute automated valid/invalid upload tests.
- Test PHP, HTML, JavaScript, SVG, executable, oversized, and traversal payloads.
- Verify public logo storage cannot execute content through server configuration.
- Verify unauthorized resume downloads with guessed IDs.

Status: **PARTIALLY VERIFIED**. PHP rejection and security checks passed; the full upload matrix remains NOT VERIFIED.

## Geocoding

- Nominatim is called during company save/update, not on every keystroke.
- Address changes are detected before calling the service.
- Existing coordinates are reused when the address is unchanged.
- Requests have a five-second timeout and a configurable `NOMINATIM_USER_AGENT`.
- Geocoding failure is non-blocking and records a failed status.
- The frontend does not call Nominatim directly.

Status: **PARTIALLY VERIFIED**. API company save passed; independent Nominatim cache/failure instrumentation remains NOT VERIFIED.

## Security

Implemented:

- Strict JWT/database environment enforcement.
- Prepared statements in reviewed controllers.
- Rate limits of 15 requests/minute for authentication and 120 requests/minute globally.
- `Retry-After` and rate-limit headers on 429 responses.
- Forwarded client IP headers are no longer trusted by default.
- CORS does not use wildcard origins with credentials.
- `nosniff`, frame, referrer, permissions, and HTTPS HSTS headers are configured.
- Production error responses mask internal exception details.
- No exposed Neon credential or hardcoded application JWT secret was found in the final static scan.

Remaining risks:

- CSP is configured in `nginx.conf`; it must still be browser-tested against the deployed asset and API origins.
- Proxy-aware client IP handling needs an explicit trusted-proxy deployment policy.
- Existing logs may contain historical diagnostic details and must remain private.
- Dependency vulnerability scanning and secret scanning require CI execution.

## CI/CD

Added `.github/workflows/ci.yml` with:

- Node installation and npm cache.
- TypeScript validation.
- ESLint.
- Frontend production build.
- High-severity dependency audit.
- PHP 8.2 setup with PostgreSQL extensions.
- Disposable PostgreSQL schema and API integration execution.
- PHP syntax validation.
- Unsupported MySQL/MariaDB implementation scan.
- Credential-pattern scan.

The workflow has not run in this environment. It now provisions a disposable PostgreSQL service, applies the real schema, starts PHP, and runs the existing API integration suite. A future CI run must confirm the suite passes.

## Tests Actually Executed

- TypeScript compiler via `node_modules/.bin/tsc.cmd --noEmit`: passed.
- Vite production build via `node_modules/.bin/vite.cmd build`: passed.
- ESLint via `node node_modules/eslint/bin/eslint.js .`: passed.
- VS Code diagnostics for touched TypeScript/PHP files: no errors reported.
- Static scan for direct frontend API URLs, exposed credentials, unsupported drivers, and demo login values: completed.
- `git diff --check`: passed during the hardening pass.
- PHP syntax command: `for /r backend %f in (*.php) do @php -l "%f"` passed for every backend PHP file.
- PostgreSQL schema apply: `psql ... -v ON_ERROR_STOP=1 -f backend/database/schema.sql` passed.
- PostgreSQL catalog verification: 11 tables, 12 foreign keys, 37 indexes, and refresh-token revocation column verified.
- Real API integration: `node backend/tests/test_runner.cjs` passed 23/23 scenarios.
- PHP security suite: `php tests/security-test.php` passed 7/7 checks.
- Browser landing-page check: frontend rendered after fixing `ScrollReveal`; live public stats endpoint returned successfully.

## Tests Not Executable or Not Run

- Neon production connectivity: NOT VERIFIED - local PostgreSQL was used.
- Full upload matrix: NOT VERIFIED - only executable PHP rejection was executed.
- Full cross-user/cross-company IDOR matrix: NOT VERIFIED.
- `npm run lint` wrapper: not used because the terminal could not resolve the npm command; direct ESLint execution passed.
- Authenticated browser desktop/mobile workflow testing: NOT VERIFIED; public landing render was verified.
- CI workflow: NOT VERIFIED locally; intended for GitHub Actions.

## Exact Deployment Steps

1. Provision PostgreSQL 16+ or create a Neon project with TLS enabled.
2. Create a dedicated application role using `backend/database/production-setup.sql`; replace its password placeholder without committing the replacement.
3. Apply `backend/database/schema.sql` with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1`.
4. Load `backend/database/seed.sql` only in staging or another explicitly non-production environment.
5. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`, a generated `JWT_SECRET`, `APP_ENV=production`, `FRONTEND_URL`, `NOMINATIM_USER_AGENT`, and upload/rate-limit settings.
6. Install PHP 8.x with `pdo_pgsql`, Nginx, and PHP-FPM. Keep backend storage and logs private.
7. Set frontend `VITE_API_URL=https://api.skillbridge.dev/api`, run `npm ci`, `npm run lint`, and `npm run build`.
8. Configure HTTPS certificates and exact CORS origins. Do not enable wildcard credentialed CORS.
9. Verify `/api/ping` and `/api/health` before enabling traffic.
10. Run the API, authorization, upload, workflow, and security suites against staging PostgreSQL.
11. Configure encrypted off-host PostgreSQL backups and test restoration.
12. Keep the previous frontend artifact and backend release available for rollback.

## Remaining Blockers

- Neon production migration and connectivity verification.
- Complete cross-user/cross-company authorization test matrix.
- Automated valid/invalid upload and protected-download test matrix.
- Removal or explicit isolation of remaining non-business form defaults and staging fixtures.
- Browser validation of the CSP against the deployed frontend and API origins.
- CI execution on a pull request.

## Files Changed In This Hardening Pass

- `DEPLOYMENT_GUIDE.md`
- `PRODUCTION_READINESS_REPORT.md`
- `.github/workflows/ci.yml`
- `backend/.env`
- `backend/.env.example`
- `backend/config/cors.php`
- `backend/config/database.php`
- `backend/config/response.php`
- `backend/database/production-setup.sql`
- `backend/database/schema.sql`
- `backend/controllers/AdminController.php`
- `backend/tests/test_runner.cjs`
- `tests/security-test.php`
- `backend/index.php`
- `backend/openapi.yaml`
- `backend/middleware/RateLimitMiddleware.php`
- `backend/services/FileUploadService.php`
- `backend/services/GeocodingService.php`
- `backend/services/HealthService.php`
- `setup-server.sh`
- `src/components/candidate-detail-modal.tsx`
- `src/components/layout/site-header.tsx`
- `src/components/scroll-reveal.tsx`
- `src/hooks/use-api.ts`
- `src/lib/api-client.ts`
- `src/routes/admin.tsx`
- `src/routes/company.tsx`
- `src/routes/dashboard.tsx`
- `src/routes/login.tsx`
- `src/routes/notifications.tsx`
- `src/routes/onboarding.tsx`
- `src/routes/recruiter.tsx`
- `src/routes/settings.tsx`
