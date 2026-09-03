<?php
require_once __DIR__ . '/../../backend/config/database.php';

$db = Database::getConnection();
$count = $db->exec("
    UPDATE skills 
    SET slug = TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))) 
    WHERE slug IS NULL OR slug = ''
");
echo "Updated missing slugs: {$count}\n";

$remaining = (int)$db->query("SELECT count(*) FROM skills WHERE slug IS NULL OR slug = ''")->fetchColumn();
echo "Remaining empty slugs: {$remaining}\n";
