<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/config/database.php';

echo "Connecting to PostgreSQL database...\n";
$db = Database::getConnection();

echo "Reading migrate_v12.sql...\n";
$sql = file_get_contents(__DIR__ . '/../backend/database/migrate_v12.sql');
if (!$sql) {
    echo "ERROR: Unable to read migrate_v12.sql\n";
    exit(1);
}

echo "Executing migrate_v12.sql...\n";
$db->exec($sql);
echo "migrate_v12.sql executed successfully!\n\n";

$tables = [
    'data_source_registry',
    'project_recommendations',
    'staging_learning_resources',
    'staging_jobs',
    'staging_projects'
];

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
echo "MIGRATION V12 COMPLETE!\n";
echo "===================================================\n";
