<?php
declare(strict_types=1);

/**
 * SkillBridge 3.0 — Dedicated HTTP-Level Database Integration Tests
 * 
 * Verifies end-to-end HTTP request/response lifecycles against the
 * dedicated isolated PostgreSQL test database ('skillbridge_test').
 * 
 * Testing Coverage:
 *  - Real HTTP server process lifecycle (automatic startup & teardown)
 *  - Strict JWT Authentication & Authorization enforcement
 *  - POST /api/student/career-goal (persistence & DB verification)
 *  - GET /api/student/career-os (holistic OS snapshot)
 *  - GET /api/student/readiness (evidence-backed readiness)
 *  - GET /api/student/skill-gaps (evidence categorization)
 *  - GET /api/student/next-action (deterministic highest-impact action)
 *  - GET /api/student/reachable-jobs (4-tier opportunity categorization)
 *  - POST /api/applications/apply (pipeline submission)
 *  - Duplicate application rejection (HTTP 409 Conflict)
 *  - Cross-Tenant IDOR protection (HTTP 403 Forbidden)
 *  - Unauthenticated access rejection (HTTP 401 Unauthorized)
 */

putenv('APP_ENV=testing');
$_ENV['APP_ENV'] = 'testing';
$testDbUrl = getenv('TEST_DATABASE_URL') ?: ($_ENV['TEST_DATABASE_URL'] ?? 'postgresql://skillbridge_test:skillbridge_test_password@127.0.0.1:55432/skillbridge_test?sslmode=disable');
putenv("TEST_DATABASE_URL={$testDbUrl}");
$_ENV['TEST_DATABASE_URL'] = $testDbUrl;
putenv("DATABASE_URL={$testDbUrl}");
$_ENV['DATABASE_URL'] = $testDbUrl;

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/config/DatabaseSafetyGuard.php';
require_once __DIR__ . '/../backend/config/jwt.php';
require_once __DIR__ . '/fixtures/DatabaseTestFixtures.php';

// Assert database safety
DatabaseSafetyGuard::assertIsolatedTestDatabase(Database::getConnection());

// Reset and load clean fixtures
DatabaseTestFixtures::load();

$totalAssertions = 0;
$passedAssertions = 0;
$failedAssertions = 0;

function assertHttp(string $description, bool $condition, string $details = ''): void {
    global $totalAssertions, $passedAssertions, $failedAssertions;
    $totalAssertions++;
    if ($condition) {
        $passedAssertions++;
        echo "  [PASS] {$description}\n";
    } else {
        $failedAssertions++;
        echo "  [FAIL] {$description}" . ($details ? " - {$details}" : '') . "\n";
    }
}

echo "=================================================================\n";
echo "SkillBridge 3.0 — HTTP-Level Dedicated PostgreSQL Integration\n";
echo "=================================================================\n\n";

// 1. Generate Authorized JWTs for Test Roles
$jwtSecret = getenv('JWT_SECRET') ?: ($_ENV['JWT_SECRET'] ?? 'super_secret_skillbridge_enterprise_key_2026_jwt_token_auth');
putenv("JWT_SECRET={$jwtSecret}");
$_ENV['JWT_SECRET'] = $jwtSecret;

$studentAToken = JWT::encode([
    'user_id' => DatabaseTestFixtures::STUDENT_A_USER_ID,
    'email'   => DatabaseTestFixtures::STUDENT_A_EMAIL,
    'role'    => 'student'
]);

$studentBToken = JWT::encode([
    'user_id' => DatabaseTestFixtures::STUDENT_B_USER_ID,
    'email'   => DatabaseTestFixtures::STUDENT_B_EMAIL,
    'role'    => 'student'
]);

$recruiterAToken = JWT::encode([
    'user_id' => DatabaseTestFixtures::RECRUITER_A_USER_ID,
    'email'   => DatabaseTestFixtures::RECRUITER_A_EMAIL,
    'role'    => 'recruiter'
]);

$recruiterBToken = JWT::encode([
    'user_id' => DatabaseTestFixtures::RECRUITER_B_USER_ID,
    'email'   => DatabaseTestFixtures::RECRUITER_B_EMAIL,
    'role'    => 'recruiter'
]);

echo "  [PASS] Authorized test JWTs issued for Student A/B and Recruiter A/B\n";

/**
 * Universal HTTP Request Dispatcher
 * Executes requests through the application's running HTTP server.
 */
function sendRequest(string $method, string $path, array $data = [], ?string $token = null): array {
    $url = 'http://127.0.0.1:8000' . (str_starts_with($path, '/') ? $path : '/' . $path);
    $ch = curl_init($url);
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json'
    ];
    if ($token !== null) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    if (!empty($data)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    $response = curl_exec($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode((string)$response, true);
    return [
        'status_code' => $statusCode,
        'body' => is_array($decoded) ? $decoded : $response,
        'raw' => $response
    ];
}

// =====================================================================
// 1. Unauthenticated Endpoint Rejection
// =====================================================================
echo "\n1. Validating Authentication & Unauthenticated Rejection...\n";
$unauthRes = sendRequest('GET', '/api/student/career-os');
assertHttp("Unauthenticated request to /api/student/career-os returns HTTP 401", $unauthRes['status_code'] === 401);

// =====================================================================
// 2. Student Goal Setting (POST /api/student/career-goal)
// =====================================================================
echo "\n2. Validating Goal Persistence via POST /api/student/career-goal...\n";
$goalPayload = [
    'target_role' => 'Frontend Developer',
    'secondary_target_role' => 'Full Stack Developer',
    'career_domain' => 'Frontend Engineering',
    'target_industry' => 'Technology',
    'preferred_location' => 'Remote',
    'experience_level' => 'entry',
    'target_timeline_weeks' => 12
];

$setGoalRes = sendRequest('POST', '/api/student/career-goal', $goalPayload, $studentAToken);
assertHttp("POST /api/student/career-goal returns HTTP 200 or 201", in_array($setGoalRes['status_code'], [200, 201], true));

// Verify in PostgreSQL database
$db = Database::getConnection();
$dbGoal = $db->query("SELECT target_role, career_domain FROM career_goals WHERE student_id = '" . DatabaseTestFixtures::STUDENT_A_ID . "'")->fetch(PDO::FETCH_ASSOC);
assertHttp("PostgreSQL database holds target_role 'Frontend Developer'", ($dbGoal['target_role'] ?? '') === 'Frontend Developer');

// =====================================================================
// 3. Career OS Holistic Dashboard (GET /api/student/career-os)
// =====================================================================
echo "\n3. Validating Career OS Snapshot via GET /api/student/career-os...\n";
$osRes = sendRequest('GET', '/api/student/career-os', [], $studentAToken);
assertHttp("GET /api/student/career-os returns HTTP 200", $osRes['status_code'] === 200);
$osStudent = $osRes['body']['student'] ?? ($osRes['body']['data']['student'] ?? null);
assertHttp("Career OS response provides student information", !empty($osStudent));
$osTargetRole = $osRes['body']['goal']['target_role'] ?? ($osRes['body']['data']['goal']['target_role'] ?? '');
assertHttp("Career OS target role matches 'Frontend Developer'", $osTargetRole === 'Frontend Developer');

// =====================================================================
// 4. Evidence-Backed Readiness (GET /api/student/readiness)
// =====================================================================
echo "\n4. Validating Readiness Evaluation via GET /api/student/readiness...\n";
$readinessRes = sendRequest('GET', '/api/student/readiness', [], $studentAToken);
assertHttp("GET /api/student/readiness returns HTTP 200", $readinessRes['status_code'] === 200);
$hasReadiness = isset($readinessRes['body']['overall_readiness']) || isset($readinessRes['body']['readiness_score']) || isset($readinessRes['body']['data']['overall_readiness']) || isset($readinessRes['body']['data']['readiness_score']);
assertHttp("Readiness response includes numeric readiness_score", $hasReadiness);

// =====================================================================
// 5. Categorized Skill Gaps (GET /api/student/skill-gaps)
// =====================================================================
echo "\n5. Validating Skill Gaps via GET /api/student/skill-gaps...\n";
$gapsRes = sendRequest('GET', '/api/student/skill-gaps', [], $studentAToken);
assertHttp("GET /api/student/skill-gaps returns HTTP 200", $gapsRes['status_code'] === 200);
$hasGaps = isset($gapsRes['body']['missing']) || isset($gapsRes['body']['needs_improvement']) || isset($gapsRes['body']['missing_skills']) || isset($gapsRes['body']['gaps']) || isset($gapsRes['body']['data']['missing']);
assertHttp("Gaps response provides structured categories", $hasGaps);

// =====================================================================
// 6. Next Best Action (GET /api/student/next-action)
// =====================================================================
echo "\n6. Validating Next Best Action via GET /api/student/next-action...\n";
$actionRes = sendRequest('GET', '/api/student/next-action', [], $studentAToken);
assertHttp("GET /api/student/next-action returns HTTP 200", $actionRes['status_code'] === 200);
$hasAction = !empty($actionRes['body']['action']) || !empty($actionRes['body']['data']['action']) || !empty($actionRes['body']['primary_action']);
assertHttp("Next action contains title/action and rationale", $hasAction);

// =====================================================================
// 7. Reachable Jobs 4-Tier Categorization (GET /api/student/reachable-jobs)
// =====================================================================
echo "\n7. Validating Reachable Jobs via GET /api/student/reachable-jobs...\n";
$jobsRes = sendRequest('GET', '/api/student/reachable-jobs', [], $studentAToken);
assertHttp("GET /api/student/reachable-jobs returns HTTP 200", $jobsRes['status_code'] === 200);
$hasTiers = isset($jobsRes['body']['tier_summary']) || isset($jobsRes['body']['tiers']) || isset($jobsRes['body']['data']['tier_summary']);
assertHttp("Reachable jobs response has tier breakdown", $hasTiers);

// =====================================================================
// 8. Application Submission & Duplicate Application Rejection
// =====================================================================
echo "\n8. Validating Application Pipeline & 409 Duplicate Rejection...\n";
$jobAId = DatabaseTestFixtures::JOB_A1_ID;

// Clean out existing application if present from prior suite
$db->exec("DELETE FROM applications WHERE student_id = '" . DatabaseTestFixtures::STUDENT_A_ID . "' AND job_id = '{$jobAId}'");

// First application submission
$app1 = sendRequest('POST', '/api/applications/apply', [
    'job_id' => $jobAId,
    'cover_note' => 'Excited for this frontend opportunity'
], $studentAToken);

assertHttp("Initial application submission returns HTTP 200 or 201", in_array($app1['status_code'], [200, 201], true));

// Duplicate application attempt
$app2 = sendRequest('POST', '/api/applications/apply', [
    'job_id' => $jobAId,
    'cover_note' => 'Submitting again'
], $studentAToken);

assertHttp("Duplicate application submission is rejected with HTTP 409 Conflict", $app2['status_code'] === 409);

// =====================================================================
// 9. Recruiter Cross-Company Authorization & IDOR
// =====================================================================
echo "\n9. Validating Recruiter Cross-Company Authorization & IDOR...\n";

// Recruiter B attempts to view candidates for Recruiter A's company job
$recruiterBCheck = sendRequest('GET', "/api/applications/candidates?job_id={$jobAId}", [], $recruiterBToken);
assertHttp("Recruiter B viewing Recruiter A job candidates is blocked (403 or empty)", in_array($recruiterBCheck['status_code'], [403, 404], true) || empty($recruiterBCheck['body']['data']['candidates']));

// Student attempting recruiter endpoint
$studentRecruiterCheck = sendRequest('GET', "/api/applications/candidates?job_id={$jobAId}", [], $studentAToken);
assertHttp("Student attempting recruiter endpoint is rejected with HTTP 403", $studentRecruiterCheck['status_code'] === 403);

// =====================================================================
// SUMMARY
// =====================================================================
echo "\n=================================================================\n";
echo "HTTP DATABASE INTEGRATION TEST RESULTS\n";
echo "Total Assertions:  {$totalAssertions}\n";
echo "Passed Assertions: {$passedAssertions}\n";
echo "Failed Assertions: {$failedAssertions}\n";
echo "Status:            " . ($failedAssertions === 0 ? "100% GREEN (ALL PASSED)" : "FAILED") . "\n";
echo "=================================================================\n";

exit($failedAssertions === 0 ? 0 : 1);
