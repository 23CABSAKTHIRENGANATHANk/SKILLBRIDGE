<?php
declare(strict_types=1);

/**
 * SkillBridge Database Integration Test Fixtures
 * 
 * Provides deterministic, isolated test fixtures for:
 * - Student A (std_alice) and Student B (std_bob)
 * - Recruiter A (rec_acme) and Recruiter B (rec_globex)
 * - Core skills (Python, React, TypeScript, PostgreSQL)
 * - Standard test companies, jobs, learning resources, and project blueprints
 * 
 * Enforces clean teardown and resets without touching development or production data.
 */

require_once __DIR__ . '/../../backend/config/database.php';
require_once __DIR__ . '/../../backend/config/DatabaseSafetyGuard.php';

class DatabaseTestFixtures {

    public const STUDENT_A_USER_ID = 'u_test_student_a';
    public const STUDENT_A_ID = 'std_test_alice';
    public const STUDENT_A_EMAIL = 'alice.testing@skillbridge.test';

    public const STUDENT_B_USER_ID = 'u_test_student_b';
    public const STUDENT_B_ID = 'std_test_bob';
    public const STUDENT_B_EMAIL = 'bob.testing@skillbridge.test';

    public const RECRUITER_A_USER_ID = 'u_test_recruiter_a';
    public const RECRUITER_A_ID = 'rec_test_acme';
    public const RECRUITER_A_EMAIL = 'recruiter.acme@skillbridge.test';
    public const COMPANY_A_ID = 'comp_test_acme';

    public const RECRUITER_B_USER_ID = 'u_test_recruiter_b';
    public const RECRUITER_B_ID = 'rec_test_globex';
    public const RECRUITER_B_EMAIL = 'recruiter.globex@skillbridge.test';
    public const COMPANY_B_ID = 'comp_test_globex';

    public const JOB_A1_ID = 'job_test_frontend';
    public const JOB_B1_ID = 'job_test_backend';

    public const SKILL_PYTHON_ID = 'sk_test_python';
    public const SKILL_REACT_ID = 'sk_test_react';
    public const SKILL_TYPESCRIPT_ID = 'sk_test_typescript';
    public const SKILL_POSTGRESQL_ID = 'sk_test_postgresql';

    public const RESOURCE_TS_ID = 'lr_test_ts_core';
    public const PROJECT_REACT_ID = 'pr_test_react_dash';

    /**
     * Purge all test fixture records cleanly from the isolated test database
     */
    public static function purge(?PDO $db = null): void {
        $db ??= Database::getConnection();
        DatabaseSafetyGuard::assertIsolatedTestDatabase($db);

        // Explicit cleanup of test entities
        $db->exec("DELETE FROM applications WHERE id LIKE '%test%'");
        $db->exec("DELETE FROM skill_integrity_audits WHERE id LIKE '%test%'");
        $db->exec("DELETE FROM skill_assessments WHERE id LIKE '%test%'");
        $db->exec("DELETE FROM student_project_progress WHERE project_id LIKE '%test%'");
        $db->exec("DELETE FROM student_learning_progress WHERE resource_id LIKE '%test%'");
        $db->exec("DELETE FROM project_recommendations WHERE id LIKE '%test%'");
        $db->exec("DELETE FROM learning_resources WHERE id LIKE '%test%'");
        $db->exec("DELETE FROM career_roadmaps WHERE id LIKE '%test%'");
        $db->exec("DELETE FROM career_readiness_snapshots WHERE student_id LIKE '%test%'");
        $db->exec("DELETE FROM career_goals WHERE id LIKE '%test%' OR student_id LIKE '%test%'");
        $db->exec("DELETE FROM jobs WHERE id LIKE '%test%'");

        // Clean specific test accounts (cascades to students, companies, tokens)
        $testUserIds = [self::STUDENT_A_USER_ID, self::STUDENT_B_USER_ID, self::RECRUITER_A_USER_ID, self::RECRUITER_B_USER_ID];
        $inUsers = "'" . implode("','", $testUserIds) . "'";
        $db->exec("DELETE FROM users WHERE id IN ({$inUsers})");
    }

    /**
     * Seed baseline test fixtures
     */
    public static function load(?PDO $db = null): void {
        $db ??= Database::getConnection();
        DatabaseSafetyGuard::assertIsolatedTestDatabase($db);
        self::purge($db);

        $pwdHash = password_hash('TestPass123!Secure', PASSWORD_BCRYPT);

        // 1. Seed or Resolve Core Skills
        $skills = [
            ['Python', 'python', 'programming_languages'],
            ['React', 'react', 'frontend_development'],
            ['TypeScript', 'typescript', 'programming_languages'],
            ['PostgreSQL', 'postgresql', 'database_technologies']
        ];
        $skillStmt = $db->prepare("
            INSERT INTO skills (id, name, normalized_name, category)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category
        ");
        foreach ($skills as $s) {
            $genId = 'sk_test_' . $s[1];
            $skillStmt->execute([$genId, $s[0], $s[1], $s[2]]);
        }

        // 2. Seed Student A (Alice)
        $db->prepare("
            INSERT INTO users (id, email, password_hash, role)
            VALUES (?, ?, ?, 'student')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::STUDENT_A_USER_ID, self::STUDENT_A_EMAIL, $pwdHash]);

        $db->prepare("
            INSERT INTO students (id, user_id, name, college, program, experience)
            VALUES (?, ?, 'Alice Test', 'Apex Engineering College', 'B.Tech Computer Science', '1-2 years')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::STUDENT_A_ID, self::STUDENT_A_USER_ID]);

        // 3. Seed Student B (Bob)
        $db->prepare("
            INSERT INTO users (id, email, password_hash, role)
            VALUES (?, ?, ?, 'student')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::STUDENT_B_USER_ID, self::STUDENT_B_EMAIL, $pwdHash]);

        $db->prepare("
            INSERT INTO students (id, user_id, name, college, program, experience)
            VALUES (?, ?, 'Bob Test', 'Metro Technical Institute', 'B.S. Information Technology', 'Fresher')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::STUDENT_B_ID, self::STUDENT_B_USER_ID]);

        // 4. Seed Recruiter A (Acme Corp)
        $db->prepare("
            INSERT INTO users (id, email, password_hash, role)
            VALUES (?, ?, ?, 'recruiter')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::RECRUITER_A_USER_ID, self::RECRUITER_A_EMAIL, $pwdHash]);

        $db->prepare("
            INSERT INTO companies (id, user_id, name, website, industry, about)
            VALUES (?, ?, 'Acme Innovations', 'https://acme.test', 'Technology', 'Leading software cloud solutions')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::COMPANY_A_ID, self::RECRUITER_A_USER_ID]);

        // 5. Seed Recruiter B (Globex Corp)
        $db->prepare("
            INSERT INTO users (id, email, password_hash, role)
            VALUES (?, ?, ?, 'recruiter')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::RECRUITER_B_USER_ID, self::RECRUITER_B_EMAIL, $pwdHash]);

        $db->prepare("
            INSERT INTO companies (id, user_id, name, website, industry, about)
            VALUES (?, ?, 'Globex Enterprise', 'https://globex.test', 'Enterprise Software', 'Global logistics platform')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::COMPANY_B_ID, self::RECRUITER_B_USER_ID]);

        // 6. Seed Job for Acme
        $db->prepare("
            INSERT INTO jobs (id, company_id, title, summary, description, location, type, salary_range, status)
            VALUES (?, ?, 'Junior Frontend Engineer', 'Build modern web applications', 'Build modern web applications using React & TypeScript', 'Remote', 'Full Time', '70000-95000', 'active')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::JOB_A1_ID, self::COMPANY_A_ID]);

        // 7. Seed Job for Globex
        $db->prepare("
            INSERT INTO jobs (id, company_id, title, summary, description, location, type, salary_range, status)
            VALUES (?, ?, 'Backend Systems Specialist', 'Design high-throughput APIs', 'Design high-throughput APIs and PostgreSQL databases', 'Remote', 'Full Time', '75000-100000', 'active')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::JOB_B1_ID, self::COMPANY_B_ID]);

        // 8. Seed Learning Resource for TypeScript
        $db->prepare("
            INSERT INTO learning_resources (id, skill, title, resource_type, provider, url, quality_score, status)
            VALUES (?, 'TypeScript', 'TypeScript: Production Engineering Masterclass', 'course', 'Official Docs', 'https://typescriptlang.org/handbook', 98, 'active')
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::RESOURCE_TS_ID]);

        // 9. Seed Project Recommendation for React
        $db->prepare("
            INSERT INTO project_recommendations (id, skill, title, description, difficulty, estimated_hours, tech_stack)
            VALUES (?, 'React', 'Enterprise Real-Time Analytics Dashboard', 'Build a reactive analytics portal with WebSocket feeds and Tailwind styling', 'intermediate', 24, ?)
            ON CONFLICT (id) DO NOTHING
        ")->execute([self::PROJECT_REACT_ID, json_encode(['React', 'TypeScript', 'Tailwind'])]);
    }
}
