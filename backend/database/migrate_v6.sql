-- SkillBridge Migration v6

ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS location VARCHAR(255) NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(4) NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS career_interests TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_skill_evidence_student ON skill_evidence(student_id);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_skill ON skill_evidence(skill_id);
CREATE INDEX IF NOT EXISTS idx_assessments_student ON skill_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_github_student ON student_github_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_interviews_student ON ai_interview_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_student ON student_projects(student_id);
CREATE INDEX IF NOT EXISTS idx_certs_student ON student_certificates(student_id);