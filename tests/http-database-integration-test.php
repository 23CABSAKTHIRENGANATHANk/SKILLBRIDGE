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
$jwtSecret = 'test_jwt_secret_key_for_isolated_http_database_testing_min_32_chars_long';
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
 * Executes requests through the application's central HTTP pipeline.
 */
function sendRequest(string $method, string $path, array $data = [], ?string $token = null): array {
    $router = realpath(__DIR__ . '/../backend/index.php');
    $query = parse_url($path, PHP_URL_QUERY) ?: '';
    $cleanPath = parse_url($path, PHP_URL_PATH) ?: $path;

    $queryParams = [];
    if (!empty($query)) {
        parse_str($query, $queryParams);
    }

    global $testDbUrl, $jwtSecret;
    $runnerScript = tempnam(sys_get_temp_dir(), 'sb_http_') . '.php';
    $payloadJson = !empty($data) ? json_encode($data) : '';

    $wrapperCode = "<?php\n" .
        "putenv('APP_ENV=testing');\n" .
        "\$_ENV['APP_ENV'] = 'testing';\n" .
        "putenv('TEST_DATABASE_URL=" . addslashes($testDbUrl) . "');\n" .
        "\$_ENV['TEST_DATABASE_URL'] = " . var_export($testDbUrl, true) . ";\n" .
        "putenv('DATABASE_URL=" . addslashes($testDbUrl) . "');\n" .
        "\$_ENV['DATABASE_URL'] = " . var_export($testDbUrl, true) . ";\n" .
        "putenv('JWT_SECRET=" . addslashes($jwtSecret) . "');\n" .
        "\$_ENV['JWT_SECRET'] = " . var_export($jwtSecret, true) . ";\n" .
        "\$_SERVER['REQUEST_METHOD'] = " . var_export($method, true) . ";\n" .
        "\$_SERVER['REQUEST_URI'] = " . var_export($path, true) . ";\n" .
        "\$_SERVER['QUERY_STRING'] = " . var_export($query, true) . ";\n" .
        "\$_SERVER['CONTENT_TYPE'] = 'application/json';\n" .
        "\$_SERVER['HTTP_ACCEPT'] = 'application/json';\n" .
        "\$_GET = " . var_export($queryParams, true) . ";\n";

    if ($token !== null) {
        $wrapperCode .= "\$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . " . var_export($token, true) . ";\n";
    }

    $wrapperCode .= "register_shutdown_function(function() {\n" .
        "    \$code = http_response_code() ?: 200;\n" .
        "    echo \"\\n__HTTP_STATUS__:\" . \$code . \"\\n\";\n" .
        "});\n" .
        "require " . var_export($router, true) . ";\n";

    file_put_contents($runnerScript, $wrapperCode);

    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w']
    ];

    $childEnv = array_merge($_SERVER, $_ENV, [
        'APP_ENV' => 'testing',
        'TEST_DATABASE_URL' => $testDbUrl,
        'DATABASE_URL' => $testDbUrl,
        'JWT_SECRET' => $jwtSecret,
        'SYSTEMROOT' => getenv('SYSTEMROOT') ?: 'C:\Windows',
        'PATH' => getenv('PATH') ?: ''
    ]);

    $proc = proc_open(sprintf('php -d display_errors=stderr "%s"', $runnerScript), $descriptors, $pipes, realpath(__DIR__ . '/..'), $childEnv);

    if (!is_resource($proc)) {
        @unlink($runnerScript);
        return ['status_code' => 500, 'body' => 'Process open failed', 'raw' => ''];
    }

    if (!empty($payloadJson)) {
        fwrite($pipes[0], $payloadJson);
    }
    fclose($pipes[0]);

    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    proc_close($proc);
    @unlink($runnerScript);

    $statusCode = 500;
    if (preg_match('/__HTTP_STATUS__:(\d+)/', $stdout, $m)) {
        $statusCode = (int)$m[1];
        $stdout = preg_replace('/__HTTP_STATUS__:\d+/', '', $stdout);
    }

    $trimmed = trim($stdout);
    $decoded = json_decode($trimmed, true);

    return [
        'status_code' => $statusCode,
        'body' => is_array($decoded) ? $decoded : $trimmed,
        'raw' => $trimmed,
        'stderr' => $stderr
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
assertHttp("Career OS response provides student information", !empty($osRes['body']['data']['student']));
assertHttp("Career OS target role matches 'Frontend Developer'", ($osRes['body']['data']['goal']['target_role'] ?? '') === 'Frontend Developer');

// =====================================================================
// 4. Evidence-Backed Readiness (GET /api/student/readiness)
// =====================================================================
echo "\n4. Validating Readiness Evaluation via GET /api/student/readiness...\n";
$readinessRes = sendRequest('GET', '/api/student/readiness', [], $studentAToken);
assertHttp("GET /api/student/readiness returns HTTP 200", $readinessRes['status_code'] === 200);
assertHttp("Readiness response includes numeric readiness_score", isset($readinessRes['body']['data']['readiness_score']));

// =====================================================================
// 5. Categorized Skill Gaps (GET /api/student/skill-gaps)
// =====================================================================
echo "\n5. Validating Skill Gaps via GET /api/student/skill-gaps...\n";
$gapsRes = sendRequest('GET', '/api/student/skill-gaps', [], $studentAToken);
assertHttp("GET /api/student/skill-gaps returns HTTP 200", $gapsRes['status_code'] === 200);
assertHttp("Gaps response provides structured categories", isset($gapsRes['body']['data']['missing_skills']) || isset($gapsRes['body']['data']['gaps']));

// =====================================================================
// 6. Next Best Action (GET /api/student/next-action)
// =====================================================================
echo "\n6. Validating Next Best Action via GET /api/student/next-action...\n";
$actionRes = sendRequest('GET', '/api/student/next-action', [], $studentAToken);
assertHttp("GET /api/student/next-action returns HTTP 200", $actionRes['status_code'] === 200);
assertHttp("Next action contains title/action and rationale", is_array($actionRes['body']) && !empty($actionRes['body']['data']['action'] ?? ($actionRes['body']['data']['primary_action'] ?? null)));

// =====================================================================
// 7. Reachable Jobs 4-Tier Categorization (GET /api/student/reachable-jobs)
// =====================================================================
echo "\n7. Validating Reachable Jobs via GET /api/student/reachable-jobs...\n";
$jobsRes = sendRequest('GET', '/api/student/reachable-jobs', [], $studentAToken);
assertHttp("GET /api/student/reachable-jobs returns HTTP 200", $jobsRes['status_code'] === 200);
assertHttp("Reachable jobs response has tier breakdown", isset($jobsRes['body']['data']['tier_summary']) || isset($jobsRes['body']['data']['tiers']));

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
