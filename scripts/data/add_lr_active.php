<?php
require_once __DIR__ . '/../../backend/config/database.php';
$db = Database::getConnection();
$db->exec("
    ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
    UPDATE learning_resources SET active = TRUE WHERE active IS NULL;
");
echo "Added active column to learning_resources.\n";
