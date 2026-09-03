# SkillBridge 3.0 — Backend Architecture & Service Audit

**Generated**: 2026-09-04  
**Scope**: 17 Controllers, 18 Domain Services, 2 Middleware Modules, and Central REST Router (`backend/index.php`)  
**Syntax & Runtime Status**: `php -l` on all PHP files -> **0 Syntax Errors** | Native Driver Enforcement -> **PostgreSQL 16 PDO Exclusively**  

---

## 1. Backend Layer Architecture

```
backend/
├── config/
│   ├── database.php             # PDO connection pooling, sslmode handling, env loader
│   ├── DatabaseSafetyGuard.php  # Fail-closed guard blocking test execution on non-testing/cloud DBs
│   ├── jwt.php                  # HS256 JWT signature generation, expiration, validation
│   ├── response.php             # Unified jsonResponse envelope and HTTP status helper
│   └── cors.php                 # Origin whitelisting, allowed headers, preflight OPTIONS
├── middleware/
│   ├── AuthMiddleware.php       # Bearer token extraction, user identity & role resolution
│   └── RateLimitMiddleware.php   # Token bucket in-memory/DB rate limiting per client IP/endpoint
├── controllers/                 # 17 REST controllers mapping HTTP requests to business workflows
├── services/                    # 18 Domain, Security, Matching, and AI Orchestration services
└── index.php                    # Central REST Router with strict METHOD + PATH matching
```

---

## 2. Controller-by-Controller Deep Audit

| Controller | Lines of Code | Primary Responsibilities | SQL & Transaction Handling | RBAC & IDOR Boundaries | Status |
| :--- | :---: | :--- | :--- | :--- | :---: |
| `AuthController.php` | 198 | User registration, password bcrypt hashing, login JWT issuance, refresh token rotation, logout revocation | Prepared statements; inserts into `users`, `students`/`companies`, `refresh_tokens` | Public endpoints rate-limited (15 req/min); `/auth/me` verifies bearer token | **PASS** |
| `StudentController.php` | 382 | Student profile CRUD, skills portfolio, projects, certificates, resume upload & PDF extraction | Prepared statements; joins `student_skills`, `skills`; atomic resume updates | Strict ownership check: `WHERE student_id = ?` matching authenticated token | **PASS** |
| `CompanyController.php` | 165 | Company profile management, address geocoding with Nominatim cache | Prepared statements; updates `companies` | Recruiter can only modify their own company profile | **PASS** |
| `JobController.php` | 240 | Job creation, editing, closing, public job search with deterministic match score | Prepared statements; multi-table joins on `jobs`, `job_skills`, `skills` | Only company recruiters can post/edit; public can view active jobs | **PASS** |
| `ApplicationController.php` | 315 | Job applications, applicant listing, stage history tracking, feedback notes | Transactional: writes `applications`, `application_stage_history`, `notifications` | Unique `(student_id, job_id)` constraint prevents duplicates; recruiter isolated to company applicants | **PASS** |
| `InterviewController.php` | 190 | Interview scheduling, date/time conflict checks, meeting links, status transitions | Prepared statements; updates `interviews`, dispatches notifications | Candidate sees only their interviews; recruiter sees only their company's interviews | **PASS** |
| `NotificationController.php`| 120 | Notification retrieval, unread counts, mark-as-read, delete | Prepared statements; updates `notifications` | `WHERE user_id = ?` ensures zero cross-user notification leakage | **PASS** |
| `AssessmentController.php` | 280 | Assessment question generation, attempt creation, answer evaluation, automated scoring | Prepared statements; atomic attempt updates | Student isolated: cannot read or answer other students' attempts | **PASS** |
| `PassportController.php` | 210 | Cryptographic Skill Passport generation, QR codes, public verification lookup | Prepared statements; inserts into `skill_passports`, `passport_verifications` | Public lookup exposes zero PII (only cryptographic proof & skill achievements) | **PASS** |
| `CareerEvolutionController.php`| 440 | Personal Career OS aggregator: goal setting, readiness, skill gaps, next best action, roadmaps, weekly plans | Transactional; multi-table relational reads and updates | Strict student ownership checks on roadmap steps and weekly tasks | **PASS** |
| `CareerCopilotController.php` | 185 | What-if simulation, gap analysis calculation, agent next-steps | Prepared statements; simulation computations without persistent state corruption | Student token required; outputs deterministic readiness delta | **PASS** |
| `CollegePlacementController.php` | 215 | Placement drives, cohort readiness aggregation, student eligibility listing | Prepared statements; aggregations on student readiness scores | Role `college` / `admin` required | **PASS** |
| `GitHubController.php` | 145 | GitHub profile connection, repo commit/language analysis | Prepared statements; writes `proof_of_work_repositories` | Authenticated student token required | **PASS** |
| `InterviewAIController.php` | 260 | AI mock interview generation, candidate answer evaluation, STAR scorecard | Prepared statements; writes `interview_sessions`, `interview_scorecards` | Student ownership enforced on session ID | **PASS** |
| `TalentSearchController.php` | 230 | Recruiter precision search across candidates, verified skills, and Proof-of-Work | Dynamic prepared statement building with parameterized placeholders | Role `recruiter` required; candidate contact info hidden until shortlist | **PASS** |
| `AdminController.php` | 175 | System statistics, company verification toggle, system health monitoring, audit logs | Prepared statements; aggregations across users, jobs, applications | Role `admin` required; 403 Forbidden for all other roles | **PASS** |
| `AIController.php` | 190 | Resume summary generation, match explanations, recruiter candidate insights | Server-side Gemini API client with fallback to deterministic heuristics | Authenticated tokens required; prompt injection sanitization enforced | **PASS** |

---

## 3. Core Domain & Security Services

1. **`CareerEvolutionService.php`**:
   - Computes weighted career readiness: Required Skills Coverage (50%) + Preferred Skills Coverage (20%) + Proficiency Benchmark (15%) + Portfolio Evidence (15%).
   - Resolves target role requirements from canonical catalog or live job postings.
   - Partitions skills into `strong` (>= 80% with proof), `needs_improvement` (claimed but unverified), and `missing` (unclaimed required skills).
2. **`CareerRecommendationService.php`**:
   - Implements multi-factor recommendation score: Gap Coverage (30%) + Prerequisite Readiness (25%) + Career Alignment (20%) + Difficulty Proximity (10%) + Resource Quality (10%) + Freshness (5%).
   - Partitions jobs into 4 reachable tiers: Ready Now (score >= 80%), Nearly Ready (60-79%), Skill Gap (40-59%), Future Target (< 40%).
3. **`PassportCryptoService.php`**:
   - Signs skill passports with SHA-256 HMAC utilizing server secret.
   - Encodes zero-PII public payload allowing instant third-party employer verification without account creation.
4. **`FileUploadService.php`**:
   - Validates upload MIME types against magic bytes (`%PDF-` for PDF, image headers for logos).
   - Sanitizes filenames against directory traversal (`../`, `..\\`) and rejects double extensions (`.php.pdf`).
   - Stores files with cryptographically generated UUIDs outside public web roots.
5. **`GeminiService.php`**:
   - Enforces XML delimiter encapsulation (`<user_resume>...</user_resume>`) preventing prompt injection attacks from untrusted candidate resumes or project descriptions.
   - Implements immediate deterministic JSON fallback when AI service is unavailable or rate-limited.
