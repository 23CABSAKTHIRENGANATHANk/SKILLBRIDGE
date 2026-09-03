-- ============================================================
-- SkillBridge 3.0 — Migration v12
-- Data Acquisition Infrastructure, Staging & Recommendation Engine
-- Production-safe: all statements use IF NOT EXISTS / DO blocks
-- ============================================================

-- 1. Data Source Registry
CREATE TABLE IF NOT EXISTS data_source_registry (
    id                VARCHAR(64)  PRIMARY KEY,
    source_name       VARCHAR(128) NOT NULL UNIQUE,
    source_type       VARCHAR(64)  NOT NULL CHECK (source_type IN ('open_api', 'public_feed', 'open_dataset', 'official_docs', 'manual_import')),
    source_url        TEXT         NOT NULL,
    license           VARCHAR(128) NOT NULL,
    terms_checked     BOOLEAN      NOT NULL DEFAULT TRUE,
    collection_method VARCHAR(64)  NOT NULL CHECK (collection_method IN ('json_api', 'http_get', 'rss_feed', 'csv_import', 'static_curated')),
    last_collected_at TIMESTAMP WITH TIME ZONE NULL,
    last_verified_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refresh_frequency VARCHAR(64)  NOT NULL DEFAULT 'weekly' CHECK (refresh_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'static')),
    status            VARCHAR(32)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deprecated')),
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ds_registry_type ON data_source_registry(source_type);
CREATE INDEX IF NOT EXISTS idx_ds_registry_status ON data_source_registry(status);

-- 2. Project Recommendations ("Build This Next")
CREATE TABLE IF NOT EXISTS project_recommendations (
    id                 VARCHAR(64)  PRIMARY KEY,
    skill              VARCHAR(128) NOT NULL,
    title              VARCHAR(255) NOT NULL,
    description        TEXT         NOT NULL,
    deliverables       JSONB        NOT NULL DEFAULT '[]',
    tech_stack         JSONB        NOT NULL DEFAULT '[]',
    difficulty         VARCHAR(32)  NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    repo_template_url  TEXT         NULL,
    estimated_hours    SMALLINT     NOT NULL DEFAULT 20,
    source_id          VARCHAR(64)  NULL REFERENCES data_source_registry(id) ON DELETE SET NULL,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_skill_title UNIQUE (skill, title)
);
CREATE INDEX IF NOT EXISTS idx_projects_skill ON project_recommendations(skill);
CREATE INDEX IF NOT EXISTS idx_projects_difficulty ON project_recommendations(difficulty);

-- 3. Staging Table: Learning Resources
CREATE TABLE IF NOT EXISTS staging_learning_resources (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id          VARCHAR(64)  NOT NULL,
    source_id         VARCHAR(64)  NOT NULL,
    skill             VARCHAR(128) NOT NULL,
    title             VARCHAR(255) NOT NULL,
    provider          VARCHAR(128) NOT NULL,
    resource_type     VARCHAR(32)  NOT NULL,
    level             VARCHAR(32)  NOT NULL DEFAULT 'beginner',
    url               TEXT         NOT NULL,
    duration          VARCHAR(64)  NULL,
    is_free           BOOLEAN      NOT NULL DEFAULT TRUE,
    relevance_reason  TEXT         NULL,
    raw_payload       JSONB        NOT NULL DEFAULT '{}',
    validation_status VARCHAR(32)  NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'rejected', 'promoted')),
    rejection_reason  TEXT         NULL,
    content_hash      VARCHAR(64)  NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staging_lr_batch ON staging_learning_resources(batch_id);
CREATE INDEX IF NOT EXISTS idx_staging_lr_status ON staging_learning_resources(validation_status);
CREATE INDEX IF NOT EXISTS idx_staging_lr_hash ON staging_learning_resources(content_hash);

-- 4. Staging Table: Jobs
CREATE TABLE IF NOT EXISTS staging_jobs (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id          VARCHAR(64)  NOT NULL,
    source_id         VARCHAR(64)  NOT NULL,
    external_id       VARCHAR(255) NULL,
    title             VARCHAR(255) NOT NULL,
    company_name      VARCHAR(255) NOT NULL,
    location          VARCHAR(255) NOT NULL DEFAULT 'Remote',
    type              VARCHAR(64)  NOT NULL DEFAULT 'Full-time',
    salary_range      VARCHAR(128) NULL,
    url               TEXT         NULL,
    skills            JSONB        NOT NULL DEFAULT '[]',
    raw_payload       JSONB        NOT NULL DEFAULT '{}',
    validation_status VARCHAR(32)  NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'rejected', 'promoted')),
    rejection_reason  TEXT         NULL,
    content_hash      VARCHAR(64)  NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staging_jobs_batch ON staging_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_staging_jobs_status ON staging_jobs(validation_status);
CREATE INDEX IF NOT EXISTS idx_staging_jobs_hash ON staging_jobs(content_hash);

-- 5. Staging Table: Project Recommendations
CREATE TABLE IF NOT EXISTS staging_projects (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id          VARCHAR(64)  NOT NULL,
    source_id         VARCHAR(64)  NOT NULL,
    skill             VARCHAR(128) NOT NULL,
    title             VARCHAR(255) NOT NULL,
    description       TEXT         NOT NULL,
    deliverables      JSONB        NOT NULL DEFAULT '[]',
    tech_stack        JSONB        NOT NULL DEFAULT '[]',
    difficulty        VARCHAR(32)  NOT NULL DEFAULT 'intermediate',
    repo_template_url TEXT         NULL,
    estimated_hours   SMALLINT     NOT NULL DEFAULT 20,
    validation_status VARCHAR(32)  NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'rejected', 'promoted')),
    rejection_reason  TEXT         NULL,
    content_hash      VARCHAR(64)  NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staging_proj_batch ON staging_projects(batch_id);
CREATE INDEX IF NOT EXISTS idx_staging_proj_status ON staging_projects(validation_status);
CREATE INDEX IF NOT EXISTS idx_staging_proj_hash ON staging_projects(content_hash);
