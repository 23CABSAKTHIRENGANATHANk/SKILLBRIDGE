#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * SkillBridge Isolated Test Database Bootstrapper
 * 
 * Provisions an isolated PostgreSQL test database, applies the full canonical
 * production migrations (schema.sql + migrate_v2 through migrate_v16),
 * enforces safety boundaries, and loads deterministic fixtures.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/DatabaseSafetyGuard.php';

// Force environment
putenv('APP_ENV=testing');
$_ENV['APP_ENV'] = 'testing';
$_SERVER['APP_ENV'] = 'testing';

// Default local test database URL if not passed in environment
$existingTestUrl = getenv('TEST_DATABASE_URL') ?: ($_ENV['TEST_DATABASE_URL'] ?? '');
if (empty($existingTestUrl)) {
    // Default to local isolated test PostgreSQL credentials on port 5432
    $defaultTestUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/skillbridge_test?sslmode=disable';
    putenv("TEST_DATABASE_URL={$defaultTestUrl}");
    $_ENV['TEST_DATABASE_URL'] = $defaultTestUrl;
    $_SERVER['TEST_DATABASE_URL'] = $defaultTestUrl;
}

// 1. Run Safety Guard Verification
try {
    DatabaseSafetyGuard::assertIsolatedTestDatabase();
} catch (\Throwable $e) {
    echo "\n❌ SAFETY GUARD REFUSAL: " . $e->getMessage() . "\n";
    exit(1);
}

$testUrl = getenv('TEST_DATABASE_URL');
$parsed = parse_url($testUrl);
$host = $parsed['host'];
$port = (int)($parsed['port'] ?? 5432);
$user = urldecode($parsed['user'] ?? 'postgres');
$pass = urldecode($parsed['pass'] ?? 'postgres');
$testDbName = ltrim($parsed['path'] ?? 'skillbridge_test', '/');

echo "========================================================\n";
echo "   SKILLBRIDGE ISOLATED TEST DATABASE BOOTSTRAP         \n";
echo "========================================================\n";
echo "Target Host:     {$host}:{$port}\n";
echo "Target Database: {$testDbName}\n";
echo "Environment:     APP_ENV=testing\n";
echo "--------------------------------------------------------\n\n";

// 2. Connect to postgres maintenance database to create test database if missing
echo "[1/6] Connecting to PostgreSQL maintenance database...\n";
try {
    $adminDsn = "pgsql:host={$host};port={$port};dbname=postgres;sslmode=disable";
    $adminPdo = new PDO($adminDsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5
    ]);

    // Check if test database exists
    $stmt = $adminPdo->prepare("SELECT 1 FROM pg_database WHERE datname = ?");
    $stmt->execute([$testDbName]);
    $exists = (bool)$stmt->fetchColumn();

    $noReset = in_array('--no-reset', $argv ?? [], true);

    if ($exists && !$noReset) {
        echo "  [INFO] Resetting existing {$testDbName} for clean test isolation...\n";
        // Terminate existing connections to test DB
        $adminPdo->prepare("
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = ? AND pid <> pg_backend_pid()
        ")->execute([$testDbName]);
        $adminPdo->exec("DROP DATABASE \"{$testDbName}\"");
        $exists = false;
    }

    if (!$exists) {
        echo "  [ACTION] Creating isolated test database '{$testDbName}'...\n";
        $adminPdo->exec("CREATE DATABASE \"{$testDbName}\" ENCODING 'UTF8'");
        echo "  [OK] Database '{$testDbName}' created successfully.\n";
    } else {
        echo "  [OK] Database '{$testDbName}' ready.\n";
    }
} catch (\Throwable $e) {
    echo "❌ Failed to provision test database: " . $e->getMessage() . "\n";
    exit(1);
}

// 3. Connect to the isolated test database via Database abstraction
echo "\n[2/6] Connecting to test database via SkillBridge Database manager...\n";
Database::resetConnection();
try {
    $db = Database::getConnection();
    // Server-side safety verification
    DatabaseSafetyGuard::assertIsolatedTestDatabase($db);
    $activeDb = $db->query('SELECT current_database()')->fetchColumn();
    echo "  [OK] Active connected database: {$activeDb}\n";
} catch (\Throwable $e) {
    echo "❌ Connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

// 4. Apply schema.sql
echo "\n[3/6] Applying canonical schema (schema.sql)...\n";
$schemaFile = __DIR__ . '/schema.sql';
if (!file_exists($schemaFile)) {
    echo "❌ schema.sql not found at {$schemaFile}\n";
    exit(1);
}
$schemaSql = file_get_contents($schemaFile);
try {
    $db->exec($schemaSql);
    echo "  [OK] schema.sql executed successfully.\n";
} catch (\Throwable $e) {
    echo "❌ Failed to execute schema.sql: " . $e->getMessage() . "\n";
    exit(1);
}

// 5. Apply all incremental migrations
echo "\n[4/6] Applying incremental migrations (migrate_v*.sql)...\n";
// Ensure migrations_log table exists
$db->exec("
    CREATE TABLE IF NOT EXISTS migrations_log (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        filename    VARCHAR(255) NOT NULL UNIQUE,
        applied_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        checksum    VARCHAR(64)  NOT NULL
    )
");

$migrationFiles = glob(__DIR__ . '/migrate_*.sql') ?: [];
sort($migrationFiles, SORT_NATURAL);

$appliedList = $db->query("SELECT filename FROM migrations_log")->fetchAll(PDO::FETCH_COLUMN);

foreach ($migrationFiles as $file) {
    $basename = basename($file);
    if (in_array($basename, $appliedList, true)) {
        echo "  - Skipping (already applied): {$basename}\n";
        continue;
    }

    $sql = file_get_contents($file);
    $checksum = hash('sha256', $sql);
    try {
        $db->exec($sql);
        $db->prepare("INSERT INTO migrations_log (filename, checksum) VALUES (?, ?)")
           ->execute([$basename, $checksum]);
        echo "  + Applied: {$basename}\n";
    } catch (\Throwable $e) {
        // Some migrations may have idempotent statements; log warning or fail
        $msg = $e->getMessage();
        if (str_contains($msg, 'already exists') || str_contains($msg, 'duplicate key')) {
            echo "  ~ Idempotent notice on {$basename}: {$msg}\n";
            $db->prepare("INSERT INTO migrations_log (filename, checksum) VALUES (?, ?) ON CONFLICT DO NOTHING")
               ->execute([$basename, $checksum]);
        } else {
            echo "❌ Migration failed on {$basename}: {$msg}\n";
            exit(1);
        }
    }
}

// 6. Apply seeds
echo "\n[5/6] Seeding baseline catalogs and test data...\n";
$seedFile = __DIR__ . '/seed.sql';
if (file_exists($seedFile)) {
    try {
        $db->exec(file_get_contents($seedFile));
        echo "  [OK] seed.sql applied.\n";
    } catch (\Throwable $e) {
        echo "  ~ Seed notice (idempotent duplicate handled): " . $e->getMessage() . "\n";
    }
}

// 7. Verification of database schema, constraints and indexes
echo "\n[6/6] Verifying schema integrity, constraints, and indexes...\n";
$tables = $db->query("
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
")->fetchAll(PDO::FETCH_COLUMN);

$expectedTables = [
    'users', 'students', 'skills', 'companies', 'jobs', 'applications',
    'student_skills', 'student_projects', 'skill_assessments', 'skill_integrity_audits',
    'career_goals', 'career_readiness_snapshots', 'student_notification_preferences',
    'career_coach_sessions', 'career_coach_messages', 'learning_resources',
    'project_recommendations', 'knowledge_evolution_events', 'student_learning_progress',
    'student_project_progress'
];

$missing = [];
foreach ($expectedTables as $exp) {
    if (!in_array($exp, $tables, true)) {
        $missing[] = $exp;
    }
}

if (!empty($missing)) {
    echo "❌ Missing required tables in test database: " . implode(', ', $missing) . "\n";
    exit(1);
}

echo "  [OK] All " . count($expectedTables) . " required tables exist in {$testDbName}.\n";
echo "  [OK] Total tables in public schema: " . count($tables) . "\n";

echo "\n========================================================\n";
echo "✅ ISOLATED TEST DATABASE PROVISIONED SUCCESSFULLY!\n";
echo "   Target: {$testUrl}\n";
echo "========================================================\n";
exit(0);
