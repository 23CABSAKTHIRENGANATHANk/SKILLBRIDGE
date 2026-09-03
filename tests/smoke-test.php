<?php
declare(strict_types=1);

/**
 * SkillBridge 2.0: Automated Deployment & Rollback Smoke-Test Verification Suite
 * 
 * Verifies core platform invariants immediately following any deployment or rollback:
 * 1. API Liveness & Storage Status
 * 2. Database Connectivity & Pool Latency
 * 3. Prometheus / OpenMetrics Telemetry Output
 * 4. Authentication Barrier (401 Unauthorized)
 * 5. Role-Based Access Control Barrier (403 Forbidden)
 * 6. Student Authentication & Profile Resolution
 * 7. Recruiter Talent Search & Precision Match Engine
 * 8. Cryptographic Skill Passport Public Verification
 * 9. Operational Alerting Audit Dispatch
 */

$baseUrl = getenv('API_BASE_URL') ?: 'http://localhost:8000';

echo "========================================================================\n";
echo "   SKILLBRIDGE 2.0: POST-DEPLOYMENT / ROLLBACK SMOKE-TEST SUITE        \n";
echo "   Target Base URL: {$baseUrl}                                         \n";
echo "========================================================================\n\n";

function smokeReq(string $method, string $path, ?array $body = null, ?string $token = null): array {
    global $baseUrl;
    $ch = curl_init("{$baseUrl}{$path}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
    $headers = [];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    if ($token) {
        $headers[] = "Authorization: Bearer {$token}";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $res = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status, 'raw' => (string)$res, 'json' => json_decode((string)$res, true)];
}

$passed = 0;
$failed = 0;

function assertCheck(string $title, bool $condition, string $detail = ''): void {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "  ✅ PASS: {$title}" . ($detail ? " ({$detail})" : "") . "\n";
    } else {
        $failed++;
        echo "  ❌ FAIL: {$title}" . ($detail ? " ({$detail})" : "") . "\n";
    }
}

// 1. Health Liveness
echo "1. Testing Health & Diagnostics Liveness...\n";
$health = smokeReq('GET', '/health');
assertCheck("System health endpoint responds 200 OK", $health['status'] === 200);
assertCheck("Application status is healthy", ($health['json']['status'] ?? '') === 'healthy');

// 2. Database Health
echo "\n2. Testing Database Connectivity & Query Latency...\n";
$dbHealth = smokeReq('GET', '/health/db');
assertCheck("Database health probe responds 200 OK", $dbHealth['status'] === 200);
assertCheck("Database status is healthy", ($dbHealth['json']['database'] ?? '') === 'healthy');
$lat = $dbHealth['json']['latency_ms'] ?? 0;
assertCheck("Database latency is reported", $lat > 0, "{$lat} ms");

// 3. Prometheus Metrics Exporter
echo "\n3. Testing Prometheus Telemetry (/metrics)...\n";
$metrics = smokeReq('GET', '/metrics');
assertCheck("Metrics endpoint responds 200 OK", $metrics['status'] === 200);
assertCheck("Contains Prometheus metric prefix", strpos($metrics['raw'], 'skillbridge_db_connected') !== false);
assertCheck("Contains user count counter", strpos($metrics['raw'], 'skillbridge_users_total') !== false);

// 4. Authentication Barrier
echo "\n4. Testing Unauthenticated Security Barrier...\n";
$noAuth = smokeReq('GET', '/auth/me');
assertCheck("Unauthenticated request blocked with 401", $noAuth['status'] === 401);

// 5. Student Registration & Auth Flow
echo "\n5. Testing Student Authentication & Profile Flow...\n";
$ts = time() . '_' . mt_rand(1000, 9999);
$studentReg = smokeReq('POST', '/auth/register', [
    'email' => "smoke_student_{$ts}@example.com",
    'password' => 'Password123!',
    'role' => 'student',
    'name' => 'Smoke Test Student'
]);
assertCheck("Student registered successfully (201 Created)", $studentReg['status'] === 201);
$studentToken = $studentReg['json']['token'] ?? '';
assertCheck("JWT token issued", !empty($studentToken));

$profile = smokeReq('GET', '/auth/me', null, $studentToken);
assertCheck("Profile resolves via /auth/me", $profile['status'] === 200 && (($profile['json']['user']['role'] ?? '') === 'student' || ($profile['json']['role'] ?? '') === 'student'));

// 6. RBAC Barrier (Student -> Recruiter API)
echo "\n6. Testing RBAC Privilege Barrier...\n";
$recAccess = smokeReq('GET', '/recruiter/talent-search', null, $studentToken);
assertCheck("Student blocked from recruiter endpoint with 403 Forbidden", $recAccess['status'] === 403);

// 7. Recruiter Registration & Talent Search
echo "\n7. Testing Recruiter Registration & Precision Talent Search...\n";
$recReg = smokeReq('POST', '/auth/register', [
    'email' => "smoke_recruiter_{$ts}@example.com",
    'password' => 'Password123!',
    'role' => 'recruiter',
    'name' => 'Smoke Test Recruiter',
    'company_name' => "Smoke Corp {$ts}"
]);
assertCheck("Recruiter registered successfully", $recReg['status'] === 201);
$recToken = $recReg['json']['token'] ?? '';

$search = smokeReq('GET', '/recruiter/talent-search?skills=React&limit=5', null, $recToken);
if ($search['status'] !== 200) {
    echo "  [DEBUG SEARCH FAIL] Status: {$search['status']} Body: " . substr($search['raw'], 0, 200) . "\n";
}
assertCheck("Recruiter executes talent search (200 OK)", $search['status'] === 200);
assertCheck("Search returns candidates array", isset($search['json']['candidates']));

// 8. Public Skill Passport Verification
echo "\n8. Testing Public Cryptographic Passport Resolution...\n";
// Attempt looking up a passport token or public route
$publicPassport = smokeReq('GET', '/passport/sample-verification-token');
// It should respond either with valid passport or controlled 404 (not 500 error)
assertCheck("Public passport endpoint returns clean response (not 500)", in_array($publicPassport['status'], [200, 404], true));

// 9. Operational Alerting Engine
echo "\n9. Testing Operational Alerting Engine...\n";
require_once __DIR__ . '/../backend/services/AlertService.php';
$alertRes = AlertService::sendAlert('info', 'SMOKE_TEST_EXECUTION', 'Automated smoke test verification executed.', [
    'test_id' => $ts,
    'status'  => 'healthy'
]);
assertCheck("AlertService logged event", $alertRes['logged'] === true);

echo "\n========================================================================\n";
echo "   SMOKE-TEST SUMMARY: Passed: {$passed} | Failed: {$failed}           \n";
echo "========================================================================\n";

exit($failed > 0 ? 1 : 0);
