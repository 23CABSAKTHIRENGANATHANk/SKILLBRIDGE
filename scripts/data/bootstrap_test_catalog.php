<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/database.php';
require_once __DIR__ . '/../../backend/config/DatabaseSafetyGuard.php';
require_once __DIR__ . '/registry_seed.php';
require_once __DIR__ . '/seed_career_intelligence.php';
require_once __DIR__ . '/bulk_expand_catalog.php';

DatabaseSafetyGuard::assertIsolatedTestDatabase(Database::getConnection());

RegistrySeeder::run();
CareerIntelligenceSeeder::run();
require_once __DIR__ . '/add_final_skills.php';
require_once __DIR__ . '/fix_slugs.php';
BulkCatalogExpander::run();

$db = Database::getConnection();
DatabaseSafetyGuard::assertIsolatedTestDatabase($db);

$counts = [
    'careers' => (int)$db->query('SELECT count(*) FROM careers')->fetchColumn(),
    'skills' => (int)$db->query('SELECT count(*) FROM skills')->fetchColumn(),
    'dependencies' => (int)$db->query('SELECT count(*) FROM skill_dependencies')->fetchColumn(),
    'learning_resources' => (int)$db->query('SELECT count(*) FROM learning_resources')->fetchColumn(),
    'projects' => (int)$db->query('SELECT count(*) FROM project_recommendations')->fetchColumn(),
];

if ($counts['careers'] < 100 || $counts['skills'] < 500 || $counts['dependencies'] < 100 || $counts['learning_resources'] < 500 || $counts['projects'] < 200) {
    throw new RuntimeException('Isolated Career Intelligence catalog is incomplete: ' . json_encode($counts));
}

echo 'Test catalog bootstrap verified: ' . json_encode($counts) . PHP_EOL;
