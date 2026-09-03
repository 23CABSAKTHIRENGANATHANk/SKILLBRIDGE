-- SkillBridge 2.0 Phase 1 hardening (additive)
-- Enforce one active verification attempt per student and skill.

CREATE UNIQUE INDEX IF NOT EXISTS uq_sva_one_active_per_skill
    ON skill_verification_attempts(student_id, skill_id)
    WHERE status = 'in_progress';
