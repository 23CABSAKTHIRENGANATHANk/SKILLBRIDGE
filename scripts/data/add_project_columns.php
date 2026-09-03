<?php
require_once __DIR__ . '/../../backend/config/database.php';

$db = Database::getConnection();
$db->exec("
    ALTER TABLE project_recommendations ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE project_recommendations ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
    UPDATE project_recommendations SET last_verified_at = CURRENT_TIMESTAMP WHERE last_verified_at IS NULL;
    UPDATE project_recommendations SET active = TRUE WHERE active IS NULL;
");
echo "Added last_verified_at and active to project_recommendations successfully.\n";
