-- ============================================================
-- SkillBridge 3.0 — Migration v13
-- Career Intelligence Graph & Scalable Recommendation Infrastructure
-- Production-safe: all statements use IF NOT EXISTS / DO blocks
-- ============================================================

-- 1. Careers Table (100+ Technology Career Pathways)
CREATE TABLE IF NOT EXISTS careers (
    id                   VARCHAR(64)  PRIMARY KEY,
    title                VARCHAR(128) NOT NULL UNIQUE,
    normalized_slug      VARCHAR(128) NOT NULL UNIQUE,
    description          TEXT         NOT NULL,
    domain               VARCHAR(64)  NOT NULL,
    required_skills      JSONB        NOT NULL DEFAULT '[]',
    preferred_skills     JSONB        NOT NULL DEFAULT '[]',
    entry_level_skills   JSONB        NOT NULL DEFAULT '[]',
    intermediate_skills  JSONB        NOT NULL DEFAULT '[]',
    advanced_skills      JSONB        NOT NULL DEFAULT '[]',
    typical_experience   VARCHAR(64)  NOT NULL DEFAULT '0-2 years',
    related_careers      JSONB        NOT NULL DEFAULT '[]',
    career_progression   JSONB        NOT NULL DEFAULT '[]',
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_careers_domain ON careers(domain);
CREATE INDEX IF NOT EXISTS idx_careers_slug ON careers(normalized_slug);

-- 2. Extend Skills Table with Ontology Fields
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'slug') THEN
        ALTER TABLE skills ADD COLUMN slug VARCHAR(128) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'description') THEN
        ALTER TABLE skills ADD COLUMN description TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'difficulty') THEN
        ALTER TABLE skills ADD COLUMN difficulty VARCHAR(32) NOT NULL DEFAULT 'intermediate';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'aliases') THEN
        ALTER TABLE skills ADD COLUMN aliases JSONB NOT NULL DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'prerequisites') THEN
        ALTER TABLE skills ADD COLUMN prerequisites JSONB NOT NULL DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'related_skills') THEN
        ALTER TABLE skills ADD COLUMN related_skills JSONB NOT NULL DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'applicable_careers') THEN
        ALTER TABLE skills ADD COLUMN applicable_careers JSONB NOT NULL DEFAULT '[]';
    END IF;
END $$;

-- 3. Extend Skill Dependencies Table with Strength & Provenance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skill_dependencies' AND column_name = 'strength') THEN
        ALTER TABLE skill_dependencies ADD COLUMN strength NUMERIC(3,2) NOT NULL DEFAULT 1.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skill_dependencies' AND column_name = 'source') THEN
        ALTER TABLE skill_dependencies ADD COLUMN source VARCHAR(128) NOT NULL DEFAULT 'ESCO/O*NET';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skill_dependencies' AND column_name = 'confidence') THEN
        ALTER TABLE skill_dependencies ADD COLUMN confidence NUMERIC(3,2) NOT NULL DEFAULT 0.95;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skill_dependencies' AND column_name = 'created_at') THEN
        ALTER TABLE skill_dependencies ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 4. Extend Learning Resources Table with Video & Governance Metadata
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_resources' AND column_name = 'video_id') THEN
        ALTER TABLE learning_resources ADD COLUMN video_id VARCHAR(64) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_resources' AND column_name = 'channel') THEN
        ALTER TABLE learning_resources ADD COLUMN channel VARCHAR(128) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_resources' AND column_name = 'language') THEN
        ALTER TABLE learning_resources ADD COLUMN language VARCHAR(32) NOT NULL DEFAULT 'English';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_resources' AND column_name = 'quality_score') THEN
        ALTER TABLE learning_resources ADD COLUMN quality_score SMALLINT NOT NULL DEFAULT 90;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_resources' AND column_name = 'source_id') THEN
        ALTER TABLE learning_resources ADD COLUMN source_id VARCHAR(64) NULL REFERENCES data_source_registry(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_resources' AND column_name = 'status') THEN
        ALTER TABLE learning_resources ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_resources' AND column_name = 'last_verified_at') THEN
        ALTER TABLE learning_resources ADD COLUMN last_verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 5. Extend Project Recommendations with Acceptance Criteria & Portfolio Value
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_recommendations' AND column_name = 'skills_to_gain') THEN
        ALTER TABLE project_recommendations ADD COLUMN skills_to_gain JSONB NOT NULL DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_recommendations' AND column_name = 'prerequisites') THEN
        ALTER TABLE project_recommendations ADD COLUMN prerequisites JSONB NOT NULL DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_recommendations' AND column_name = 'acceptance_criteria') THEN
        ALTER TABLE project_recommendations ADD COLUMN acceptance_criteria JSONB NOT NULL DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_recommendations' AND column_name = 'portfolio_value') THEN
        ALTER TABLE project_recommendations ADD COLUMN portfolio_value VARCHAR(32) NOT NULL DEFAULT 'high';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_recommendations' AND column_name = 'active_status') THEN
        ALTER TABLE project_recommendations ADD COLUMN active_status VARCHAR(32) NOT NULL DEFAULT 'active';
    END IF;
END $$;

-- 6. Performance Composite Indexes