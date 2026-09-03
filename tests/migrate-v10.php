<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/config/database.php';

echo "Connecting to Neon PostgreSQL...\n";
$db = Database::getConnection();

echo "Reading migrate_v10.sql...\n";
$migrationSql = file_get_contents(__DIR__ . '/../backend/database/migrate_v10.sql');

if (!$migrationSql) {
    echo "ERROR: migrate_v10.sql could not be read.\n";
    exit(1);
}

echo "Executing migrate_v10.sql...\n";
$db->exec($migrationSql);
echo "migrate_v10.sql executed successfully!\n\n";

// Verify tables exist
$tables = ['college_groups', 'placement_students', 'placement_job_drives', 'skill_trust_scores'];
echo "Verifying new tables:\n";
foreach ($tables as $table) {
    $exists = $db->query("SELECT to_regclass('{$table}')")->fetchColumn();
    if ($exists) {
        $count = $db->query("SELECT count(*) FROM {$table}")->fetchColumn();
        echo "  [OK] Table '{$table}' exists (current rows: {$count})\n";
    } else {
        echo "  [FAIL] Table '{$table}' does NOT exist!\n";
    }
}

echo "\n===================================================\n";
echo "MIGRATION V10 COMPLETE!\n";
echo "===================================================\n";
