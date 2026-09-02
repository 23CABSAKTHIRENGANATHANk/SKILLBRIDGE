-- ========================================================================
-- SkillBridge Enterprise PostgreSQL Database Schema
-- Compatible with PostgreSQL 16+
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. Users Table (Core Auth with Role-Based Access)
-- ------------------------------------------------------------------------
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'recruiter', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_role ON users(role);

-- ------------------------------------------------------------------------
-- 2. Refresh Tokens Table (Server-side Session / Invalidation)
-- ------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_token_lookup ON refresh_tokens(token_hash, expires_at);

-- ------------------------------------------------------------------------
-- 3. Master Skills Dictionary (Normalized Catalog)
-- ------------------------------------------------------------------------
CREATE TABLE skills (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    normalized_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skill_normalized ON skills(normalized_name);

-- ------------------------------------------------------------------------
-- 4. Companies Table (With Geocoded Coordinates & Status)
-- ------------------------------------------------------------------------
CREATE TABLE companies (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500) NULL,
    industry VARCHAR(150) NOT NULL,
    website VARCHAR(255) NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    about TEXT NULL,
    address VARCHAR(500) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(20) NULL,
    country VARCHAR(100) DEFAULT 'India',
    latitude NUMERIC(10, 7) NULL,
    longitude NUMERIC(10, 7) NULL,
    geocoding_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (geocoding_status IN ('pending', 'success', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_company_name ON companies(name);
CREATE INDEX idx_company_city ON companies(city);
CREATE INDEX idx_company_verified ON companies(verified);
CREATE INDEX idx_company_geo ON companies(latitude, longitude);

-- ------------------------------------------------------------------------
-- 5. Students Profile Table
-- ------------------------------------------------------------------------
CREATE TABLE students (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500) NULL,
    college VARCHAR(255) NOT NULL,
    program VARCHAR(100) NOT NULL,
    experience VARCHAR(100) DEFAULT 'Fresher',
    resume_storage_key VARCHAR(500) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_college ON students(college);

-- ------------------------------------------------------------------------
-- 6. Student Skills Table (Linked to Master Skills)
-- ------------------------------------------------------------------------
CREATE TABLE student_skills (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill_id VARCHAR(36) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency VARCHAR(50) DEFAULT 'intermediate' CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_skill UNIQUE (student_id, skill_id)
);

-- ------------------------------------------------------------------------
-- 7. Jobs Table
-- ------------------------------------------------------------------------
CREATE TABLE jobs (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NULL,
    location VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Full Time' CHECK (type IN ('Full Time', 'Internship', 'Part Time', 'Contract')),
    salary_range VARCHAR(100) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_title ON jobs(title);
CREATE INDEX idx_job_location ON jobs(location);
CREATE INDEX idx_job_type ON jobs(type);
CREATE INDEX idx_job_status ON jobs(status);

-- ------------------------------------------------------------------------
-- 8. Job Required Skills Table (Linked to Master Skills)
-- ------------------------------------------------------------------------
CREATE TABLE job_skills (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id VARCHAR(36) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id VARCHAR(36) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_job_skill UNIQUE (job_id, skill_id)
);

-- ------------------------------------------------------------------------
-- 9. Applications Pipeline Table
-- ------------------------------------------------------------------------
CREATE TABLE applications (
    id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL DEFAULT 'applied' CHECK (stage IN ('applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected')),
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_job_student_app UNIQUE (job_id, student_id)
);

CREATE INDEX idx_app_stage ON applications(stage);
CREATE INDEX idx_app_created ON applications(created_at);

-- ------------------------------------------------------------------------
-- 10. Interviews Table
-- ------------------------------------------------------------------------
CREATE TABLE interviews (
    id VARCHAR(36) PRIMARY KEY,
    application_id VARCHAR(36) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_link VARCHAR(500) NULL,
    notes TEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interview_time ON interviews(scheduled_at);

-- ------------------------------------------------------------------------
-- 11. Notifications Table
-- ------------------------------------------------------------------------
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notif_user ON notifications(user_id, is_read);
