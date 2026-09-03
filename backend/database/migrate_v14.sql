-- SkillBridge data provenance and staging hardening.

CREATE TABLE IF NOT EXISTS data_import_batches (
    id VARCHAR(96) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES data_source_registry(id),
    status VARCHAR(24) NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'validated', 'promoted', 'rejected')),
    dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    metrics JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS staging_taxonomy_records (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id VARCHAR(96) NOT NULL REFERENCES data_import_batches(id) ON DELETE CASCADE,
    source_id VARCHAR(64) NOT NULL REFERENCES data_source_registry(id),
    taxonomy_type VARCHAR(24) NOT NULL CHECK (taxonomy_type IN ('career', 'skill')),
    external_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    summary TEXT NULL,
    category VARCHAR(128) NULL,
    raw_payload JSONB NOT NULL DEFAULT '{}',
    validation_status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'rejected', 'promoted')),
    rejection_reason TEXT NULL,
    content_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (batch_id, source_id, taxonomy_type, external_id)
);
CREATE INDEX IF NOT EXISTS idx_staging_taxonomy_batch ON staging_taxonomy_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_staging_taxonomy_status ON staging_taxonomy_records(validation_status);

CREATE TABLE IF NOT EXISTS career_taxonomy (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES data_source_registry(id),
    external_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    summary TEXT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (source_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_career_taxonomy_active ON career_taxonomy(active);

CREATE TABLE IF NOT EXISTS staging_skill_dependencies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id VARCHAR(96) NOT NULL REFERENCES data_import_batches(id) ON DELETE CASCADE,
    source_id VARCHAR(64) NOT NULL REFERENCES data_source_registry(id),
    skill_external_id VARCHAR(255) NOT NULL,
    prerequisite_external_id VARCHAR(255) NOT NULL,
    relationship_type VARCHAR(32) NOT NULL DEFAULT 'prerequisite',
    raw_payload JSONB NOT NULL DEFAULT '{}',
    validation_status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'rejected', 'promoted')),
    rejection_reason TEXT NULL,
    content_hash VARCHAR(64) NOT NULL,
    UNIQUE (batch_id, source_id, skill_external_id, prerequisite_external_id)
);
CREATE INDEX IF NOT EXISTS idx_staging_skill_deps_batch ON staging_skill_dependencies(batch_id);

ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS source_id VARCHAR(64) REFERENCES data_source_registry(id);
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE project_recommendations ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE project_recommendations ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_id VARCHAR(64) REFERENCES data_source_registry(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_learning_resources_active_verified ON learning_resources(active, last_verified_at);
CREATE INDEX IF NOT EXISTS idx_project_recommendations_active ON project_recommendations(active);
CREATE INDEX IF NOT EXISTS idx_jobs_source_external ON jobs(source_id, external_id);
CREATE INDEX IF NOT EXISTS idx_jobs_active_verified ON jobs(active, last_verified_at);
