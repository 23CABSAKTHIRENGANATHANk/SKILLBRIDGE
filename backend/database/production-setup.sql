-- ========================================================================
-- SkillBridge PostgreSQL Production Database & Least-Privilege User Setup
-- Compatible with PostgreSQL 16+
-- ========================================================================

-- 1. Create dedicated production database (Run as postgres superuser)
-- Note: Run in psql: CREATE DATABASE skillbridge WITH ENCODING 'UTF8';

-- 2. Create least-privilege production application user
-- Replace 'REPLACE_WITH_A_SECURE_RANDOM_PASSWORD' with a secure secret in production
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE rolname = 'skillbridge_app') THEN
      CREATE ROLE skillbridge_app WITH LOGIN PASSWORD 'REPLACE_WITH_A_SECURE_RANDOM_PASSWORD';
   END IF;
END
$do$;

-- 3. Grant Connection Privileges on Database
GRANT CONNECT ON DATABASE skillbridge TO skillbridge_app;

-- 4. Connect to skillbridge database and grant Schema & CRUD Privileges
\connect skillbridge

GRANT USAGE ON SCHEMA public TO skillbridge_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO skillbridge_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO skillbridge_app;

-- 5. Set Default Privileges for Future Tables & Sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO skillbridge_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO skillbridge_app;

-- 6. Verification
SELECT table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'skillbridge_app';
