-- ============================================================================
-- SkillBridge Production Schema — v3 Migration
-- Adds dedicated student_projects and student_certificates tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_projects (
    id             VARCHAR(36)  PRIMARY KEY,
    student_id     VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title          VARCHAR(255) NOT NULL,
    description    TEXT         NULL,
    tech_stack     VARCHAR(255) NULL,
    project_url    VARCHAR(500) NULL,
    github_url     VARCHAR(500) NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sp_student_id ON student_projects(student_id);

CREATE TABLE IF NOT EXISTS student_certificates (
    id             VARCHAR(36)  PRIMARY KEY,
    student_id     VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title          VARCHAR(255) NOT NULL,
    issuer         VARCHAR(255) NOT NULL,
    issue_date     VARCHAR(50)  NULL,
    credential_url VARCHAR(500) NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sc_student_id ON student_certificates(student_id);
