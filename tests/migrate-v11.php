<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/config/database.php';

echo "Connecting to Neon PostgreSQL...\n";
$db = Database::getConnection();

echo "Reading migrate_v11.sql...\n";
$migrationSql = file_get_contents(__DIR__ . '/../backend/database/migrate_v11.sql');

if (!$migrationSql) {
    echo "ERROR: migrate_v11.sql could not be read.\n";
    exit(1);
}

echo "Executing migrate_v11.sql...\n";
$db->exec($migrationSql);
echo "migrate_v11.sql executed successfully!\n\n";

// Verify tables exist
$tables = [
    'career_goals',
    'career_roadmaps',
    'career_roadmap_steps',
    'skill_gap_analysis',
    'learning_resources',
    'student_learning_progress',
    'weekly_career_plans',
    'career_plan_tasks',
    'knowledge_evolution_events',
    'skill_dependencies',
    'student_achievements'
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
echo "MIGRATION V11 COMPLETE!\n";
echo "===================================================\n";
