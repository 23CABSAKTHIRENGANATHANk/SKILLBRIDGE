<?php
require_once __DIR__ . '/../../backend/config/database.php';
$db = Database::getConnection();
$db->exec("
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    UPDATE jobs SET active = (status = 'active') WHERE active IS NULL;
    UPDATE jobs SET last_verified_at = CURRENT_TIMESTAMP WHERE last_verified_at IS NULL;
");
echo "Added active and last_verified_at to jobs table.\n";
