-- ============================================================================
-- SkillBridge Production Schema — v2 Migration
-- Run this on top of an existing v1 schema to add production-grade features.
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 12. Audit Log Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id            VARCHAR(36)  PRIMARY KEY,
    audit_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action        VARCHAR(100) NOT NULL,
    actor_id      VARCHAR(36)  NOT NULL,
    actor_role    VARCHAR(50)  NOT NULL DEFAULT 'unknown',
    target_type   VARCHAR(50)  NOT NULL DEFAULT '',
    target_id     VARCHAR(36)  NOT NULL DEFAULT '',
    ip            VARCHAR(45)  NOT NULL DEFAULT 'unknown',
    user_agent    VARCHAR(255) NOT NULL DEFAULT '',
    request_id    VARCHAR(64)  NOT NULL DEFAULT '',
    meta          JSONB        NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_at       ON audit_logs(audit_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target   ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_meta_gin ON audit_logs USING GIN(meta);

-- ---------------------------------------------------------------------------
-- 13. Application Stage History (immutable event log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_stage_history (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id VARCHAR(36)  NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_stage     VARCHAR(50)  NOT NULL DEFAULT 'applied',
    to_stage       VARCHAR(50)  NOT NULL,
    changed_by     VARCHAR(36)  NOT NULL,
    changed_by_role VARCHAR(50) NOT NULL DEFAULT 'recruiter',
    notes          TEXT         NULL,
    changed_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stage_history_app  ON application_stage_history(application_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_at   ON application_stage_history(changed_at DESC);

-- ---------------------------------------------------------------------------
-- 14. Recruiter Endorsements (published to student trust profiles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recruiter_endorsements (
    id             VARCHAR(36)  PRIMARY KEY,
    application_id VARCHAR(36)  NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    recruiter_id   VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id     VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    rating         SMALLINT     NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    review_text    TEXT         NOT NULL,
    is_published   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_endorsement_student  ON recruiter_endorsements(student_id);
CREATE INDEX IF NOT EXISTS idx_endorsement_recruiter ON recruiter_endorsements(recruiter_id);

-- ---------------------------------------------------------------------------
-- 15. Phone Verification Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS phone_verifications (
    id          VARCHAR(36)  PRIMARY KEY,
    user_id     VARCHAR(36)  NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    phone       VARCHAR(20)  NOT NULL,
    verified    BOOLEAN      NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Performance Indexes on frequently-joined / filtered columns
-- ---------------------------------------------------------------------------

-- applications: recruiter candidate pipeline JOINs
CREATE INDEX IF NOT EXISTS idx_app_job_id      ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_app_student_id  ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_app_job_stage   ON applications(job_id, stage);

-- student_skills: matching engine lookups
CREATE INDEX IF NOT EXISTS idx_ss_skill_id    ON student_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_ss_student_id  ON student_skills(student_id);

-- job_skills: matching JOINs
CREATE INDEX IF NOT EXISTS idx_js_job_id   ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_js_skill_id ON job_skills(skill_id);

-- jobs: active + recent feed queries
CREATE INDEX IF NOT EXISTS idx_job_status_posted ON jobs(status, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_company       ON jobs(company_id);

-- students: name / college search
CREATE INDEX IF NOT EXISTS idx_student_name    ON students(name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_student_program ON students(program);

-- notifications: unread badge counts
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- refresh_tokens: fast expiry cleanup
CREATE INDEX IF NOT EXISTS idx_token_expiry ON refresh_tokens(expires_at);

-- ---------------------------------------------------------------------------
-- Updated-at trigger function (shared)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    -- users
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    -- companies
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_companies_updated_at') THEN
        CREATE TRIGGER trg_companies_updated_at
            BEFORE UPDATE ON companies
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    -- students
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_students_updated_at') THEN
        CREATE TRIGGER trg_students_updated_at
            BEFORE UPDATE ON students
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    -- jobs
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_jobs_updated_at') THEN
        CREATE TRIGGER trg_jobs_updated_at
            BEFORE UPDATE ON jobs
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    -- applications
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_applications_updated_at') THEN
        CREATE TRIGGER trg_applications_updated_at
            BEFORE UPDATE ON applications
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
