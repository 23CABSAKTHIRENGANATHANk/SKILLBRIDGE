# SkillBridge 3.0 — Complete Database Schema & Migration Audit

**Generated**: 2026-09-04  
**Engine**: PostgreSQL 16 (Relational, JSONB, Strict Constraints, Foreign Keys)  
**Safety & Isolation**: Verified with fail-closed `DatabaseSafetyGuard.php` against isolated test database `skillbridge_test`  

---

## 1. Schema & Migration Architecture

```
backend/database/
├── schema.sql           # Base tables: users, students, companies, jobs, skills, job_skills, student_skills, applications, interviews, notifications, audit_logs
├── migrate_v2.sql       # Refresh tokens & session rotation
├── migrate_v3.sql       # Student onboarding metadata & phone verification
├── migrate_v4.sql       # Resumes metadata & PDF extraction storage
├── migrate_v5.sql       # Assessments, question bank & attempts
├── migrate_v6.sql       # Projects, certificates & evidence attachments
├── migrate_v7.sql       # College placement drives & cohort analytics
├── migrate_v8.sql       # Skill passports & public cryptographic verification
├── migrate_v9.sql       # Proof-of-Work GitHub signals & repo analysis
├── migrate_v10.sql      # AI mock interview sessions & STAR scorecards
├── migrate_v11.sql      # Recruiter talent search filters & shortlists
├── migrate_v12.sql      # Skill integrity audits & multi-source evidence
├── migrate_v13.sql      # Personal Career OS: career goals, roadmaps, weekly plans
├── migrate_v14.sql      # Knowledge evolution ledger & milestone achievements
├── migrate_v15.sql      # Curated learning resources & project recommendation blueprints
├── migrate_v16.sql      # Career intelligence catalogs, skill dependency edges DAG & data quality indices
└── seed.sql             # Canonical seed: initial skills, test recruiters, initial jobs
```

---

## 2. Table-by-Table Deep Audit & Constraints

| Table Name | Primary Key | Foreign Keys & Cascades | Unique & Check Constraints | Index Coverage | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `users` | `id` (VARCHAR) | None | `UNIQUE (email)`, `role IN ('student','recruiter','admin','college')` | `idx_users_email`, `idx_users_role` | **PASS** |
| `students` | `id` (VARCHAR) | `user_id -> users(id) ON DELETE CASCADE` | None | `idx_students_user_id` | **PASS** |
| `companies` | `id` (VARCHAR) | `user_id -> users(id) ON DELETE CASCADE` | None | `idx_companies_user_id` | **PASS** |
| `jobs` | `id` (VARCHAR) | `company_id -> companies(id) ON DELETE CASCADE` | `type IN ('full-time','part-time','internship','contract')` | `idx_jobs_company_id`, `idx_jobs_status` | **PASS** |
| `skills` | `id` (VARCHAR) | None | `UNIQUE (name)`, `UNIQUE (slug)` | `idx_skills_name`, `idx_skills_slug`, `idx_skills_domain` | **PASS** |
| `job_skills` | `(job_id, skill_id)` | `job_id -> jobs`, `skill_id -> skills` | Composite PK prevents duplicate job skills | `idx_job_skills_job_id`, `idx_job_skills_skill_id` | **PASS** |
| `student_skills` | `(student_id, skill_id)` | `student_id -> students`, `skill_id -> skills` | Composite PK prevents duplicate student skills | `idx_student_skills_student`, `idx_student_skills_skill` | **PASS** |
| `applications` | `id` (VARCHAR) | `student_id -> students`, `job_id -> jobs` | `UNIQUE (student_id, job_id)`, stage check constraint | `idx_app_student`, `idx_app_job`, `idx_app_stage` | **PASS** |
| `interviews` | `id` (VARCHAR) | `application_id -> applications ON DELETE CASCADE` | `status IN ('scheduled','completed','cancelled')` | `idx_interviews_app_id`, `idx_interviews_scheduled` | **PASS** |
| `notifications` | `id` (VARCHAR) | `user_id -> users(id) ON DELETE CASCADE` | `is_read` boolean | `idx_notifications_user_unread` | **PASS** |
| `refresh_tokens` | `id` (VARCHAR) | `user_id -> users(id) ON DELETE CASCADE` | `UNIQUE (token_hash)` | `idx_refresh_tokens_hash`, `idx_refresh_tokens_user` | **PASS** |
| `resumes` | `id` (VARCHAR) | `student_id -> students(id) ON DELETE CASCADE` | `UNIQUE (student_id)` (One active resume per student) | `idx_resumes_student_id` | **PASS** |
| `student_projects` | `id` (VARCHAR) | `student_id -> students(id) ON DELETE CASCADE` | None | `idx_projects_student_id` | **PASS** |
| `skill_assessments` | `id` (VARCHAR) | `student_id -> students`, `skill_id -> skills` | Score bounded in `[0, 100]` | `idx_assessments_student_skill` | **PASS** |
| `skill_passports` | `id` (VARCHAR) | `student_id -> students(id) ON DELETE CASCADE` | `UNIQUE (token_hash)` | `idx_passports_token_hash` | **PASS** |
| `proof_of_work_repositories`| `id` (VARCHAR) | `student_id -> students(id) ON DELETE CASCADE` | None | `idx_pow_student_id` | **PASS** |
| `skill_integrity_audits` | `id` (VARCHAR) | `student_id -> students`, `skill_id -> skills` | `status IN ('verified','flagged','pending')` | `idx_integrity_student_skill` | **PASS** |
| `career_goals` | `id` (VARCHAR) | `student_id -> students(id) ON DELETE CASCADE` | `UNIQUE (student_id)` | `idx_career_goals_student_id` | **PASS** |
| `career_roadmaps` | `id` (VARCHAR) | `student_id -> students(id) ON DELETE CASCADE` | None | `idx_roadmaps_student_id` | **PASS** |
| `career_roadmap_steps` | `id` (VARCHAR) | `roadmap_id -> career_roadmaps ON DELETE CASCADE` | `status IN ('pending','in_progress','completed')` | `idx_roadmap_steps_roadmap_id` | **PASS** |
| `weekly_career_plans` | `id` (VARCHAR) | `student_id -> students(id) ON DELETE CASCADE` | None | `idx_weekly_plans_student_id` | **PASS** |
| `weekly_plan_tasks` | `id` (VARCHAR) | `plan_id -> weekly_career_plans ON DELETE CASCADE` | Day in `['Monday',...'Sunday']` | `idx_plan_tasks_plan_id` | **PASS** |
| `skill_dependencies` | `(source_skill_id, target_skill_id)` | `skills(id)` | Directed acyclic edge, unique composite PK | `idx_skill_dep_source`, `idx_skill_dep_target` | **PASS** |
| `learning_resources`| `id` (VARCHAR) | `skill_id -> skills` | HTTPS URL check, Quality score in `[0, 100]` | `idx_learning_skill_quality` | **PASS** |
| `project_recommendations`| `id` (VARCHAR) | `skill_id -> skills` | Complexity in `['beginner','intermediate','advanced']`| `idx_project_recs_skill` | **PASS** |

---

## 3. End-to-End Traceability Mapping

| User Workflow | Frontend Component | REST API Endpoint | Controller & Method | Service Call | Primary SQL Queries | Tables Touched |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Apply for Job** | `JobCard.tsx` / `OpportunityModal.tsx` | `POST /api/applications/apply` | `ApplicationController::apply()` | `Validator::validate()` | `INSERT INTO applications ...`, `INSERT INTO notifications ...` | `applications`, `notifications` |
| **Complete Assessment** | `SkillAssessmentModal.tsx` | `POST /api/assessment/submit` | `AssessmentController::submit()` | `SkillVerificationService::evaluate()` | `UPDATE skill_assessments SET score = ?, status = 'completed' ...` | `skill_assessments`, `student_skills` |
| **Save Career Goal** | `CareerGoal.tsx` | `POST /api/student/career-goal` | `CareerEvolutionController::saveGoal()` | `CareerEvolutionService::saveCareerGoal()` | `INSERT INTO career_goals ... ON CONFLICT (student_id) DO UPDATE ...` | `career_goals` |
| **Toggle Roadmap Step** | `CareerRoadmap.tsx` | `POST /api/student/roadmap/step/{id}/complete`| `CareerEvolutionController::completeRoadmapStep()` | `CareerEvolutionService::toggleRoadmapStep()` | `UPDATE career_roadmap_steps SET status = ? WHERE id = ?` | `career_roadmap_steps` |
| **Recruiter Shortlist** | `CandidateCard.tsx` | `POST /api/recruiter/shortlist` | `ApplicationController::shortlist()` | `MatchingService::calculate()` | `INSERT INTO recruiter_shortlists ...`, `UPDATE applications SET stage = 'shortlisted'` | `recruiter_shortlists`, `applications` |

---

## 4. Transaction Atomicity & Concurrency Audit

- **Transactional Rollback Verification**:
  - Tested via `tests/database-integration-test.php` (Section 14).
  - Executed a multi-statement transaction attempting an invalid foreign key write following a valid write.
  - Asserted `ROLLBACK` was triggered and zero partial rows were committed to PostgreSQL.
- **Connection-Reload Persistence**:
  - Mutated records were verified by explicitly closing the PDO connection (`$db = null`), opening a brand-new connection to PostgreSQL, and re-querying the data to confirm that uncommitted cache states are never mistaken for persistence.
