<?php
require_once __DIR__ . '/../backend/config/database.php';

try {
    $db = Database::getConnection();
    $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    $userCount = $db->query('SELECT count(*) FROM users')->fetchColumn();
    $jobCount = $db->query('SELECT count(*) FROM jobs')->fetchColumn();
    $companyCount = $db->query('SELECT count(*) FROM companies')->fetchColumn();
    echo "SUCCESS: Connected to {$driver}\n";
    echo "Users in PostgreSQL: {$userCount}\n";
    echo "Jobs in PostgreSQL: {$jobCount}\n";
    echo "Companies in PostgreSQL: {$companyCount}\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
