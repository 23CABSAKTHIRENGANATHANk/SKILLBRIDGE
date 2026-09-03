-- ============================================================
-- SkillBridge 2.0 - Phase 1 Migration (migrate_v7.sql)
-- AI Skill Verification 2.0, Skill Integrity, and AI Interview 2.0
-- ============================================================

-- 1. Skill Verification Attempts
CREATE TABLE IF NOT EXISTS skill_verification_attempts (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill_id VARCHAR(64) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    requested_level VARCHAR(32) NOT NULL DEFAULT 'intermediate',
    difficulty VARCHAR(32) NOT NULL DEFAULT 'intermediate',
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned', 'expired'
    current_question_index INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 4,
    score NUMERIC(5,2) NOT NULL DEFAULT 0,
    verified_level VARCHAR(32) NOT NULL DEFAULT 'Not Verified',
    confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    attempt_number INT NOT NULL DEFAULT 1,
    breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    time_limit_seconds INT NOT NULL DEFAULT 900,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sva_student_skill ON skill_verification_attempts(student_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_sva_student_status ON skill_verification_attempts(student_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sva_one_active_per_skill
    ON skill_verification_attempts(student_id, skill_id)
    WHERE status = 'in_progress';

-- 2. Skill Verification Questions
CREATE TABLE IF NOT EXISTS skill_verification_questions (
    id VARCHAR(64) PRIMARY KEY,
    attempt_id VARCHAR(64) NOT NULL REFERENCES skill_verification_attempts(id) ON DELETE CASCADE,
    question_index INT NOT NULL,
    question_type VARCHAR(32) NOT NULL, -- 'MCQ', 'SHORT_ANSWER', 'CODE', 'DEBUGGING', 'SCENARIO'
    category VARCHAR(64) NOT NULL, -- 'Conceptual Foundations', 'Practical Implementation', 'Debugging & Optimization', 'Production Scenario'
    question_text TEXT NOT NULL,
    code_snippet TEXT NULL,
    options JSONB NULL,
    expected_answer TEXT NOT NULL,
    rubric JSONB NULL,
    points INT NOT NULL DEFAULT 25,
    is_objective BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_svq_attempt_idx ON skill_verification_questions(attempt_id, question_index);

-- 3. Skill Verification Answers
CREATE TABLE IF NOT EXISTS skill_verification_answers (
    id VARCHAR(64) PRIMARY KEY,
    attempt_id VARCHAR(64) NOT NULL REFERENCES skill_verification_attempts(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES skill_verification_questions(id) ON DELETE CASCADE,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN NULL,
    score_awarded NUMERIC(5,2) NOT NULL DEFAULT 0,
    ai_feedback TEXT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attempt_question UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_sva_student_id ON skill_verification_answers(student_id);

-- 4. Skill Integrity Audits (Multi-Source Cross-Referenced Evidence)
CREATE TABLE IF NOT EXISTS skill_integrity_audits (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill_id VARCHAR(64) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    claimed_level VARCHAR(32) NOT NULL DEFAULT 'intermediate',
    supported_level VARCHAR(32) NOT NULL DEFAULT 'Developing',
    status VARCHAR(32) NOT NULL DEFAULT 'NOT_VERIFIED', -- 'VERIFIED', 'EVIDENCE_MISMATCH', 'NOT_VERIFIED', 'DEVELOPING'
    confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    evidence_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_audited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_skill_audit UNIQUE(student_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_sia_student ON skill_integrity_audits(student_id);

-- 5. AI Interview Sessions 2.0 (Adaptive, Grounded in Evidence)
CREATE TABLE IF NOT EXISTS ai_interview_sessions_v2 (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    job_id VARCHAR(64) NULL REFERENCES jobs(id) ON DELETE SET NULL,
    target_role VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'initialized', -- 'initialized', 'in_progress', 'completed'
    current_stage INT NOT NULL DEFAULT 0,
    total_stages INT NOT NULL DEFAULT 4,
    question_tree JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    scorecard JSONB NULL,
    overall_score NUMERIC(5,2) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ais_student ON ai_interview_sessions_v2(student_id);
