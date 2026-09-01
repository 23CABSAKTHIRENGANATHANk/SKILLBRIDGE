<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/config/database.php';

echo "Connecting to Neon PostgreSQL...\n";
$db = Database::getConnection();

echo "Importing schema.sql...\n";
$schemaSql = file_get_contents(__DIR__ . '/../backend/database/schema.sql');
$db->exec($schemaSql);
echo "Schema created successfully!\n";

echo "Importing seed.sql...\n";
$seedSql = file_get_contents(__DIR__ . '/../backend/database/seed.sql');
$db->exec($seedSql);
echo "Seed data inserted successfully!\n";

$userCount = $db->query('SELECT count(*) FROM users')->fetchColumn();
$jobCount = $db->query('SELECT count(*) FROM jobs')->fetchColumn();
$companyCount = $db->query('SELECT count(*) FROM companies')->fetchColumn();

echo "===================================================\n";
echo "NEON POSTGRESQL LIVE DATABASE STATS:\n";
echo "Users: {$userCount}\n";
echo "Jobs: {$jobCount}\n";
echo "Companies: {$companyCount}\n";
echo "===================================================\n";
