# SkillBridge 3.0 — End-to-End Real User Journey Audit

**Generated**: 2026-09-04  
**Validation Methodology**: Automated E2E Execution (`backend/tests/test_runner.cjs`), HTTP Integration Tests, and Database Lifecycle Checks  
**Execution Context**: Real PostgreSQL 16 test database with complete data persistence and state verification  

---

## 1. Candidate / Student Complete Journey

```
Registration & Login ──► Profile & Resume Upload ──► Skill Portfolio & Assessments ──► Cryptographic Passport
         │
         ▼
Career Goal Selection ──► Readiness & Gap Analysis ──► Weekly Planner & Roadmap ──► Reachable Jobs
         │
         ▼
Application Submission ──► Recruiter Interview ──► Mock STAR Practice ──► Offer & Evolution Ledger
```

| Step # | Stage Description | Primary Actions & Endpoints | Verification Checks & Assertions | Observed Behavior | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **S1** | **Signup & Onboarding** | `POST /api/auth/register`, `POST /api/student/onboarding` | User record inserted; password hashed with bcrypt; onboarding metadata saved. | Returns 201 Created and JWT bearer token. | **PASS** |
| **S2** | **Skill Declaration** | `POST /api/student/skills` | Upserts claimed skills (`React`, `TypeScript`) into `student_skills`. | Skill displayed as Unverified in UI. | **PASS** |
| **S3** | **Resume Upload** | `POST /api/student/resume` | Multi-part PDF upload, MIME verification, text extraction. | Resumes table updated; skills auto-detected. | **PASS** |
| **S4** | **Project Evidence** | `POST /api/student/projects`, `POST /api/student/github/connect` | Attaches GitHub repository URL; validates HTTPS syntax and commit presence. | Project evidence score attached. | **PASS** |
| **S5** | **Skill Assessment** | `GET /api/assessment`, `POST /api/assessment/submit` | Timed multiple-choice assessment evaluated server-side. | Score >= 70% flips skill status to `verified = TRUE`. | **PASS** |
| **S6** | **Skill Passport** | `POST /api/student/passport`, `GET /api/passport/{token}` | Issues cryptographic zero-PII passport; generates public verification URL. | Public lookup returns verified skills & badges. | **PASS** |
| **S7** | **Career Goal** | `POST /api/student/career-goal` | Sets target role: "Frontend Developer", timeline: 6 months. | Upserts `career_goals` record. | **PASS** |
| **S8** | **Readiness & Gaps** | `GET /api/student/readiness`, `GET /api/student/skill-gaps` | Computes 0-100% readiness score and categorizes missing skills. | Partitioned into strong, needs_improvement, and missing. | **PASS** |
| **S9** | **Roadmap & Plan** | `GET /api/student/roadmap`, `GET /api/student/weekly-plan` | Schedules 4 roadmap phases and 7 daily study tasks. | Toggling step atomically updates DB status. | **PASS** |
| **S10**| **Reachable Jobs** | `GET /api/student/reachable-jobs` | Partitions active jobs into Ready Now, Nearly Ready, Skill Gap, Future Target. | Jobs categorized with deterministic match %. | **PASS** |
| **S11**| **Job Application** | `POST /api/applications/apply` | Submits candidate profile to active job opening. | Application created; duplicate submission rejected (409).| **PASS** |
| **S12**| **Interview & STAR** | `GET /api/interviews`, `POST /api/interview-ai/start` | Receives scheduled interview notification; completes AI STAR practice. | Practice scorecard generated; timeline updated. | **PASS** |
| **S13**| **Evolution Ledger** | `GET /api/student/evolution` | Records milestone completion in knowledge evolution ledger. | Milestone visible on student timeline. | **PASS** |

---

## 2. Recruiter ATS Complete Journey

| Step # | Stage Description | Primary Actions & Endpoints | Verification Checks & Assertions | Observed Behavior | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **R1** | **Recruiter Registration** | `POST /api/auth/register` (`role=recruiter`) | Company entity created; recruiter account bound to company. | Returns JWT with role `recruiter`. | **PASS** |
| **R2** | **Company Geocoding** | `POST /api/company` | Saves company address; fetches latitude/longitude via OpenStreetMap. | Geocoded coordinates saved in database. | **PASS** |
| **R3** | **Job Posting** | `POST /api/jobs` | Creates job listing: "Senior Frontend Engineer" with required skills. | Job visible in public listings. | **PASS** |
| **R4** | **Applicant Review** | `GET /api/applications/candidates` | Views candidates in Kanban stages (Applied, Shortlisted, Interview). | Scoped strictly to recruiter's company jobs. | **PASS** |
| **R5** | **Candidate Shortlisting**| `POST /api/recruiter/shortlist` | Adds candidate to shortlist with private assessment notes. | Notes protected from cross-recruiter access. | **PASS** |
| **R6** | **Interview Scheduling** | `POST /api/interviews/schedule` | Sets interview date, time, and meeting link. | Notification dispatched to student. | **PASS** |
| **R7** | **Offer Progression** | `PUT /api/applications/stage` | Transitions candidate application stage to `offer`. | History recorded in `application_stage_history`. | **PASS** |

---

## 3. System Administrator & Governance Journey

| Step # | Stage Description | Primary Actions & Endpoints | Verification Checks & Assertions | Observed Behavior | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **A1** | **Admin Access Guard** | `GET /api/admin/stats` | Enforces `AuthMiddleware::requireRole('admin')`. | 403 Forbidden for students and recruiters. | **PASS** |
| **A2** | **Platform Telemetry** | `GET /api/admin/stats`, `GET /api/health` | Aggregates user counts, total applications, database health. | Real-time statistics rendered cleanly. | **PASS** |
| **A3** | **Data Governance** | `GET /api/system/data-quality` | Live evaluation of catalog health, HTTPS compliance, index coverage. | Overall System Health Index >= 95% confirmed. | **PASS** |
| **A4** | **Audit Trail Review** | `GET /api/admin/audit` | Retrieves chronological audit log of security events. | Paginated security events returned. | **PASS** |
