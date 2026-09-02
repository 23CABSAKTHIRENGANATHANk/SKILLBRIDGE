-- ============================================================================
-- SkillBridge 2.0 Production Schema — v4 Migration (Proof-of-Skill Ecosystem)
-- ============================================================================

-- 1. Skill Evidence (Multi-factor proof: self, resume, project, assessment, github)
CREATE TABLE IF NOT EXISTS skill_evidence (
    id             VARCHAR(36)  PRIMARY KEY,
    student_id     VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill_id       VARCHAR(36)  NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    source         VARCHAR(50)  NOT NULL CHECK (source IN ('self_declared', 'resume_evidence', 'project_evidence', 'assessment', 'github_evidence')),
    confidence     SMALLINT     NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
    metadata       JSONB        NOT NULL DEFAULT '{}',
    verified_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_skill_evidence_source UNIQUE (student_id, skill_id, source)
);

CREATE INDEX IF NOT EXISTS idx_se_student_skill ON skill_evidence(student_id, skill_id);

-- 2. Skill Assessments
CREATE TABLE IF NOT EXISTS skill_assessments (
    id             VARCHAR(36)  PRIMARY KEY,
    student_id     VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill_id       VARCHAR(36)  NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    score          SMALLINT     NOT NULL CHECK (score BETWEEN 0 AND 100),
    level          VARCHAR(50)  NOT NULL DEFAULT 'intermediate' CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    knowledge_score SMALLINT    NOT NULL DEFAULT 0,
    problem_solving_score SMALLINT NOT NULL DEFAULT 0,
    practical_score SMALLINT    NOT NULL DEFAULT 0,
    evaluation_summary TEXT     NULL,
    questions_data JSONB        NOT NULL DEFAULT '[]',
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sa_student_skill ON skill_assessments(student_id, skill_id);

-- 3. Student GitHub Profiles (Proof of Work)
CREATE TABLE IF NOT EXISTS student_github_profiles (
    id             VARCHAR(36)  PRIMARY KEY,
    student_id     VARCHAR(36)  NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    github_username VARCHAR(100) NOT NULL,
    public_repos_count INT      NOT NULL DEFAULT 0,
    languages      JSONB        NOT NULL DEFAULT '[]',
    detected_skills JSONB       NOT NULL DEFAULT '[]',
    top_repositories JSONB      NOT NULL DEFAULT '[]',
    analyzed_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_github_student ON student_github_profiles(student_id);

-- 4. AI Pre-screen Interview Sessions
CREATE TABLE IF NOT EXISTS ai_interview_sessions (
    id             VARCHAR(36)  PRIMARY KEY,
    student_id     VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    job_id         VARCHAR(36)  NULL REFERENCES jobs(id) ON DELETE SET NULL,
    target_role    VARCHAR(255) NOT NULL,
    technical_score SMALLINT    NOT NULL DEFAULT 0,
    problem_solving_score SMALLINT NOT NULL DEFAULT 0,
    communication_score SMALLINT NOT NULL DEFAULT 0,
    role_fit_score SMALLINT     NOT NULL DEFAULT 0,
    overall_score  SMALLINT     NOT NULL DEFAULT 0,
    strengths      JSONB        NOT NULL DEFAULT '[]',
    improvements   JSONB        NOT NULL DEFAULT '[]',
    transcript     JSONB        NOT NULL DEFAULT '[]',
    status         VARCHAR(50)  NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'reviewed')),
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_intv_student ON ai_interview_sessions(student_id);

-- 5. Public-safe Skill Passports
CREATE TABLE IF NOT EXISTS student_passports (
    public_token   VARCHAR(64)  PRIMARY KEY,
    student_id     VARCHAR(36)  NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    is_public      BOOLEAN      NOT NULL DEFAULT TRUE,
    view_count     INT          NOT NULL DEFAULT 0,
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_passports_student ON student_passports(student_id);
