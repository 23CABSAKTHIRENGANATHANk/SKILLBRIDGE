-- SkillBridge 3.0 -- Personal Career OS state hardening
-- Extends existing Career Evolution tables; no duplicate source of truth.

ALTER TABLE career_goals
    ADD COLUMN IF NOT EXISTS secondary_target_role VARCHAR(128) NULL;

ALTER TABLE student_learning_progress
    ADD COLUMN IF NOT EXISTS progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE student_learning_progress
SET progress = 100
WHERE status = 'completed' AND progress <> 100;

CREATE INDEX IF NOT EXISTS idx_student_learning_progress_status
    ON student_learning_progress(student_id, status, last_accessed_at DESC);

-- A catalog recommendation is not a portfolio project. This table only tracks a
-- student's explicit work against an existing recommendation.
CREATE TABLE IF NOT EXISTS student_project_progress (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    project_id VARCHAR(64) NOT NULL REFERENCES project_recommendations(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'completed', 'submitted', 'verified')),
    progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    repository_url TEXT NULL,
    started_at TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_project_recommendation UNIQUE (student_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_student_project_progress_state
    ON student_project_progress(student_id, status, last_accessed_at DESC);
