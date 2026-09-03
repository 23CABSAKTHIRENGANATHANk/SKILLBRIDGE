-- ============================================================
-- SkillBridge 2.0 - Phase 2 Additive Schema Migration (migrate_v9.sql)
-- Proof-of-Work Engine, Cryptographic Skill Credentials, Recruiter Shortlists
-- ============================================================

-- 1. Proof-of-Work Repositories
CREATE TABLE IF NOT EXISTS proof_of_work_repositories (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    repo_name VARCHAR(255) NOT NULL,
    repo_url VARCHAR(500) NOT NULL,
    primary_language VARCHAR(100) NULL,
    technologies JSONB NOT NULL DEFAULT '[]'::jsonb,
    activity_score SMALLINT NOT NULL DEFAULT 0,
    technology_score SMALLINT NOT NULL DEFAULT 0,
    documentation_score SMALLINT NOT NULL DEFAULT 0,
    complexity_score SMALLINT NOT NULL DEFAULT 0,
    overall_evidence_score SMALLINT NOT NULL DEFAULT 0,
    signals JSONB NOT NULL DEFAULT '{}'::jsonb,
    commit_count INT NOT NULL DEFAULT 0,
    last_commit_at TIMESTAMP WITH TIME ZONE NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pow_repo UNIQUE (student_id, repo_name)
);

CREATE INDEX IF NOT EXISTS idx_pow_student ON proof_of_work_repositories(student_id);
CREATE INDEX IF NOT EXISTS idx_pow_score ON proof_of_work_repositories(overall_evidence_score);

-- 2. Cryptographic Skill Credentials
CREATE TABLE IF NOT EXISTS skill_credentials (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    passport_token VARCHAR(64) NOT NULL UNIQUE,
    credential_version VARCHAR(16) NOT NULL DEFAULT '2.0',
    status VARCHAR(32) NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'REVOKED', 'EXPIRED')),
    credential_hash VARCHAR(128) NOT NULL,
    signature TEXT NOT NULL,
    algorithm VARCHAR(32) NOT NULL DEFAULT 'RS256',
    key_id VARCHAR(64) NOT NULL DEFAULT 'sb_k1',
    canonical_payload JSONB NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    revoked_at TIMESTAMP WITH TIME ZONE NULL,
    revoked_reason TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_sc_student ON skill_credentials(student_id);
CREATE INDEX IF NOT EXISTS idx_sc_token ON skill_credentials(passport_token);
CREATE INDEX IF NOT EXISTS idx_sc_status ON skill_credentials(status);

-- 3. Skill Credential Revocations Audit
CREATE TABLE IF NOT EXISTS skill_credential_revocations (
    id VARCHAR(64) PRIMARY KEY,
    credential_id VARCHAR(64) NOT NULL REFERENCES skill_credentials(id) ON DELETE CASCADE,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    revoked_by VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scr_credential ON skill_credential_revocations(credential_id);

-- 4. Recruiter Shortlists (Company-isolated talent bookmarking)
CREATE TABLE IF NOT EXISTS recruiter_shortlists (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL DEFAULT 'shortlisted',
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_company_student_shortlist UNIQUE (company_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_rs_company ON recruiter_shortlists(company_id);
CREATE INDEX IF NOT EXISTS idx_rs_student ON recruiter_shortlists(student_id);
