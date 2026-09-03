<?php
declare(strict_types=1);

/**
 * SkillBridge Database Safety Guard
 * 
 * Hard enforcement mechanism ensuring that database-mutating integration tests
 * ONLY execute against an isolated, verified PostgreSQL test database.
 * Never allows mutations against development, staging, or production databases.
 */
class DatabaseSafetyGuard {

    /**
     * Verify that the current environment and active database connection
     * belong strictly to an isolated test PostgreSQL database.
     * 
     * @param PDO|null $pdo Optional active PDO connection to verify server-side
     * @throws RuntimeException If any safety condition is not met
     */
    public static function assertIsolatedTestDatabase(?PDO $pdo = null): void {
        // 1. Enforce APP_ENV === 'testing'
        $appEnv = strtolower(getenv('APP_ENV') ?: ($_ENV['APP_ENV'] ?? ''));
        if ($appEnv !== 'testing') {
            throw new RuntimeException(
                "REFUSING DATABASE-MUTATING TEST: APP_ENV must be explicitly set to 'testing'. Current value: '{$appEnv}'."
            );
        }

        // 2. Enforce TEST_DATABASE_URL presence
        $testUrl = getenv('TEST_DATABASE_URL') ?: ($_ENV['TEST_DATABASE_URL'] ?? '');
        if (empty($testUrl)) {
            throw new RuntimeException(
                "REFUSING DATABASE-MUTATING TEST: TEST_DATABASE_URL is not configured. Automated mutating tests cannot proceed."
            );
        }

        // 3. Parse connection components
        $parsed = parse_url($testUrl);
        if ($parsed === false || empty($parsed['host'])) {
            throw new RuntimeException("REFUSING DATABASE-MUTATING TEST: TEST_DATABASE_URL is invalid or malformed.");
        }

        $host = strtolower((string)($parsed['host'] ?? ''));
        $dbname = strtolower(ltrim((string)($parsed['path'] ?? ''), '/'));

        // 4. Block known shared / cloud production host patterns
        $blockedHosts = [
            'neon.tech',
            'aws.neon.tech',
            'pooler.c-5',
            'supabase.co',
            'rds.amazonaws.com',
            'render.com',
            'elephantsql.com',
            'railway.app'
        ];
        foreach ($blockedHosts as $blocked) {
            if (str_contains($host, $blocked)) {
                throw new RuntimeException(
                    "REFUSING DATABASE-MUTATING TEST: TEST_DATABASE_URL points to a shared/cloud host ('{$host}'). Only dedicated local or containerized test databases are permitted."
                );
            }
        }

        // 5. Must be a recognized local or container test host
        $allowedHosts = ['127.0.0.1', 'localhost', '::1', 'postgres'];
        if (!in_array($host, $allowedHosts, true)) {
            throw new RuntimeException(
                "REFUSING DATABASE-MUTATING TEST: Host '{$host}' is not in allowed local/CI test hosts: " . implode(', ', $allowedHosts)
            );
        }

        // 6. Database name MUST explicitly contain 'test'
        if (!preg_match('/(^|[_-])test([_-]|$)/', $dbname)) {
            throw new RuntimeException(
                "REFUSING DATABASE-MUTATING TEST: Database name '{$dbname}' is not a dedicated test database (must contain 'test')."
            );
        }

        // 7. Verify active database name directly from PostgreSQL server if connection exists
        if ($pdo !== null) {
            $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
            if ($driver !== 'pgsql') {
                throw new RuntimeException(
                    "REFUSING DATABASE-MUTATING TEST: Expected pgsql driver, got '{$driver}'."
                );
            }

            $currentDb = strtolower((string)$pdo->query('SELECT current_database()')->fetchColumn());
            if (!preg_match('/(^|[_-])test([_-]|$)/', $currentDb)) {
                throw new RuntimeException(
                    "REFUSING DATABASE-MUTATING TEST: Active PostgreSQL database '{$currentDb}' does not match test naming convention."
                );
            }
        }
    }
}
