<?php
declare(strict_types=1);

/**
 * SkillBridge PostgreSQL Dedicated Verification Suite
 */

echo "========================================================\n";
echo "    SKILLBRIDGE POSTGRESQL ENGINE VERIFICATION         \n";
echo "========================================================\n\n";

require_once __DIR__ . '/../backend/config/database.php';

$passed = 0;
$failed = 0;

function assertPg(string $title, bool $condition, string $details = ''): void {
    global $passed, $failed;
    if ($condition) {
        echo "  [PG PASS] {$title}\n";
        $passed++;
    } else {
        echo "  [PG FAIL] {$title} -- {$details}\n";
        $failed++;
    }
}

try {
    $db = Database::getConnection();
    
    // 1. Verify Driver
    $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    assertPg('Database Driver is PostgreSQL (pgsql)', $driver === 'pgsql', "Actual: {$driver}");

    // 2. Verify Table Existence in PostgreSQL Schema
    $tablesStmt = $db->query("
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ");
    $tables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

    $requiredTables = [
        'users', 'refresh_tokens', 'skills', 'companies', 'students',
        'student_skills', 'jobs', 'job_skills', 'applications', 'interviews', 'notifications'
    ];

    foreach ($requiredTables as $reqTable) {
        assertPg("Table '{$reqTable}' exists in PostgreSQL", in_array($reqTable, $tables, true));
    }

    // 3. Verify Foreign Key Constraint Enforcement
    $fkBlocked = false;
    try {
        $db->exec("INSERT INTO students (id, user_id, name, college, program) VALUES ('test_fk', 'non_existent_user_id', 'Fake', 'College', 'Degree')");
    } catch (PDOException $e) {
        $fkBlocked = true;
    }
    assertPg('Foreign Key Constraint strictly enforced on invalid parent reference', $fkBlocked);

    // 4. Verify Identity Column Auto-increment
    $insSkillStmt = $db->prepare("INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES ('s1', 'sk_ai', 'expert') ON CONFLICT (student_id, skill_id) DO UPDATE SET proficiency = 'expert' RETURNING id");
    $insSkillStmt->execute();
    $generatedId = $insSkillStmt->fetchColumn();
    assertPg('Identity column auto-generated ID', is_numeric($generatedId) && (int)$generatedId > 0);

    // 5. Verify Unique Composite Constraint (uq_student_skill)
    $dupHandled = false;
    try {
        $db->exec("INSERT INTO student_skills (student_id, skill_id) VALUES ('s1', 'sk_react')");
    } catch (PDOException $e) {
        $dupHandled = true;
    }
    assertPg('Composite Unique Constraint (uq_student_skill) blocks duplicates', $dupHandled);

    // 6. Verify Transaction Support
    $db->beginTransaction();
    $db->exec("INSERT INTO skills (id, name, normalized_name) VALUES ('sk_temp', 'TempSkill', 'tempskill')");
    $db->rollBack();
    $checkTemp = $db->query("SELECT id FROM skills WHERE id = 'sk_temp'")->fetch();
    assertPg('PostgreSQL Transaction Rollback functions correctly', empty($checkTemp));

} catch (Exception $e) {
    assertPg('PostgreSQL execution error', false, $e->getMessage());
}

echo "\n========================================================\n";
echo "  POSTGRESQL AUDIT RESULTS: Passed: {$passed} | Failed: {$failed} \n";
echo "========================================================\n";

exit($failed > 0 ? 1 : 0);
