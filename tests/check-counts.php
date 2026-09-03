<?php
require_once __DIR__ . '/../backend/config/database.php';
$db = Database::getConnection();

echo "=== DATABASE COUNTS ===\n";
echo "Careers:              " . $db->query('SELECT count(*) FROM careers')->fetchColumn() . "\n";
echo "Skills:               " . $db->query('SELECT count(*) FROM skills')->fetchColumn() . "\n";
echo "Dependencies:         " . $db->query('SELECT count(*) FROM skill_dependencies')->fetchColumn() . "\n";
echo "Learning Resources:   " . $db->query('SELECT count(*) FROM learning_resources')->fetchColumn() . "\n";
echo "Project Recommendations: " . $db->query('SELECT count(*) FROM project_recommendations')->fetchColumn() . "\n";
echo "Jobs:                 " . $db->query('SELECT count(*) FROM jobs')->fetchColumn() . "\n";
