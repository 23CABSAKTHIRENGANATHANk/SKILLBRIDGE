-- SkillBridge 2.0 workflow integrity
-- Only one scheduled/rescheduled interview may exist for an application.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_interview_application
    ON interviews (application_id)
    WHERE status IN ('scheduled', 'rescheduled');
