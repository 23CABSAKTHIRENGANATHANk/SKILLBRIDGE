#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * SkillBridge Database Migration Runner
 * 
 * Usage:
 *   php backend/database/migrate.php             -- runs all pending migrations
 *   php backend/database/migrate.php --seed       -- also runs seed.sql after migration
 *   php backend/database/migrate.php --reset      -- drops and recreates from schema.sql then seeds
 *
 * Migrations are applied in filename order and tracked in a migrations_log table.
 */

// Bootstrap database connection
require_once __DIR__ . '/../config/database.php';

$args = $argv ?? [];
$doSeed  = in_array('--seed',  $args, true);
$doReset = in_array('--reset', $args, true);

$db = Database::getConnection();

// ---------------------------------------------------------------------------
// Create migrations tracking table (idempotent)
// ---------------------------------------------------------------------------
$db->exec("
    CREATE TABLE IF NOT EXISTS migrations_log (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        filename    VARCHAR(255) NOT NULL UNIQUE,
        applied_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        checksum    VARCHAR(64)  NOT NULL
    )
");

echo "\n🔵 SkillBridge Migration Runner v2.0\n";
echo str_repeat('─', 55) . "\n";

// ---------------------------------------------------------------------------
// RESET mode: full wipe and recreate
// ---------------------------------------------------------------------------
if ($doReset) {
    if ((getenv('APP_ENV') ?: 'production') === 'production') {
        die("❌ Reset mode is disabled in production. Apply incremental migrations instead.\n");
    }
    echo "⚠️  RESET MODE: Dropping all tables and recreating from schema.sql ...\n";
    $dropSql = <<<'SQL'
DO $$
DECLARE table_name text;
BEGIN
    FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations_log' LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(table_name) || ' CASCADE';
    END LOOP;
END $$;
SQL;
    $db->exec($dropSql);
    $schemaSql = file_get_contents(__DIR__ . '/schema.sql');
    if (!$schemaSql) {
        die("❌ schema.sql not found!\n");
    }
    $db->exec($schemaSql);
    echo "✅ schema.sql applied.\n";

    // Clear migration log  
    $db->exec("DELETE FROM migrations_log");
    $doSeed = true; // auto-seed after reset
}

// ---------------------------------------------------------------------------
// Discover migration files in order
// ---------------------------------------------------------------------------
$migrationDir = __DIR__;
$files = glob($migrationDir . '/migrate_*.sql') ?: [];
sort($files, SORT_NATURAL);

if (empty($files)) {
    echo "ℹ️  No incremental migration files found (migrate_*.sql).\n";
} else {
    // Fetch already-applied migrations
    $applied = $db->query("SELECT filename FROM migrations_log")->fetchAll(PDO::FETCH_COLUMN);

    foreach ($files as $file) {
        $basename = basename($file);
        if (in_array($basename, $applied, true)) {
            echo "  ⏭️  Skipping (already applied): {$basename}\n";
            continue;
        }

        $sql      = file_get_contents($file);
        $checksum = hash('sha256', $sql);

        echo "  ▶️  Applying: {$basename} ...\n";
        try {
            $db->exec($sql);
            $db->prepare("INSERT INTO migrations_log (filename, checksum) VALUES (?, ?)")
               ->execute([$basename, $checksum]);
            echo "  ✅ Done: {$basename}\n";
        } catch (PDOException $e) {
            echo "  ❌ Failed: {$basename}\n     Error: " . $e->getMessage() . "\n";
            exit(1);
        }
    }
}

// ---------------------------------------------------------------------------
// Seed mode
// ---------------------------------------------------------------------------
if ($doSeed) {
    $seedFile = __DIR__ . '/seed.sql';
    if (file_exists($seedFile)) {
        echo "\n🌱 Running seed.sql ...\n";
        try {
            $db->exec(file_get_contents($seedFile));
            echo "✅ Seed data applied.\n";
        } catch (PDOException $e) {
            echo "❌ Seed failed: " . $e->getMessage() . "\n";
            exit(1);
        }
    } else {
        echo "⚠️  seed.sql not found. Skipping seeding.\n";
    }

    // Seed Data Source Registry
    $regFile = dirname(__DIR__, 2) . '/scripts/data/registry_seed.php';
    if (file_exists($regFile)) {
        require_once $regFile;
        if (class_exists('RegistrySeeder')) {
            echo "\n📚 Seeding Data Source Registry ...\n";
            RegistrySeeder::run();
        }
    }

    // Seed Career Intelligence Graph (100+ careers, 500+ skills, 100+ deps, 500+ resources, 200+ projects)
    $careerSeedFile = dirname(__DIR__, 2) . '/scripts/data/seed_career_intelligence.php';
    if (file_exists($careerSeedFile)) {
        require_once $careerSeedFile;
        if (class_exists('CareerIntelligenceSeeder')) {
            echo "\n🧭 Seeding Career Intelligence Graph ...\n";
            CareerIntelligenceSeeder::run();
        }
    }

    // Expand Catalogs to full 500+ skills, 100+ deps, 500+ resources, 200+ projects
    $bulkExpandFile = dirname(__DIR__, 2) . '/scripts/data/bulk_expand_catalog.php';
    if (file_exists($bulkExpandFile)) {
        require_once $bulkExpandFile;
        if (class_exists('BulkCatalogExpander')) {
            echo "\n🚀 Expanding Catalog to 500+ Skills & 200+ Projects ...\n";
            BulkCatalogExpander::run();
        }
    }

    $finalSkillsFile = dirname(__DIR__, 2) . '/scripts/data/add_final_skills.php';
    if (file_exists($finalSkillsFile)) {
        require_once $finalSkillsFile;
    }
}

echo "\n✅ Migration complete.\n\n";
