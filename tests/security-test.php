<?php
declare(strict_types=1);

/**
 * SkillBridge Production Security Test Suite
 */

echo "========================================================\n";
echo "    SKILLBRIDGE PRODUCTION SECURITY VERIFICATION       \n";
echo "========================================================\n\n";

$baseUrl = 'http://localhost:8000/api';
$passed = 0;
$failed = 0;

function assertSec(string $title, bool $condition, string $details = ''): void {
    global $passed, $failed;
    if ($condition) {
        echo "  [SEC PASS] {$title}\n";
        $passed++;
    } else {
        echo "  [SEC FAIL] {$title} -- {$details}\n";
        $failed++;
    }
}

// -------------------------------------------------------------
// 1. Security Headers Verification
// -------------------------------------------------------------
echo "1. Verifying Security Headers on API responses...\n";
$headers = get_headers("{$baseUrl}/health", true);
assertSec('X-Content-Type-Options header present', ($headers['X-Content-Type-Options'] ?? '') === 'nosniff');
assertSec('X-Frame-Options header present', ($headers['X-Frame-Options'] ?? '') === 'SAMEORIGIN');
assertSec('X-XSS-Protection header present', isset($headers['X-XSS-Protection']));
assertSec('Referrer-Policy header present', ($headers['Referrer-Policy'] ?? '') === 'strict-origin-when-cross-origin');

// -------------------------------------------------------------
// 2. SQL Injection Resistance
// -------------------------------------------------------------
echo "\n2. Testing SQL Injection Resistance...\n";
$sqliPayload = "' OR 1=1 --";
$sqliUrl = "{$baseUrl}/jobs?search=" . urlencode($sqliPayload);
$res = @file_get_contents($sqliUrl);
$data = json_decode($res ?: '{}', true);

assertSec('SQL Injection payload handled safely without query crash', ($data['success'] ?? false) === true);

// -------------------------------------------------------------
// 3. Auth Rate Limiting Verification
// -------------------------------------------------------------
echo "\n3. Testing Auth Rate Limiter...\n";
$rateLimitTriggered = false;
for ($i = 0; $i < 20; $i++) {
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => json_encode(['email' => 'spam@test.com', 'password' => 'wrong']),
            'ignore_errors' => true
        ]
    ];
    $r = file_get_contents("{$baseUrl}/auth/login", false, stream_context_create($options));
    if (strpos($http_response_header[0] ?? '', '429') !== false) {
        $rateLimitTriggered = true;
        break;
    }
}
assertSec('Rate Limiter blocks brute force attempts with HTTP 429', $rateLimitTriggered);

// -------------------------------------------------------------
// 4. Executable Upload File Rejection
// -------------------------------------------------------------
echo "\n4. Testing Executable Upload Rejection...\n";
require_once dirname(__DIR__) . '/backend/services/FileUploadService.php';

$maliciousFile = [
    'name' => 'payload.php',
    'type' => 'application/x-php',
    'tmp_name' => tempnam(sys_get_temp_dir(), 'test_'),
    'error' => UPLOAD_ERR_OK,
    'size' => 1024
];
file_put_contents($maliciousFile['tmp_name'], '<?php echo "evil"; ?>');

$uploadResult = FileUploadService::uploadResume($maliciousFile);
@unlink($maliciousFile['tmp_name']);

assertSec('Executable (.php) upload strictly blocked', $uploadResult['success'] === false);

echo "\n========================================================\n";
echo "  SECURITY AUDIT RESULTS: Passed: {$passed} | Failed: {$failed} \n";
echo "========================================================\n";

exit($failed > 0 ? 1 : 0);
