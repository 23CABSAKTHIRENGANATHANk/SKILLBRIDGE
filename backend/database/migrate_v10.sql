-- ============================================================
-- SkillBridge 3.0 — Migration v10
-- College Placement Mode + Skill Trust Scores
-- Production-safe: all statements use IF NOT EXISTS / DO blocks
-- ============================================================

-- 1. College Groups (tenant-level college isolation)
CREATE TABLE IF NOT EXISTS college_groups (
    id              VARCHAR(64)  PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255) NULL,
    city            VARCHAR(100) NULL,
    state           VARCHAR(100) NULL,
    admin_user_id   VARCHAR(64)  NULL REFERENCES users(id) ON DELETE SET NULL,
    logo_url        VARCHAR(500) NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cg_admin ON college_groups(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_cg_domain ON college_groups(domain);

-- 2. Placement Students (college ↔ student membership, isolated per tenant)
CREATE TABLE IF NOT EXISTS placement_students (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    college_group_id VARCHAR(64) NOT NULL REFERENCES college_groups(id) ON DELETE CASCADE,
    student_id       VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    batch_year       SMALLINT    NULL,
    department       VARCHAR(100) NULL,
    enrolled_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_college_student UNIQUE (college_group_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_ps_college ON placement_students(college_group_id);
CREATE INDEX IF NOT EXISTS idx_ps_student ON placement_students(student_id);

-- 3. Placement Job Drives (college-specific job campaigns)
CREATE TABLE IF NOT EXISTS placement_job_drives (
    id               VARCHAR(64)  PRIMARY KEY,
    college_group_id VARCHAR(64)  NOT NULL REFERENCES college_groups(id) ON DELETE CASCADE,
    job_id           VARCHAR(64)  NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    description      TEXT         NULL,
    drive_date       TIMESTAMP WITH TIME ZONE NULL,
    status           VARCHAR(32)  NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'completed', 'cancelled')),
    min_trust_score  SMALLINT     NOT NULL DEFAULT 0,
    created_by       VARCHAR(64)  NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_college_job_drive UNIQUE (college_group_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_pjd_college ON placement_job_drives(college_group_id);
CREATE INDEX IF NOT EXISTS idx_pjd_status  ON placement_job_drives(status);

-- 4. Skill Trust Scores (materialized per-student per-skill, recomputed on demand)
-- Separate from ProofOfSkillService confidence — this is an explainability metric only
CREATE TABLE IF NOT EXISTS skill_trust_scores (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id   VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill_id     VARCHAR(64) NOT NULL REFERENCES skills(id)   ON DELETE CASCADE,
    trust_score  SMALLINT    NOT NULL DEFAULT 0  CHECK (trust_score BETWEEN 0 AND 100),
    confidence   VARCHAR(16) NOT NULL DEFAULT 'low' CHECK (confidence IN ('low','medium','high','very_high')),
    breakdown    JSONB       NOT NULL DEFAULT '{}',
    computed_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_trust_score UNIQUE (student_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_sts_student ON skill_trust_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_sts_skill   ON skill_trust_scores(skill_id);
CREATE INDEX IF NOT EXISTS idx_sts_score   ON skill_trust_scores(trust_score DESC);

-- 5. Add college_admin role to users check constraint (safe DO block)
DO $$
BEGIN
    -- Drop old constraint if it only allows 3 roles
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
    -- Re-add with college_admin included
    ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('student', 'recruiter', 'admin', 'college_admin'));
EXCEPTION
    WHEN others THEN NULL; -- if constraint name differs, skip safely
END;
$$;

-- 6. Indexes for N+1 fix on career copilot job_skills batch
CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill   ON job_skills(skill_id);
