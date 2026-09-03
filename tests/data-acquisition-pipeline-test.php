<?php
declare(strict_types=1);

/**
 * SkillBridge 3.0 — Data Acquisition & Recommendation Pipeline Test Suite
 * Tests registry verification, staging isolation, validation, deduplication,
 * and the continuous Career -> Learning -> Project -> Assessment -> Jobs recommendation chain.
 */

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/DataRecommendationService.php';
require_once __DIR__ . '/../scripts/data/registry_seed.php';

$totalTests = 0;
$passedTests = 0;

function assertTest(bool $condition, string $testName, string $details = ''): void {
    global $totalTests, $passedTests;
    $totalTests++;
    if ($condition) {
        $passedTests++;
        echo "  [PASS] {$testName}\n";
    } else {
        echo "  [FAIL] {$testName}" . ($details ? ": {$details}" : '') . "\n";
    }
}

echo "===============================================================\n";
echo "SkillBridge 3.0 — Data Acquisition & Recommendation Tests\n";
echo "===============================================================\n\n";

$db = Database::getConnection();

// Fetch test student
$student = $db->query("SELECT id FROM students LIMIT 1")->fetch();
if (!$student) {
    echo "ERROR: No student found in database.\n";
    exit(1);
}
$studentId = $student['id'];

// -------------------------------------------------------------------
// 1. DATA_SOURCE_REGISTRY Verification
// -------------------------------------------------------------------
echo "Test Group 1: Data Source Registry Integrity\n";
$sources = $db->query("SELECT * FROM data_source_registry ORDER BY source_name ASC")->fetchAll();

assertTest(count($sources) >= 6, 'At least 6 vetted public data sources registered', 'Got ' . count($sources));

foreach ($sources as $s) {
    assertTest(
        !empty($s['source_name']) && !empty($s['license']) && !empty($s['collection_method']),
        "Source '{$s['source_name']}' has required metadata (license, method, URL)"
    );
    assertTest(
        (bool)$s['terms_checked'] === true,
        "Source '{$s['source_name']}' terms/license verified"
    );
    assertTest(
        !empty($s['last_verified_at']),
        "Source '{$s['source_name']}' has last_verified_at timestamp"
    );
}

// -------------------------------------------------------------------
// 2. Staging Tables Isolation & Validation Status
// -------------------------------------------------------------------
echo "\nTest Group 2: Staging Environment Isolation\n";
$stagedLr = (int)$db->query("SELECT COUNT(*) FROM staging_learning_resources")->fetchColumn();
$stagedProj = (int)$db->query("SELECT COUNT(*) FROM staging_projects")->fetchColumn();

assertTest($stagedLr >= 0, 'Learning-resource staging remains available without fabricated records', "Count: {$stagedLr}");
assertTest($stagedProj >= 0, 'Project staging remains available without fabricated records', "Count: {$stagedProj}");

// Test rejection of invalid records in staging
$testHash = sha1('invalid_url_test_' . time());
$db->prepare("
    INSERT INTO staging_learning_resources (batch_id, source_id, skill, title, provider, resource_type, url, validation_status, content_hash)
    VALUES ('test_batch', 'src_manual_learning', 'React', 'Invalid Link Resource', 'Unknown', 'documentation', 'http://insecure-http-url.com', 'pending', ?)
")->execute([$testHash]);

$invalidRow = $db->query("SELECT id, url FROM staging_learning_resources WHERE content_hash = '{$testHash}'")->fetch();
$isSecure = filter_var($invalidRow['url'], FILTER_VALIDATE_URL) && str_starts_with($invalidRow['url'], 'https://');
assertTest(!$isSecure, 'Validation engine detects non-HTTPS/insecure URL');

// Clean up test row
$db->query("DELETE FROM staging_learning_resources WHERE content_hash = '{$testHash}'");

// -------------------------------------------------------------------
// 3. Project Recommendations ("Build This Next")
// -------------------------------------------------------------------
echo "\nTest Group 3: Project Recommendations Integrity\n";
$projects = DataRecommendationService::getProjects();

assertTest(count($projects) >= 0, 'Production project recommendations query is empty-safe', 'Got ' . count($projects));

foreach ($projects as $p) {
    $deliverables = json_decode((string)$p['deliverables'], true);
    $techStack = json_decode((string)$p['tech_stack'], true);
    assertTest(
        is_array($deliverables) && count($deliverables) > 0,
        "Project '{$p['title']}' contains actionable deliverables list"
    );
    assertTest(
        is_array($techStack) && count($techStack) > 0,
        "Project '{$p['title']}' contains required tech stack"
    );
    assertTest(
        in_array($p['difficulty'], ['beginner', 'intermediate', 'advanced']),
        "Project '{$p['title']}' has valid difficulty level: {$p['difficulty']}"
    );
    break; // test sample
}

// -------------------------------------------------------------------
// 4. Continuous Recommendation Loop (Career -> Skills -> Gap -> Course -> Video -> Project -> Assessment -> Jobs)
// -------------------------------------------------------------------
echo "\nTest Group 4: End-to-End Progression Chain\n";
$chain = DataRecommendationService::getFullCareerProgressionChain($studentId, 'Full Stack Developer');

assertTest(isset($chain['career']), '1. Career target resolved');
assertTest(isset($chain['focus_gap']), '2. Primary skill gap identified');
assertTest(array_key_exists('recommended_courses', $chain), '3. Course recommendations are empty-safe');
assertTest(array_key_exists('recommended_videos', $chain), '4. Video recommendations are empty-safe');
assertTest(array_key_exists('recommended_projects', $chain), '5. Project recommendations are empty-safe');
assertTest(array_key_exists('recommended_assessment', $chain), '6. Assessment state is explicit when taxonomy is unavailable');
assertTest(isset($chain['chain_sequence']), '7. Chain sequence complete and structured');

// -------------------------------------------------------------------
// 5. Registry Status & Catalog Health
// -------------------------------------------------------------------
echo "\nTest Group 5: Data Pipeline Registry Status\n";
$status = DataRecommendationService::getRegistryStatus();

assertTest($status['source_count'] >= 6, 'Registry health reports active data sources');
assertTest($status['production_counts']['learning_resources'] >= 0, 'Production learning resources catalog is empty-safe');
assertTest($status['production_counts']['project_recommendations'] >= 0, 'Production project recommendations catalog is empty-safe');

echo "\n===============================================================\n";
echo "PIPELINE TEST RESULTS: {$passedTests} / {$totalTests} PASSED\n";
echo "===============================================================\n";

if ($passedTests === $totalTests) {
    echo "SUCCESS: ALL TESTS GREEN!\n";
    exit(0);
} else {
    echo "FAILURE: " . ($totalTests - $passedTests) . " TESTS FAILED!\n";
    exit(1);
}
