-- ============================================================
-- SkillBridge 3.0 — Migration v11
-- Student Career Evolution Engine & Knowledge Infrastructure
-- Production-safe: all statements use IF NOT EXISTS / DO blocks
-- ============================================================

-- 1. Career Goals
CREATE TABLE IF NOT EXISTS career_goals (
    id                    VARCHAR(64)  PRIMARY KEY,
    student_id            VARCHAR(64)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    target_role           VARCHAR(128) NOT NULL,
    target_industry       VARCHAR(128) NULL,
    preferred_location    VARCHAR(128) NULL,
    experience_level      VARCHAR(32)  NOT NULL DEFAULT 'entry',
    target_timeline_weeks SMALLINT     NOT NULL DEFAULT 16 CHECK (target_timeline_weeks BETWEEN 1 AND 260),
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_career_goal UNIQUE (student_id)
);
CREATE INDEX IF NOT EXISTS idx_career_goals_role ON career_goals(target_role);

-- 2. Career Roadmaps
CREATE TABLE IF NOT EXISTS career_roadmaps (
    id           VARCHAR(64)  PRIMARY KEY,
    student_id   VARCHAR(64)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    target_role  VARCHAR(128) NOT NULL,
    total_weeks  SMALLINT     NOT NULL DEFAULT 16,
    progress_pct SMALLINT     NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    status       VARCHAR(32)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_active_roadmap UNIQUE (student_id, target_role)
);
CREATE INDEX IF NOT EXISTS idx_career_roadmaps_student ON career_roadmaps(student_id);

-- 3. Career Roadmap Steps / Phases
CREATE TABLE IF NOT EXISTS career_roadmap_steps (
    id              VARCHAR(64)  PRIMARY KEY,
    roadmap_id      VARCHAR(64)  NOT NULL REFERENCES career_roadmaps(id) ON DELETE CASCADE,
    phase_number    SMALLINT     NOT NULL,
    title           VARCHAR(255) NOT NULL,
    skill_name      VARCHAR(128) NOT NULL,
    description     TEXT         NULL,
    resource_type   VARCHAR(32)  NOT NULL DEFAULT 'learn' CHECK (resource_type IN ('learn', 'practice', 'build', 'assess', 'verify')),
    estimated_hours SMALLINT     NOT NULL DEFAULT 10,
    is_completed    BOOLEAN      NOT NULL DEFAULT FALSE,
    completed_at    TIMESTAMP WITH TIME ZONE NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_roadmap_steps_roadmap ON career_roadmap_steps(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_steps_phase ON career_roadmap_steps(roadmap_id, phase_number);

-- 4. Skill Gap Analysis Cache / Snapshot
CREATE TABLE IF NOT EXISTS skill_gap_analysis (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id      VARCHAR(64)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    target_role     VARCHAR(128) NOT NULL,
    strong_skills   JSONB        NOT NULL DEFAULT '[]',
    gap_skills      JSONB        NOT NULL DEFAULT '[]',
    missing_skills  JSONB        NOT NULL DEFAULT '[]',
    readiness_score SMALLINT     NOT NULL DEFAULT 0 CHECK (readiness_score BETWEEN 0 AND 100),
    breakdown       JSONB        NOT NULL DEFAULT '{}',
    analyzed_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_role_gap UNIQUE (student_id, target_role)
);
CREATE INDEX IF NOT EXISTS idx_skill_gap_student ON skill_gap_analysis(student_id);

-- 5. Curated Learning Resources (Legitimate public courses, documentation, YouTube playlists)
CREATE TABLE IF NOT EXISTS learning_resources (
    id               VARCHAR(64)  PRIMARY KEY,
    skill            VARCHAR(128) NOT NULL,
    title            VARCHAR(255) NOT NULL,
    provider         VARCHAR(128) NOT NULL,
    resource_type    VARCHAR(32)  NOT NULL CHECK (resource_type IN ('course', 'video', 'playlist', 'documentation', 'article', 'practice')),
    level            VARCHAR(32)  NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    url              TEXT         NOT NULL,
    duration         VARCHAR(64)  NULL,
    is_free          BOOLEAN      NOT NULL DEFAULT TRUE,
    thumbnail_url    TEXT         NULL,
    relevance_reason TEXT         NULL,
    verified_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_learning_resources_skill ON learning_resources(skill);
CREATE INDEX IF NOT EXISTS idx_learning_resources_type ON learning_resources(resource_type);

-- 6. Student Learning Progress
CREATE TABLE IF NOT EXISTS student_learning_progress (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id   VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    resource_id  VARCHAR(64) NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
    status       VARCHAR(32) NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed')),
    started_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT uq_student_resource_progress UNIQUE (student_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_learning_progress(student_id);

-- 7. Weekly Career Plans
CREATE TABLE IF NOT EXISTS weekly_career_plans (
    id              VARCHAR(64) PRIMARY KEY,
    student_id      VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    week_start_date DATE        NOT NULL,
    target_hours    SMALLINT    NOT NULL DEFAULT 10,
    completed_hours SMALLINT    NOT NULL DEFAULT 0,
    status          VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_week UNIQUE (student_id, week_start_date)
);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_student ON weekly_career_plans(student_id);

-- 8. Career Plan Tasks (Monday to Sunday)
CREATE TABLE IF NOT EXISTS career_plan_tasks (
    id               VARCHAR(64)  PRIMARY KEY,
    plan_id          VARCHAR(64)  NOT NULL REFERENCES weekly_career_plans(id) ON DELETE CASCADE,
    day_of_week      VARCHAR(16)  NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    title            VARCHAR(255) NOT NULL,
    task_type        VARCHAR(32)  NOT NULL DEFAULT 'learn' CHECK (task_type IN ('learn', 'practice', 'video', 'project', 'assess', 'github', 'review')),
    duration_minutes SMALLINT     NOT NULL DEFAULT 45,
    skill            VARCHAR(128) NULL,
    is_completed     BOOLEAN      NOT NULL DEFAULT FALSE,
    completed_at     TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan ON career_plan_tasks(plan_id);

-- 9. Knowledge Evolution Events (Ledger of real verified achievements)
CREATE TABLE IF NOT EXISTS knowledge_evolution_events (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id  VARCHAR(64)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    event_type  VARCHAR(32)  NOT NULL CHECK (event_type IN ('skill_learned', 'assessment_passed', 'skill_verified', 'project_added', 'github_analyzed', 'interview_completed', 'job_applied', 'passport_issued')),
    title       VARCHAR(255) NOT NULL,
    description TEXT         NULL,
    metadata    JSONB        NOT NULL DEFAULT '{}',
    event_date  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evolution_student ON knowledge_evolution_events(student_id);
CREATE INDEX IF NOT EXISTS idx_evolution_date ON knowledge_evolution_events(event_date DESC);

-- 10. Skill Dependencies (Prerequisite Topology Map)
CREATE TABLE IF NOT EXISTS skill_dependencies (
    id                   VARCHAR(64) PRIMARY KEY,
    skill_name           VARCHAR(128) NOT NULL,
    prerequisite_name    VARCHAR(128) NOT NULL,
    relationship_type    VARCHAR(32)  NOT NULL DEFAULT 'prerequisite' CHECK (relationship_type IN ('prerequisite', 'enhances', 'specialization')),
    CONSTRAINT uq_skill_dependency UNIQUE (skill_name, prerequisite_name)
);
CREATE INDEX IF NOT EXISTS idx_skill_deps_skill ON skill_dependencies(skill_name);

-- 11. Student Achievements
CREATE TABLE IF NOT EXISTS student_achievements (
    id          VARCHAR(64)  PRIMARY KEY,
    student_id  VARCHAR(64)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    badge_key   VARCHAR(64)  NOT NULL,
    title       VARCHAR(128) NOT NULL,
    description TEXT         NOT NULL,
    icon        VARCHAR(64)  NOT NULL DEFAULT 'Award',
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_badge UNIQUE (student_id, badge_key)
);
CREATE INDEX IF NOT EXISTS idx_achievements_student ON student_achievements(student_id);

-- 12. Seed Real, Publicly Available Learning Resources (Documentation, Reputable Courses, YouTube)
INSERT INTO learning_resources (id, skill, title, provider, resource_type, level, url, duration, is_free, relevance_reason)
VALUES
    -- TypeScript
    ('res_ts_01', 'TypeScript', 'TypeScript Handbook & Official Documentation', 'TypeScript Team', 'documentation', 'beginner', 'https://www.typescriptlang.org/docs/handbook/intro.html', 'Self-paced', true, 'The authoritative reference for TypeScript types, interfaces, generics, and compiler options.'),
    ('res_ts_02', 'TypeScript', 'TypeScript Full Course for Beginners', 'freeCodeCamp', 'video', 'beginner', 'https://www.youtube.com/watch?v=BwuLxPH8IDs', '3h 30m', true, 'Comprehensive walk-through of TypeScript fundamentals from JavaScript basics to type narrowing.'),
    ('res_ts_03', 'TypeScript', 'Understanding TypeScript - 2026 Edition', 'Coursera', 'course', 'intermediate', 'https://www.coursera.org/learn/typescript', '12 hours', true, 'Deep dive into advanced types, decoraters, namespaces, and React + Node.js integration.'),
    -- React
    ('res_react_01', 'React', 'React Official Documentation (react.dev)', 'Meta / React Team', 'documentation', 'beginner', 'https://react.dev/learn', 'Self-paced', true, 'Modern hook-based React fundamentals with interactive sandbox exercises.'),
    ('res_react_02', 'React', 'React Course - Beginner to Full Stack', 'freeCodeCamp', 'video', 'intermediate', 'https://www.youtube.com/watch?v=bMknfKXIFA8', '11h 50m', true, 'Full-scale project tutorial building component architecture and custom hooks.'),
    -- Node.js
    ('res_node_01', 'Node.js', 'Node.js Documentation & Guides', 'OpenJS Foundation', 'documentation', 'beginner', 'https://nodejs.org/en/docs/guides', 'Self-paced', true, 'Official architecture guides for the Node.js event loop, streams, and async APIs.'),
    ('res_node_02', 'Node.js', 'Node.js and Express.js Full Course', 'freeCodeCamp', 'video', 'intermediate', 'https://www.youtube.com/watch?v=Oe421EPjeBE', '8h 15m', true, 'Build production RESTful APIs with Express, routing, middleware, and JWT authentication.'),
    -- PostgreSQL
    ('res_pg_01', 'PostgreSQL', 'PostgreSQL Official Tutorial', 'The PostgreSQL Global Development Group', 'documentation', 'beginner', 'https://www.postgresql.org/docs/current/tutorial.html', 'Self-paced', true, 'Core relational concepts, indexing, transactions, window functions, and JSONB queries.'),
    ('res_pg_02', 'PostgreSQL', 'PostgreSQL Database Course', 'freeCodeCamp', 'video', 'intermediate', 'https://www.youtube.com/watch?v=qw--VYLpxG4', '4h 20m', true, 'Schema design, relations, joins, foreign keys, and optimization best practices.'),
    -- Docker
    ('res_docker_01', 'Docker', 'Docker Get Started Official Guide', 'Docker Inc.', 'documentation', 'beginner', 'https://docs.docker.com/get-started/', 'Self-paced', true, 'Containerization fundamentals, Dockerfiles, volume mounts, and multi-container Docker Compose.'),
    ('res_docker_02', 'Docker', 'Docker Tutorial for Beginners', 'Programming with Mosh', 'video', 'beginner', 'https://www.youtube.com/watch?v=pTFZFxd4hOI', '1h 10m', true, 'Practical container creation and deployment workflows for web developers.'),
    -- Python
    ('res_py_01', 'Python', 'Python.org Official Tutorial', 'Python Software Foundation', 'documentation', 'beginner', 'https://docs.python.org/3/tutorial/', 'Self-paced', true, 'Official language reference covering data structures, modules, OOP, and standard libraries.'),
    ('res_py_02', 'Python', 'Python for Beginners - Full Course', 'freeCodeCamp', 'video', 'beginner', 'https://www.youtube.com/watch?v=rfscVS0vtbw', '4h 30m', true, 'Core programming constructs, functions, file handling, and algorithmic problem solving.'),
    -- Cloud & AWS
    ('res_aws_01', 'AWS', 'AWS Fundamentals & Cloud Practitioner Guides', 'Amazon Web Services', 'documentation', 'beginner', 'https://aws.amazon.com/getting-started/', 'Self-paced', true, 'Core compute, storage, VPC networking, and security concepts in modern cloud deployments.'),
    ('res_aws_02', 'AWS', 'AWS Certified Cloud Practitioner Training', 'freeCodeCamp', 'video', 'beginner', 'https://www.youtube.com/watch?v=SOTamWNgDKc', '13h 40m', true, 'Comprehensive cloud foundations covering EC2, S3, RDS, Lambda, and IAM security.'),
    -- System Design
    ('res_sd_01', 'System Design', 'System Design Primer', 'Donne Martin (Open Source)', 'article', 'intermediate', 'https://github.com/donnemartin/system-design-primer', 'Self-paced', true, 'Industry standard guide to designing scalable, reliable systems (caching, load balancing, sharding).'),
    ('res_sd_02', 'System Design', 'System Design for Beginners Course', 'freeCodeCamp', 'video', 'intermediate', 'https://www.youtube.com/watch?v=m8Icp_Cid5o', '2h 10m', true, 'Architecting scalable web applications from monolithic to distributed microservices.')
ON CONFLICT (id) DO NOTHING;

-- 13. Seed Skill Dependencies Topology (Directed Graph)
INSERT INTO skill_dependencies (id, skill_name, prerequisite_name, relationship_type)
VALUES
    ('dep_01', 'TypeScript', 'JavaScript', 'prerequisite'),
    ('dep_02', 'React', 'JavaScript', 'prerequisite'),
    ('dep_03', 'Next.js', 'React', 'prerequisite'),
    ('dep_04', 'Next.js', 'TypeScript', 'enhances'),
    ('dep_05', 'Node.js', 'JavaScript', 'prerequisite'),
    ('dep_06', 'Express', 'Node.js', 'prerequisite'),
    ('dep_07', 'PostgreSQL', 'SQL', 'specialization'),
    ('dep_08', 'Docker', 'Linux', 'enhances'),
    ('dep_09', 'Kubernetes', 'Docker', 'prerequisite'),
    ('dep_10', 'Full Stack', 'React', 'prerequisite'),
    ('dep_11', 'Full Stack', 'Node.js', 'prerequisite'),
    ('dep_12', 'Full Stack', 'PostgreSQL', 'prerequisite'),
    ('dep_13', 'Machine Learning', 'Python', 'prerequisite'),
    ('dep_14', 'Deep Learning', 'Machine Learning', 'prerequisite'),
    ('dep_15', 'Cloud Architecture', 'Linux', 'prerequisite'),
    ('dep_16', 'Cloud Architecture', 'Docker', 'enhances')
ON CONFLICT (id) DO NOTHING;
