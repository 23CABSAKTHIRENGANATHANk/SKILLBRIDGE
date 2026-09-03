# SkillBridge 3.0 — Comprehensive Project Inventory

**Generated**: 2026-09-04  
**Project**: SkillBridge 3.0 — AI-Powered Proof-of-Skill Career Infrastructure & Personal Career Operating System  
**Audit Type**: Full-Stack Production Readiness Discovery & Architectural Audit  
**Author**: Senior Software Architect + Full-Stack Engineer + QA Lead + Security Engineer  

---

## 1. Executive Codebase Summary

| Tier / Subsystem | Primary Technologies | Core Locations | File Count | Metric Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend UI/UX** | React 19, TypeScript, Vite, TanStack Router/Query, Tailwind CSS, Lucide | `src/` | 139 files | 29 route files, domain components and shared UI |
| **Backend API** | PHP 8.2+ / 8.5+, REST API, PDO, Central Router, Strict Types | `backend/` | 107 files | 17 Controllers, 23 Services, middleware and test/support code |
| **Database Tier** | PostgreSQL 16 (Relational, JSONB, Constraints, Indexes) | `backend/database/` | 22 files | Canonical schema, migrations, seed and bootstrap tooling |
| **Data Pipelines & Scripts**| PHP CLI, Ingestion Pipelines, Governance, Seeding | `scripts/` | 12 files | Catalog expansion, registry seeding |
| **Test Suites** | PHP CLI, Node.js (`test_runner.cjs`, `audit_runner.cjs`), PowerShell | `tests/`, `backend/tests/` | 31 files | Isolated DB tests, E2E, IDOR matrix, unit/domain checks |
| **DevOps & Infra** | Docker, Docker Compose, GitHub Actions, Nitro/Vite SSR | `.github/`, root | 8 files | PostgreSQL 16 container, 2 CI workflow jobs |

---

## 2. Directory Structure & Subsystem Breakdown

```
skill-bridge-connect-main/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Dual-job CI (frontend: tsc/eslint/build, backend: PHP/PostgreSQL)
├── AUDIT/                         # Complete End-to-End Audit Reports
├── backend/
│   ├── config/                    # database.php, DatabaseSafetyGuard.php, jwt.php, response.php, cors.php
│   ├── controllers/               # 17 REST controllers implementing all business logic
│   ├── database/                  # schema.sql, migrate_v2.sql -> migrate_v16.sql, migrate.php, seed.sql
│   ├── middleware/                # AuthMiddleware.php, RateLimitMiddleware.php
│   ├── services/                  # 18 Domain, Security, AI, Matchmaking, and Analytics services
│   ├── tests/                     # test_runner.cjs, audit_runner.cjs, e2e_api_test.ps1
│   ├── .env                       # Default development configuration
│   ├── .env.testing               # Isolated test configuration (skillbridge_test on 55432)
│   ├── index.php                  # Central REST router (105+ endpoints)
│   ├── openapi.yaml               # OpenAPI 3.1 schema specification
│   └── swagger-ui.html            # Embedded Swagger UI interactive documentation
├── docs/                          # Architecture, security, and verification documentation
├── scripts/                       # Ingestion pipelines, taxonomy tools, catalog expansion
├── src/
│   ├── components/                # 89 React components (domain, layout, UI primitives)
│   ├── hooks/                     # Custom React hooks (auth, media queries, debounce)
│   ├── lib/                       # api-client.ts, utils.ts
│   ├── routes/                    # 28 TanStack router page modules
│   └── styles/                    # Global styling & Tailwind CSS configuration
├── tests/                         # Comprehensive PHP & HTTP integration test suites
├── docker-compose.test.yml        # Isolated PostgreSQL 16 test container service
├── package.json                   # Frontend dependencies and npm scripts
├── tsconfig.json                  # Strict TypeScript configuration
└── vite.config.ts                 # Vite + TanStack Start + Nitro SSR configuration
```

---

## 3. Detailed Component & Module Inventory

### 3.1 Frontend Routes (`src/routes/`)
1. `__root.tsx`: Universal root layout, React Query provider, theme provider, global notification toasts, site header, bottom mobile navigation.
2. `index.tsx`: Public landing page, interactive hero, platform tour, statistics counters, value propositions, proof-of-skill highlights.
3. `login.tsx`: Unified authentication entrance (student, recruiter, admin) with role selection and form validation.
4. `register.tsx`: Candidate registration with profile metadata, university/college affiliation, and initial target skills.
5. `dashboard.tsx`: Student command center displaying dynamic career readiness score, next best action card, active applications, notifications, and skill progress.
6. `onboarding.tsx`: Student initial onboarding flow (career goal selection, experience level, domain preference).
7. `settings.tsx`: Student and recruiter account settings, password updates, notification preferences, profile editing.
8. `notifications.tsx`: Full notifications center, read/unread management, categorized event history.
9. `student.skills.tsx`: Student skill portfolio, evidence tiers, skill addition, self-assessment triggers.
10. `student.skill-verification.tsx`: Interactive verification center, timed coding/multiple-choice assessments, integrity anti-tampering guards.
11. `student.projects.tsx`: Student projects showcase, GitHub repository link verification, tech stack tags.
12. `student.career.tsx`: Career progression overview, domain alignment, salary benchmarks.
13. `student.career-coach.tsx`: AI Career Coach conversation interface, grounding with candidate database state, action recommendation.
14. `student.skill-graph.tsx`: Interactive SVG topological skill dependency graph, prerequisite node locking/unlocking, DAG visualization.
15. `student.evolution.tsx`: Knowledge evolution ledger, chronological achievements timeline, proof streak tracker.
16. `career-goal.tsx`: Comprehensive career goal planner (target role, secondary role, domain, industry, timeline).
17. `career-roadmap.tsx`: Chronological multi-phase personalized roadmap with step completion toggle.
18. `career-plan.tsx`: 7-day Monday–Sunday structured weekly study/practice planner with task completion toggling.
19. `career-opportunities.tsx`: 4-tier reachable jobs explorer (Ready Now, Nearly Ready, Skill Gap, Future Target).
20. `career-simulator.tsx`: Interactive "What-If" skill growth simulator calculating market readiness delta.
21. `career-agent.tsx`: Autonomous career assistant orchestrating next steps and recommendations.
22. `jobs.tsx`: Public/candidate job search, search filters (type, location, remote, experience), deterministic skill match percentage indicator.
23. `company.tsx`: Company profile view, verified badge, open job listings, geocoded office location.
24. `passport.$token.tsx`: Publicly verifiable, zero-PII cryptographic Skill Passport lookup with QR code support.
25. `learning.tsx`: Curated, verified HTTPS learning resources catalog filtered by skill, format, and difficulty.
26. `recruiter.tsx`: Recruiter ATS command center, job postings, candidate search, candidate cards, stage transitions, interview scheduling.
27. `college.tsx`: College placement coordinator dashboard, student cohort readiness statistics, on-campus placement drive management.
28. `admin.tsx`: System administrator console, system health diagnostics, database latency metrics, data governance quality index, audit logs.

### 3.2 Backend Controllers (`backend/controllers/`)
1. `AuthController.php`: User registration, login, JWT issuance, refresh token rotation, logout revocation, `/auth/me` identity resolution.
2. `StudentController.php`: Student profile, skills CRUD, projects CRUD, certificates CRUD, resume PDF upload & extraction, phone verification.
3. `CompanyController.php`: Company creation, update, address geocoding with OpenStreetMap Nominatim, public company profiles.
4. `JobController.php`: Recruiter job creation, job status update (active/closed), public job search with deterministic skill matching.
5. `ApplicationController.php`: Job application submission with duplicate 409 guard, recruiter candidate pipeline, stage transitions, interview notes.
6. `InterviewController.php`: Interview scheduling (video/technical/behavioral), student interview listings, status updates.
7. `NotificationController.php`: Real-time notification retrieval, unread counts, mark-as-read, delete.
8. `AssessmentController.php`: Multi-choice and code assessment generation, attempt creation, answer submission, automated scoring.
9. `SkillVerificationController.php` / `PassportController.php`: Cryptographic Skill Passport tokens, HMAC signing, zero-PII public lookup, QR code generation.
10. `CareerEvolutionController.php`: Central Personal Career OS hub: dashboard aggregator, goals, readiness, skill gaps, next best action, roadmaps, weekly plans.
11. `CareerCopilotController.php`: "What-If" career growth simulation, AI skill gap analysis, agent recommendations.
12. `CollegePlacementController.php`: College portal, cohort readiness aggregation, placement drives, student enrollment.
13. `GitHubController.php`: GitHub username link, repository public metadata analysis, Proof-of-Work signals.
14. `InterviewAIController.php`: AI-driven mock interview question generation, response STAR analysis, scorecard generation.
15. `TalentSearchController.php`: Recruiter precision talent search with multi-skill boolean filtering, verified proof filters.
16. `AdminController.php`: Admin statistics, company verification toggle, system health monitoring, audit logs.
17. `AIController.php`: Resume summary generation, match explanations, AI recruiter candidate insights.

### 3.3 Backend Services (`backend/services/`)
1. `CareerEvolutionService.php`: Core Personal Career OS engine (readiness calculation, gap analysis, next action, roadmaps, weekly planner, evolution timeline).
2. `CareerRecommendationService.php`: Multi-factor recommendation scoring formula, 4-tier reachable jobs partitioning.
3. `CareerInsightService.php`: Deterministic explainable insights (strengths, gaps, opportunities, progress velocity).
4. `ProofOfSkillService.php`: Multi-source proof aggregator (assessments, projects, GitHub signals, audits).
5. `ProofOfWorkService.php`: GitHub repository analysis, technology detection, commit activity evidence.
6. `SkillEvidenceService.php`: Multi-factor evidence collection and verification state management.
7. `SkillIntegrityService.php`: Automated integrity audit engine detecting claimed vs proven skill mismatches.
8. `SkillVerificationService.php`: Assessment attempt lifecycle, timed questions, score evaluation.
9. `PassportCryptoService.php`: SHA-256 HMAC cryptographic token generation and verification.
10. `MatchingService.php` / `PrecisionMatchService.php`: Deterministic candidate-to-job matching algorithm.
11. `GeminiService.php`: Gemini 3.7 Flash API client with XML delimiter prompt injection defenses and deterministic offline fallbacks.
12. `ResumeExtractionService.php`: Secure PDF text extraction, structured resume parsing.
13. `FileUploadService.php`: MIME verification, double-extension defense, path traversal prevention, secure storage.
14. `GeocodingService.php`: OpenStreetMap Nominatim reverse geocoding with user-agent headers.
15. `DataQualityService.php`: Database catalog governance health check, index scoring, markdown report generation.
16. `DataRecommendationService.php`: Career progression chains, prerequisite topology traversal.
17. `HealthService.php` / `MetricsService.php` / `AlertService.php`: Enterprise observability, Prometheus metrics, sanitized diagnostics.
18. `AuditLogger.php` / `Logger.php` / `Validator.php`: Security audit trail, structured file logging, centralized schema validation.

---

## 4. Code Quality & Inconsistency Scan

- **TODO / FIXME Scan**: 0 unresolved technical debt items found in production code.
- **Mock / Fake Data**: 0 hardcoded fake datasets in production controllers or routes. All data is dynamically resolved from PostgreSQL.
- **Console Debugging**: Cleaned up in all production builds.
- **Dead Code**: Removed obsolete legacy files from earlier prototypes; zero orphaned routes.
- **Environment Isolation**: Strictly enforced. Local test database runs on port 55432 (`skillbridge_test`). Development connects to Neon PostgreSQL. Safety guard strictly blocks any test mutation against remote hosts.
