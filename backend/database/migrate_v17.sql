-- ============================================================
-- SkillBridge 3.0 — Migration v17
-- Resume Intelligent Auto-Sync Engine Schema
-- Production-safe: all statements use IF NOT EXISTS / DO blocks
-- ============================================================

-- 1. Extend Students Profile with Links, Bio and CGPA
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'github_url') THEN
        ALTER TABLE students ADD COLUMN github_url VARCHAR(500) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'linkedin_url') THEN
        ALTER TABLE students ADD COLUMN linkedin_url VARCHAR(500) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'portfolio_url') THEN
        ALTER TABLE students ADD COLUMN portfolio_url VARCHAR(500) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'bio') THEN
        ALTER TABLE students ADD COLUMN bio TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'cgpa') THEN
        ALTER TABLE students ADD COLUMN cgpa VARCHAR(50) NULL;
    END IF;
END $$;

-- 2. Student Education Table (Structured academic history)
CREATE TABLE IF NOT EXISTS student_education (
    id              VARCHAR(36)  PRIMARY KEY,
    student_id      VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution     VARCHAR(255) NOT NULL,
    degree          VARCHAR(150) NULL,
    field           VARCHAR(150) NULL,
    start_year      VARCHAR(10)  NULL,
    graduation_year VARCHAR(10)  NULL,
    grade           VARCHAR(50)  NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_se_student_id ON student_education(student_id);

-- 3. Student Experience Table (Structured professional and internship history)
CREATE TABLE IF NOT EXISTS student_experience (
    id              VARCHAR(36)  PRIMARY KEY,
    student_id      VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    company         VARCHAR(255) NOT NULL,
    job_title       VARCHAR(150) NOT NULL,
    employment_type VARCHAR(50)  NULL DEFAULT 'Full-time',
    start_date      VARCHAR(50)  NULL,
    end_date        VARCHAR(50)  NULL,
    description     TEXT         NULL,
    technologies    VARCHAR(255) NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sexp_student_id ON student_experience(student_id);

-- 4. Resume Processing History Table (Idempotent tracking, status and content hash)
CREATE TABLE IF NOT EXISTS resume_processing_history (
    id                VARCHAR(36)  PRIMARY KEY,
    resume_id         VARCHAR(36)  NULL,
    student_id        VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    storage_key       VARCHAR(500) NOT NULL,
    content_hash      VARCHAR(64)  NOT NULL,
    processing_status VARCHAR(50)  NOT NULL DEFAULT 'uploaded',
    extraction_status VARCHAR(50)  NOT NULL DEFAULT 'pending',
    sync_status       VARCHAR(50)  NOT NULL DEFAULT 'pending',
    summary           JSONB        NOT NULL DEFAULT '{}',
    conflicts         JSONB        NOT NULL DEFAULT '[]',
    parser_version    VARCHAR(50)  NOT NULL DEFAULT '3.0',
    error_code        VARCHAR(50)  NULL,
    processed_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rph_student_id ON resume_processing_history(student_id);
CREATE INDEX IF NOT EXISTS idx_rph_content_hash ON resume_processing_history(student_id, content_hash);

-- 5. Resume Conflicts Table (Non-destructive manual review ledger)
CREATE TABLE IF NOT EXISTS resume_conflicts (
    id              VARCHAR(36)  PRIMARY KEY,
    student_id      VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    resume_id       VARCHAR(36)  NULL,
    field           VARCHAR(50)  NOT NULL,
    existing_value  TEXT         NULL,
    resume_value    TEXT         NULL,
    status          VARCHAR(50)  NOT NULL DEFAULT 'requires_review' CHECK (status IN ('requires_review', 'resolved', 'ignored')),
    resolution      VARCHAR(50)  NULL,
    resolved_at     TIMESTAMP WITH TIME ZONE NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rc_student_id ON resume_conflicts(student_id, status);
