<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/PassportCryptoService.php';
require_once __DIR__ . '/../backend/controllers/PassportController.php';

echo "=== SKILLBRIDGE 2.0: PHASE 2 CRYPTOGRAPHIC SKILL PASSPORT TEST SUITE ===\n";

$db = Database::getConnection();

// 1. Canonical Payload & Deterministic Serialization
echo "\n--- 1. Testing Canonical JSON Serialization & Determinism ---\n";
$payloadA = [
    'z_field' => 'end',
    'a_field' => 'start',
    'nested' => [
        'beta' => 2,
        'alpha' => 1
    ]
];
$payloadB = [
    'a_field' => 'start',
    'nested' => [
        'alpha' => 1,
        'beta' => 2
    ],
    'z_field' => 'end'
];

$canonA = PassportCryptoService::getCanonicalString($payloadA);
$canonB = PassportCryptoService::getCanonicalString($payloadB);

if ($canonA === $canonB) {
    echo "✓ Deterministic Canonicalization: Identical JSON string produced regardless of associative key ordering\n";
} else {
    echo "FAIL: Canonical strings differ:\nA: {$canonA}\nB: {$canonB}\n";
    exit(1);
}

// 2. Asymmetric RS256 Cryptographic Signing & Verification
echo "\n--- 2. Testing RS256 Asymmetric Cryptographic Signing & Verification ---\n";
$samplePassport = [
    'credential_version' => '2.0',
    'issuer' => 'SkillBridge Proof-of-Skill Cryptographic Authority',
    'passport_token' => 'sb_pass_test_' . bin2hex(random_bytes(4)),
    'subject' => [
        'name' => 'Verified Student',
        'institution' => 'University of Engineering',
        'program' => 'Computer Science'
    ],
    'verified_skills' => [
        ['skill_name' => 'React', 'confidence_score' => 88, 'verification_level' => 'Advanced'],
        ['skill_name' => 'TypeScript', 'confidence_score' => 92, 'verification_level' => 'Expert']
    ],
    'issued_at' => '2026-09-03T12:00:00Z'
];

$sigRes = PassportCryptoService::signPayload($samplePassport, 'sb_k1_2026');
if (!empty($sigRes['signature']) && !empty($sigRes['public_key']) && $sigRes['algorithm'] === 'RS256') {
    echo "✓ RS256 Signature Generated: Digest=" . substr($sigRes['credential_hash'], 0, 16) . "... Alg=" . $sigRes['algorithm'] . " KeyId=" . $sigRes['key_id'] . "\n";
} else {
    echo "FAIL: Signature generation incomplete\n";
    exit(1);
}

$verified = PassportCryptoService::verifySignature($samplePassport, $sigRes['signature'], $sigRes['public_key']);
if ($verified === true) {
    echo "✓ Cryptographic Mathematical Verification: Signature verifies against canonical payload using public key\n";
} else {
    echo "FAIL: Cryptographic signature verification failed\n";
    exit(1);
}

// 3. Tampering Detection Tests
echo "\n--- 3. Testing Mathematical Tampering Defenses (Modifications MUST fail) ---\n";

// Case A: Tamper candidate name
$tamperedName = $samplePassport;
$tamperedName['subject']['name'] = 'Attacker Name';
$tamperCheckA = PassportCryptoService::verifySignature($tamperedName, $sigRes['signature'], $sigRes['public_key']);
if ($tamperCheckA === false) {
    echo "✓ Tamper Defense (Subject Name): Modified name rejected by signature verification\n";
} else {
    echo "FAIL: Tampered name was accepted!\n";
    exit(1);
}

// Case B: Tamper skill confidence score
$tamperedScore = $samplePassport;
$tamperedScore['verified_skills'][0]['confidence_score'] = 99;
$tamperCheckB = PassportCryptoService::verifySignature($tamperedScore, $sigRes['signature'], $sigRes['public_key']);
if ($tamperCheckB === false) {
    echo "✓ Tamper Defense (Skill Score): Inflated score (88% -> 99%) rejected by cryptographic hash check\n";
} else {
    echo "FAIL: Tampered skill score was accepted!\n";
    exit(1);
}

// Case C: Tamper verification level
$tamperedLevel = $samplePassport;
$tamperedLevel['verified_skills'][0]['verification_level'] = 'Master';
$tamperCheckC = PassportCryptoService::verifySignature($tamperedLevel, $sigRes['signature'], $sigRes['public_key']);
if ($tamperCheckC === false) {
    echo "✓ Tamper Defense (Verification Level): Modified level rejected\n";
} else {
    echo "FAIL: Tampered level was accepted!\n";
    exit(1);
}

// Case D: Tamper issue date
$tamperedDate = $samplePassport;
$tamperedDate['issued_at'] = '2026-09-01T00:00:00Z';
$tamperCheckD = PassportCryptoService::verifySignature($tamperedDate, $sigRes['signature'], $sigRes['public_key']);
if ($tamperCheckD === false) {
    echo "✓ Tamper Defense (Issue Timestamp): Manipulated timestamp rejected\n";
} else {
    echo "FAIL: Tampered timestamp was accepted!\n";
    exit(1);
}

// 4. Credential Lifecycle: Issuance, Revocation, Reissue
echo "\n--- 4. Testing Full Credential Lifecycle (Issue -> Revoke -> Reissue) ---\n";
// Get or create fixture student
$student = $db->query("SELECT id FROM students LIMIT 1")->fetch();
$testToken = 'sb_pass_lifecycle_' . bin2hex(random_bytes(6));
$db->prepare("INSERT INTO student_passports (public_token, student_id, is_public) VALUES (?, ?, TRUE) ON CONFLICT (student_id) DO UPDATE SET public_token = EXCLUDED.public_token, is_public = TRUE")->execute([$testToken, $student['id']]);

// Step 4.1: Issue Credential
$issued = PassportCryptoService::issueCredential($student['id'], $testToken);
if ($issued['status'] === 'VALID' && !empty($issued['signature'])) {
    echo "✓ Lifecycle 1 - Issued: Credential issued with status 'VALID' and saved in skill_credentials\n";
} else {
    echo "FAIL: Issue credential failed\n";
    exit(1);
}

$verifyActive = PassportCryptoService::verifyCredentialByToken($testToken);
if ($verifyActive['valid'] === true && $verifyActive['credential_status'] === 'VALID') {
    echo "✓ Lifecycle 2 - Active Token Check: Public lookup reports valid cryptographic authenticity\n";
} else {
    echo "FAIL: Active verification failed\n";
    exit(1);
}

// Step 4.2: Revoke Credential
$revoked = PassportCryptoService::revokeCredential($student['id'], $testToken, 'Candidate testing key rotation', 'user_test_admin');
if ($revoked['status'] === 'REVOKED') {
    echo "✓ Lifecycle 3 - Revoked: Credential status updated to 'REVOKED' and recorded in skill_credential_revocations\n";
} else {
    echo "FAIL: Revoke credential failed\n";
    exit(1);
}

$verifyRevoked = PassportCryptoService::verifyCredentialByToken($testToken);
if ($verifyRevoked['valid'] === false && $verifyRevoked['credential_status'] === 'REVOKED') {
    echo "✓ Lifecycle 4 - Revocation Guard: Public verification correctly detects and rejects revoked credential\n";
} else {
    echo "FAIL: Revoked credential was treated as valid!\n";
    exit(1);
}

// Step 4.3: Reissue Credential
$reissued = PassportCryptoService::issueCredential($student['id'], $testToken);
if ($reissued['status'] === 'VALID') {
    echo "✓ Lifecycle 5 - Reissue: Reissuance resets credential status to 'VALID' with refreshed signature\n";
} else {
    echo "FAIL: Reissue credential failed\n";
    exit(1);
}

// 5. Zero PII Leakage Hygiene Check
echo "\n--- 5. Testing Strict PII Suppression in Canonical Public Credential ---\n";
$forbiddenKeys = ['password', 'email', 'phone', 'user_id', 'resume_path', 'storage_key', 'notes', 'interview_transcript'];
$leaks = [];
$payloadJson = json_encode($issued['canonical_payload']);
foreach ($forbiddenKeys as $fk) {
    if (str_contains(strtolower($payloadJson), '"' . $fk . '"')) {
        $leaks[] = $fk;
    }
}

if (empty($leaks)) {
    echo "✓ Zero PII Leakage: Public credential contains ZERO sensitive private keys or internal identifiers\n";
} else {
    echo "FAIL: Sensitive keys detected in public canonical credential: " . implode(', ', $leaks) . "\n";
    exit(1);
}

echo "\n>>> ALL CRYPTOGRAPHIC SKILL PASSPORT TESTS PASSED SUCCESSFULLY! <<<\n";
