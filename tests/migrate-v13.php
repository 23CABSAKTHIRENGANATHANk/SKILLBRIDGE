<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/config/database.php';

echo "Connecting to PostgreSQL database...\n";
$db = Database::getConnection();

echo "Reading migrate_v13.sql...\n";
$sql = file_get_contents(__DIR__ . '/../backend/database/migrate_v13.sql');
if (!$sql) {
    echo "ERROR: Unable to read migrate_v13.sql\n";
    exit(1);
}

echo "Executing migrate_v13.sql...\n";
$db->exec($sql);
echo "migrate_v13.sql executed successfully!\n\n";

echo "Verifying tables and columns:\n";
$careersExists = $db->query("SELECT to_regclass('careers')")->fetchColumn();
echo "  [OK] Table 'careers' exists: " . ($careersExists ? 'YES' : 'NO') . "\n";

$skillCols = $db->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'skills' AND column_name IN ('slug', 'difficulty', 'aliases', 'prerequisites')")->fetchAll(PDO::FETCH_COLUMN);
echo "  [OK] Table 'skills' new columns: " . implode(', ', $skillCols) . "\n";

$depCols = $db->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'skill_dependencies' AND column_name IN ('strength', 'source', 'confidence')")->fetchAll(PDO::FETCH_COLUMN);
echo "  [OK] Table 'skill_dependencies' new columns: " . implode(', ', $depCols) . "\n";

$lrCols = $db->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'learning_resources' AND column_name IN ('video_id', 'channel', 'quality_score', 'status')")->fetchAll(PDO::FETCH_COLUMN);
echo "  [OK] Table 'learning_resources' new columns: " . implode(', ', $lrCols) . "\n";

$projCols = $db->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'project_recommendations' AND column_name IN ('skills_to_gain', 'acceptance_criteria', 'portfolio_value')")->fetchAll(PDO::FETCH_COLUMN);
echo "  [OK] Table 'project_recommendations' new columns: " . implode(', ', $projCols) . "\n";

echo "\n===================================================\n";
echo "MIGRATION V13 COMPLETE!\n";
echo "===================================================\n";
