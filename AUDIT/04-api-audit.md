# SkillBridge 3.0 — Complete REST API Audit & Specification

**Generated**: 2026-09-04  
**Scope**: 105+ Exhaustive REST Endpoints in `backend/index.php`  
**Standard Error Format**: `{"error": string, "code": integer, "details"?: array}`  

---

## 1. Authentication & Session Endpoints

| Method | Endpoint Path | Auth Required | Allowed Role | Input Parameters | Validation Rules | Primary DB Table | Status Codes | Automated Test Coverage | Status |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: | :--- | :---: |
| `POST` | `/api/auth/register` | None | Public | `email`, `password`, `name`, `role`, `company_name`? | Email format, Password >= 8 chars, Role in `[student, recruiter]` | `users`, `students`, `companies` | 201, 400, 409, 429 | `test_runner.cjs` (step 1), `audit_runner.cjs` | **PASS** |
| `POST` | `/api/auth/login` | None | Public | `email`, `password` | Non-empty email/password | `users`, `refresh_tokens` | 200, 400, 401, 429 | `test_runner.cjs` (step 2), `audit_runner.cjs` | **PASS** |
| `POST` | `/api/auth/refresh` | None | Public | `refresh_token` | Token must exist in DB, not expired, not revoked | `refresh_tokens` | 200, 401, 429 | `test_runner.cjs` (step 31-33), `audit_runner.cjs` | **PASS** |
| `POST` | `/api/auth/logout` | Bearer | Any | `refresh_token`? | Header bearer token | `refresh_tokens` | 200, 401 | `test_runner.cjs` (step 33), `audit_runner.cjs` | **PASS** |
| `GET` | `/api/auth/me` | Bearer | Any | None | Header bearer token | `users`, `students`, `companies` | 200, 401 | `test_runner.cjs` (step 3), `test-suite.php` | **PASS** |

---

## 2. Student Profile & Skill Verification Endpoints

| Method | Endpoint Path | Auth Required | Allowed Role | Input Parameters | Validation Rules | Primary DB Table | Status Codes | Automated Test Coverage | Status |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: | :--- | :---: |
| `GET` | `/api/student/dashboard` | Bearer | `student` | None | Active token matching student record | `students`, `applications`, `student_skills` | 200, 401, 403 | `test_runner.cjs` (step 4), `database-integration-test.php` | **PASS** |
| `POST` | `/api/student/onboarding` | Bearer | `student` | `target_role`, `college`, `grad_year` | Required strings, year integer | `students` | 200, 400, 401 | `test_runner.cjs` (step 5) | **PASS** |
| `POST` | `/api/student/skills` | Bearer | `student` | `skill_name`, `proficiency` | Proficiency in `[beginner, intermediate, advanced]` | `skills`, `student_skills` | 200, 400, 401 | `test_runner.cjs` (step 8b), `database-integration-test.php` | **PASS** |
| `DELETE`| `/api/student/skills` | Bearer | `student` | `skill_id` | Valid UUID | `student_skills` | 200, 400, 401 | `test_runner.cjs` (step 8b) | **PASS** |
| `POST` | `/api/student/projects` | Bearer | `student` | `title`, `repo_url`, `tech_stack` | Valid HTTPS URL, tech stack array | `student_projects` | 201, 400, 401 | `database-integration-test.php` (Sec 5) | **PASS** |
| `DELETE`| `/api/student/projects/{id}` | Bearer | `student` | Route ID | Owner student ID check | `student_projects` | 200, 401, 403, 404 | `database-integration-test.php` (Sec 5) | **PASS** |
| `POST` | `/api/student/resume` | Bearer | `student` | Multipart File `resume` | PDF magic bytes `%PDF-`, size <= 5MB | `resumes` | 200, 400, 401, 413 | `audit_runner.cjs` (Sec 4) | **PASS** |
| `GET` | `/api/student/resume/download/{id}` | Bearer | `student` / `recruiter` | Route ID | Owner student or recruiter with active applicant | `resumes`, `applications` | 200, 401, 403, 404 | `audit_runner.cjs` (Sec 2, IDOR) | **PASS** |
| `GET` | `/api/assessment` | Bearer | `student` | `skill_id` | Valid skill UUID | `assessment_questions` | 200, 400, 401 | `database-integration-test.php` (Sec 6) | **PASS** |
| `POST` | `/api/assessment/submit` | Bearer | `student` | `attempt_id`, `answers` | JSON map of question_id -> option_id | `skill_assessments` | 200, 400, 401, 403 | `database-integration-test.php` (Sec 6) | **PASS** |
| `GET` | `/api/student/skill-integrity` | Bearer | `student` | None | Active token | `skill_integrity_audits` | 200, 401 | `database-integration-test.php` (Sec 7) | **PASS** |
| `POST` | `/api/student/passport` | Bearer | `student` | None | Verified skills >= 1 | `skill_passports` | 201, 400, 401 | `phase2-passport-test.php` | **PASS** |
| `GET` | `/api/passport/{token}` | None | Public | Route token | Cryptographic HMAC validation | `skill_passports` | 200, 404 | `phase2-passport-test.php` | **PASS** |

---

## 3. Personal Career OS Endpoints

| Method | Endpoint Path | Auth Required | Allowed Role | Input Parameters | Validation Rules | Primary DB Table | Status Codes | Automated Test Coverage | Status |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: | :--- | :---: |
| `GET` | `/api/student/career-os` | Bearer | `student` | None | Active token | `students`, `career_goals` | 200, 401 | `http-database-integration-test.php` (Sec 3) | **PASS** |
| `GET` | `/api/student/career-goal` | Bearer | `student` | None | Active token | `career_goals` | 200, 401 | `http-database-integration-test.php` (Sec 2) | **PASS** |
| `POST` | `/api/student/career-goal` | Bearer | `student` | `target_role`, `target_timeline_months` | Non-empty target role, integer months | `career_goals` | 200, 400, 401 | `http-database-integration-test.php` (Sec 2) | **PASS** |
| `GET` | `/api/student/readiness` | Bearer | `student` | `role`? | Role string or resolves active goal | `student_skills`, `skills` | 200, 401 | `personal-career-os-test.php` (Sec 2) | **PASS** |
| `GET` | `/api/student/skill-gaps` | Bearer | `student` | `role`? | Role string or resolves active goal | `skills`, `skill_dependencies` | 200, 401 | `skillbridge-3-career-evolution-test.php` | **PASS** |
| `GET` | `/api/student/next-action` | Bearer | `student` | `role`? | Role string or resolves active goal | `career_goals`, `learning_resources` | 200, 401 | `career-intelligence-test.php` (Sec 7) | **PASS** |
| `GET` | `/api/student/skill-graph` | Bearer | `student` | None | Active token | `skills`, `skill_dependencies` | 200, 401 | `personal-career-os-test.php` (Sec 3) | **PASS** |
| `GET` | `/api/student/roadmap` | Bearer | `student` | None | Active token | `career_roadmaps`, `career_roadmap_steps` | 200, 401 | `database-integration-test.php` (Sec 10) | **PASS** |
| `POST` | `/api/student/roadmap/step/{id}/complete` | Bearer | `student` | Route ID | Step belongs to student's roadmap | `career_roadmap_steps` | 200, 401, 403, 404 | `database-integration-test.php` (Sec 10) | **PASS** |
| `GET` | `/api/student/weekly-plan` | Bearer | `student` | None | Active token | `weekly_career_plans`, `weekly_plan_tasks`| 200, 401 | `personal-career-os-test.php` (Sec 6) | **PASS** |
| `POST` | `/api/student/weekly-plan/task/{id}/toggle` | Bearer | `student` | Route ID | Task belongs to student's weekly plan | `weekly_plan_tasks` | 200, 401, 403, 404 | `personal-career-os-test.php` (Sec 6) | **PASS** |
| `GET` | `/api/student/reachable-jobs` | Bearer | `student` | None | Active token | `jobs`, `skills`, `student_skills` | 200, 401 | `career-intelligence-test.php` (Sec 9) | **PASS** |
| `GET` | `/api/student/learning` | Bearer | `student` | `skill`?, `type`?, `difficulty`? | Optional filters | `learning_resources` | 200, 401 | `skillbridge-3-career-evolution-test.php` | **PASS** |
| `POST` | `/api/career-coach/message` | Bearer | `student` | `message` | Non-empty string | `career_coach_messages` | 200, 400, 401 | `personal-career-os-test.php` (Sec 10) | **PASS** |

---

## 4. Jobs, Applications & Recruiter ATS Endpoints

| Method | Endpoint Path | Auth Required | Allowed Role | Input Parameters | Validation Rules | Primary DB Table | Status Codes | Automated Test Coverage | Status |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: | :--- | :---: |
| `GET` | `/api/jobs` | Optional | Any | `search`?, `type`?, `location`? | Query string parameters | `jobs`, `companies` | 200 | `test_runner.cjs` (step 8) | **PASS** |
| `POST` | `/api/jobs` | Bearer | `recruiter` | `title`, `description`, `skills`, `type` | Required title, description, skills array | `jobs`, `job_skills` | 201, 400, 401, 403 | `test_runner.cjs` (step 7) | **PASS** |
| `POST` | `/api/applications/apply` | Bearer | `student` | `job_id`, `cover_note`? | Valid job UUID, active job check | `applications` | 201, 400, 401, 409 | `http-database-integration-test.php` (Sec 8) | **PASS** |
| `GET` | `/api/applications/candidates` | Bearer | `recruiter` | `job_id`?, `stage`? | Recruiter company scope enforced | `applications`, `students` | 200, 401, 403 | `audit_runner.cjs` (Sec 2) | **PASS** |
| `PUT` | `/api/applications/stage` | Bearer | `recruiter` | `application_id`, `stage` | Stage in `[applied, shortlisted, interview, offer, rejected]` | `applications`, `application_stage_history` | 200, 400, 401, 403 | `test_runner.cjs` (step 11b, 14) | **PASS** |
| `POST` | `/api/interviews/schedule` | Bearer | `recruiter` | `application_id`, `scheduled_at`, `meeting_link` | Valid ISO date, application belongs to company | `interviews`, `notifications` | 201, 400, 401, 403 | `test_runner.cjs` (step 12-13) | **PASS** |
| `GET` | `/api/recruiter/talent-search` | Bearer | `recruiter` | `skills`?, `min_readiness`?, `verified_only`? | Valid query parameters | `students`, `student_skills` | 200, 401, 403 | `phase2-talent-search-test.php` | **PASS** |
| `POST` | `/api/recruiter/shortlist` | Bearer | `recruiter` | `student_id`, `notes` | Valid student UUID | `recruiter_shortlists` | 200, 400, 401, 403 | `audit_runner.cjs` (Sec 2) | **PASS** |

---

## 5. Security, System Health & Administration Endpoints

| Method | Endpoint Path | Auth Required | Allowed Role | Input Parameters | Validation Rules | Primary DB Table | Status Codes | Automated Test Coverage | Status |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: | :--- | :---: |
| `GET` | `/api/health` | None | Public | None | Database ping, memory, disk check | N/A | 200, 503 | `audit_runner.cjs` (Sec 7) | **PASS** |
| `GET` | `/api/ping` | None | Public | None | Fast healthcheck ping | N/A | 200 | `ci.yml` healthcheck loop | **PASS** |
| `GET` | `/api/metrics` | None | Public / Prometheus | None | Prometheus format metrics | N/A | 200 | Prometheus scraper check | **PASS** |
| `GET` | `/api/admin/stats` | Bearer | `admin` | None | Active token with role `admin` | `users`, `jobs`, `applications` | 200, 401, 403 | `audit_runner.cjs` (Sec 3) | **PASS** |
| `GET` | `/api/admin/audit` | Bearer | `admin` | `limit`?, `action`? | Admin role check | `audit_logs` | 200, 401, 403 | `audit_runner.cjs` (Sec 3) | **PASS** |
| `GET` | `/api/system/data-quality` | Bearer | `admin` | None | Admin role check | `source_registry`, `staging_*` tables | 200, 401, 403 | `career-intelligence-test.php` (Sec 10) | **PASS** |
