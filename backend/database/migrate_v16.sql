-- ============================================================
-- SkillBridge 3.0 — Migration v16
-- Personal Career Operating System Schema Hardening
-- Production-safe: all statements use IF NOT EXISTS / DO blocks
-- ============================================================

-- 1. Extend Career Goals with Career Domain & Target Seniority Level
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_goals' AND column_name = 'career_domain') THEN
        ALTER TABLE career_goals ADD COLUMN career_domain VARCHAR(64) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_goals' AND column_name = 'secondary_target_role') THEN
        ALTER TABLE career_goals ADD COLUMN secondary_target_role VARCHAR(128) NULL;
    END IF;
END $$;

-- 2. Career Readiness Snapshots (Real, auditable historical progression)
CREATE TABLE IF NOT EXISTS career_readiness_snapshots (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id      VARCHAR(64)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    target_role     VARCHAR(128) NOT NULL,
    readiness_score SMALLINT     NOT NULL CHECK (readiness_score BETWEEN 0 AND 100),
    readiness_tier  VARCHAR(64)  NOT NULL,
    breakdown       JSONB        NOT NULL DEFAULT '{}',
    snapshot_date   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_student ON career_readiness_snapshots(student_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_role ON career_readiness_snapshots(target_role);

-- 3. Student Notification Preferences
CREATE TABLE IF NOT EXISTS student_notification_preferences (
    student_id                VARCHAR(64) PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    skill_gap_alerts          BOOLEAN     NOT NULL DEFAULT TRUE,
    learning_reminders        BOOLEAN     NOT NULL DEFAULT TRUE,
    project_reminders         BOOLEAN     NOT NULL DEFAULT TRUE,
    job_reachability_alerts   BOOLEAN     NOT NULL DEFAULT TRUE,
    weekly_digest             BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Career Coach Sessions & Persistent Conversation History
CREATE TABLE IF NOT EXISTS career_coach_sessions (
    id          VARCHAR(64)  PRIMARY KEY,
    student_id  VARCHAR(64)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL DEFAULT 'Career Guidance Conversation',
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_coach_sessions_student ON career_coach_sessions(student_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS career_coach_messages (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id  VARCHAR(64)  NOT NULL REFERENCES career_coach_sessions(id) ON DELETE CASCADE,
    sender      VARCHAR(16)  NOT NULL CHECK (sender IN ('student', 'coach', 'system')),
    message     TEXT         NOT NULL,
    metadata    JSONB        NOT NULL DEFAULT '{}',
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_coach_messages_session ON career_coach_messages(session_id, created_at ASC);
