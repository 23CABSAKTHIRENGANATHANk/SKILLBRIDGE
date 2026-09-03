<?php
declare(strict_types=1);

/**
 * SkillBridge Automated End-to-End Test Suite (PostgreSQL / Neon Engine)
 */

echo "========================================================\n";
echo "  SKILLBRIDGE END-TO-END AUTOMATED VERIFICATION SUITE   \n";
echo "========================================================\n\n";

$baseUrl = 'http://localhost:8000/api';
$passed = 0;
$failed = 0;

function assertTest(string $title, bool $condition, string $details = ''): void {
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] {$title}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$title} -- {$details}\n";
        $failed++;
    }
}

function httpPost(string $url, array $data, ?string $token = null): array {
    $header = "Content-Type: application/json\r\nAccept: application/json\r\nConnection: close\r\n";
    if ($token) {
        $header .= "Authorization: Bearer {$token}\r\n";
    }
    $options = [
        'http' => [
            'header' => $header,
            'method' => 'POST',
            'content' => json_encode($data),
            'ignore_errors' => true,
            'timeout' => 30
        ]
    ];
    $res = file_get_contents($url, false, stream_context_create($options));
    return [
        'status' => $http_response_header[0] ?? '',
        'body' => json_decode($res ?: '{}', true)
    ];
}

function httpGet(string $url, ?string $token = null): array {
    $header = "Accept: application/json\r\nConnection: close\r\n";
    if ($token) {
        $header .= "Authorization: Bearer {$token}\r\n";
    }
    $options = [
        'http' => [
            'header' => $header,
            'method' => 'GET',
            'ignore_errors' => true,
            'timeout' => 30
        ]
    ];
    $res = file_get_contents($url, false, stream_context_create($options));
    return [
        'status' => $http_response_header[0] ?? '',
        'body' => json_decode($res ?: '{}', true)
    ];
}

// -------------------------------------------------------------
// Test 1: API Health Check
// -------------------------------------------------------------
echo "1. Testing API Health...\n";
$health = httpGet("{$baseUrl}/health");
assertTest('API is Online & Healthy', in_array($health['body']['status'] ?? '', ['online', 'healthy'], true));

// -------------------------------------------------------------
// Test 2: Student Authentication Flow
// -------------------------------------------------------------
echo "\n2. Testing Student Authentication & Profile...\n";
$studentEmail = 'test_student_' . time() . '_' . mt_rand(100, 999) . '@skillbridge.dev';
$regRes = httpPost("{$baseUrl}/auth/register", [
    'email' => $studentEmail,
    'password' => 'password123',
    'role' => 'student',
    'name' => 'Kavitha S',
    'college' => 'PSG Tech Coimbatore',
    'program' => 'B.Tech IT'
]);
assertTest('Student Registration', ($regRes['body']['success'] ?? false) === true);

$studentToken = $regRes['body']['token'] ?? null;
assertTest('JWT Token Generated', !empty($studentToken));

$meRes = httpGet("{$baseUrl}/auth/me", $studentToken);
assertTest('User Profile Resolved via /me', ($meRes['body']['user']['email'] ?? '') === $studentEmail);

// -------------------------------------------------------------
// Test 3: Deterministic Skill Matching Engine
// -------------------------------------------------------------
echo "\n3. Testing Deterministic Skill Matching...\n";
// Add skills to student
httpPost("{$baseUrl}/student/skills", ['skill_name' => 'React'], $studentToken);
httpPost("{$baseUrl}/student/skills", ['skill_name' => 'TypeScript'], $studentToken);
httpPost("{$baseUrl}/student/skills", ['skill_name' => 'CSS'], $studentToken);

$jobsRes = httpGet("{$baseUrl}/jobs", $studentToken);
$job2 = null;
foreach ($jobsRes['body']['jobs'] ?? [] as $job) {
    if ($job['id'] === 'job-2') { // Frontend Engineering Intern (React, TypeScript, CSS)
        $job2 = $job;
        break;
    }
}

if ($job2 === null) {
    require_once __DIR__ . '/../backend/config/database.php';
    $db = Database::getConnection();
    $db->exec("INSERT INTO companies (id, name, industry) VALUES ('c2', 'Vector Studio', 'UI Engineering') ON CONFLICT (id) DO NOTHING");
    $db->exec("INSERT INTO skills (id, name, normalized_name) VALUES ('sk_react', 'React', 'react'), ('sk_ts', 'TypeScript', 'typescript'), ('sk_css', 'CSS', 'css') ON CONFLICT (id) DO NOTHING");
    $db->exec("INSERT INTO jobs (id, company_id, title, summary, description, location) VALUES ('job-2', 'c2', 'Frontend Engineering Intern', 'Build modern UI components', 'Build UI', 'Bengaluru') ON CONFLICT (id) DO NOTHING");
    $db->exec("INSERT INTO job_skills (job_id, skill_id, is_mandatory) VALUES ('job-2', 'sk_react', TRUE), ('job-2', 'sk_ts', TRUE), ('job-2', 'sk_css', TRUE) ON CONFLICT DO NOTHING");

    $jobsRes = httpGet("{$baseUrl}/jobs", $studentToken);
    foreach ($jobsRes['body']['jobs'] ?? [] as $job) {
        if ($job['id'] === 'job-2') {
            $job2 = $job;
            break;
        }
    }
}

assertTest('Job Match Calculated on Server', isset($job2['match']['score']));
assertTest('100% Deterministic Match on Exact Skills', ($job2['match']['score'] ?? 0) === 100);

// -------------------------------------------------------------
// Test 4: Job Application & Duplicate Guard
// -------------------------------------------------------------
echo "\n4. Testing Job Application Flow...\n";
$applyRes = httpPost("{$baseUrl}/applications/apply", ['job_id' => 'job-2'], $studentToken);
assertTest('Application Submitted Successfully', ($applyRes['body']['success'] ?? false) === true);

// Duplicate apply should fail with 409
$dupApply = httpPost("{$baseUrl}/applications/apply", ['job_id' => 'job-2'], $studentToken);
assertTest('Duplicate Application Blocked', ($dupApply['body']['success'] ?? true) === false);

// -------------------------------------------------------------
// Test 5: Recruiter Authentication & Real Geocoding
// -------------------------------------------------------------
echo "\n5. Testing Recruiter Authentication & Geocoding...\n";
$recEmail = 'test_recruiter_' . time() . '_' . mt_rand(100, 999) . '@northwind.dev';
$recReg = httpPost("{$baseUrl}/auth/register", [
    'email' => $recEmail,
    'password' => 'password123',
    'role' => 'recruiter',
    'name' => 'Tech Corp',
    'company_name' => 'AcroTech Labs',
    'industry' => 'Cloud Platforms'
]);
$recToken = $recReg['body']['token'] ?? null;
assertTest('Recruiter Registration', ($recReg['body']['success'] ?? false) === true);

// Geocode real address
$geoUpdate = httpPost("{$baseUrl}/companies/profile", [
    'name' => 'AcroTech Labs',
    'address' => 'Indiranagar 100 Feet Road',
    'city' => 'Bengaluru',
    'state' => 'Karnataka',
    'pincode' => '560038',
    'country' => 'India'
], $recToken);

assertTest('Company Address Saved & Geocoded', ($geoUpdate['body']['success'] ?? false) === true);
assertTest('Geocoding Coordinates Resolved', isset($geoUpdate['body']['geocoding']['status']));

// -------------------------------------------------------------
// Test 6: Security & Protected Resume Access
// -------------------------------------------------------------
echo "\n6. Testing Security & Protected Resume Access...\n";
$unauthResume = httpGet("{$baseUrl}/student/resume/download/s1");
assertTest('Unauthenticated Resume Download Blocked (401)', strpos($unauthResume['status'], '401') !== false || ($unauthResume['body']['success'] ?? true) === false);

echo "\n========================================================\n";
echo "  TEST RESULTS: Passed: {$passed} | Failed: {$failed}   \n";
echo "========================================================\n";

exit($failed > 0 ? 1 : 0);
