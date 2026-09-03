<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/SkillVerificationService.php';
require_once __DIR__ . '/../backend/services/SkillIntegrityService.php';
require_once __DIR__ . '/../backend/services/ProofOfSkillService.php';
require_once __DIR__ . '/../backend/controllers/InterviewAIController.php';

echo "============================================================\n";
echo "SKILLBRIDGE 2.0 - PHASE 1 VERIFICATION TEST SUITE\n";
echo "============================================================\n\n";

$db = Database::getConnection();

function assertTest(bool $condition, string $description): void {
    if ($condition) {
        echo "  ✅ PASS: {$description}\n";
    } else {
        echo "  ❌ FAIL: {$description}\n";
        exit(1);
    }
}

// 1. Setup Test Student
$testUserId = 'usr_phase1_test_' . bin2hex(random_bytes(4));
$testStudentId = 'stu_phase1_test_' . bin2hex(random_bytes(4));

$insUser = $db->prepare('
    INSERT INTO users (id, email, password_hash, role)
    VALUES (?, ?, \'$2y$10$abcdefghijklmnopqrstuv\', \'student\')
    ON CONFLICT (email) DO NOTHING
');
$insUser->execute([$testUserId, "tester_{$testUserId}@example.com"]);

$insStu = $db->prepare('
    INSERT INTO students (id, user_id, name, college, program)
    VALUES (?, ?, \'Phase1 Tester\', \'Test Engineering College\', \'Computer Science\')
');
$insStu->execute([$testStudentId, $testUserId]);

echo "1. Initialized test student [{$testStudentId}]\n";

// Add test skill
$skStmt = $db->prepare('SELECT id FROM skills WHERE normalized_name = \'react\' LIMIT 1');
$skStmt->execute();
$skillId = $skStmt->fetchColumn();
if (!$skillId) {
    $skillId = 'sk_react_test';
    $db->prepare('INSERT INTO skills (id, name, normalized_name) VALUES (?, \'React\', \'react\')')->execute([$skillId]);
}

$insSs = $db->prepare('
    INSERT INTO student_skills (student_id, skill_id, proficiency)
    VALUES (?, ?, \'intermediate\')
    ON CONFLICT (student_id, skill_id) DO UPDATE SET proficiency = \'intermediate\'
');
$insSs->execute([$testStudentId, $skillId]);

// 2. Test Skill Verification Engine (Start Attempt)
echo "\n2. Testing AI Skill Verification 2.0 Initialization...\n";
$startRes = SkillVerificationService::startVerification($testStudentId, 'React', 'intermediate');
assertTest($startRes['success'] === true, 'Verification session started successfully');
assertTest(!empty($startRes['attempt_id']), 'Received valid attempt_id: ' . $startRes['attempt_id']);
assertTest($startRes['total_questions'] === 4, 'Total questions generated is exactly 4');

$attemptId = $startRes['attempt_id'];

// 3. Test Question Retrieval & Client Security
echo "\n3. Testing Question Retrieval & Information Security...\n";
$q0 = SkillVerificationService::getQuestion($testStudentId, $attemptId, 0);
assertTest($q0['success'] === true, 'Retrieved Question 0');
assertTest($q0['question']['category'] === SkillVerificationService::CATEGORY_CONCEPTUAL, 'Q0 is Conceptual Foundations');
assertTest(!empty($q0['question']['options']), 'Q0 has options');
assertTest(!isset($q0['question']['expected_answer']), 'Security: expected_answer is hidden from client');

// 4. Test Submitting Answers Deterministically
echo "\n4. Testing Deterministic Answer Submission...\n";
// Look up actual expected answers from DB for this attempt to test both correct and incorrect scoring
$dbQuestions = $db->prepare('SELECT id, question_index, category, points, expected_answer FROM skill_verification_questions WHERE attempt_id = ? ORDER BY question_index ASC');
$dbQuestions->execute([$attemptId]);
$qRows = $dbQuestions->fetchAll();
assertTest(count($qRows) === 4, '4 questions stored in database for attempt');

// Answer Q0 correctly
$ans0 = SkillVerificationService::submitAnswer($testStudentId, $attemptId, $qRows[0]['id'], $qRows[0]['expected_answer']);
assertTest($ans0['success'] === true && $ans0['is_correct'] === true, 'Answered Q0 correctly');

// Answer Q1 correctly
$ans1 = SkillVerificationService::submitAnswer($testStudentId, $attemptId, $qRows[1]['id'], $qRows[1]['expected_answer']);
assertTest($ans1['success'] === true && $ans1['is_correct'] === true, 'Answered Q1 correctly');

// Answer Q2 correctly
$ans2 = SkillVerificationService::submitAnswer($testStudentId, $attemptId, $qRows[2]['id'], $qRows[2]['expected_answer']);
assertTest($ans2['success'] === true && $ans2['is_correct'] === true, 'Answered Q2 correctly');

// Answer Q3 with wrong option to verify partial deterministic scoring
$wrongOption = ($qRows[3]['expected_answer'] === 'A') ? 'C' : 'A';
$ans3 = SkillVerificationService::submitAnswer($testStudentId, $attemptId, $qRows[3]['id'], $wrongOption);
assertTest($ans3['success'] === true && $ans3['is_correct'] === false, 'Answered Q3 with wrong answer (scored 0)');

// 5. Test Completion & Scoring Calculation
echo "\n5. Testing Finalization & Deterministic Weighted Scoring...\n";
$completeRes = SkillVerificationService::completeVerification($testStudentId, $attemptId);
assertTest($completeRes['success'] === true, 'Verification finalized successfully');
// Q0: 20%, Q1: 30%, Q2: 25%, Q3: 0% -> Expected score: 75%
assertTest((float)$completeRes['score'] === 75.0, 'Calculated deterministic weighted score is exactly 75%');
assertTest($completeRes['verified_level'] === 'Advanced', 'Score 75% mapped to level Advanced');
assertTest($completeRes['passed'] === true, 'Score 75% is marked passed (>= 60%)');

// Verify database updates
$evStmt = $db->prepare('SELECT confidence FROM skill_evidence WHERE student_id = ? AND skill_id = ? AND source = \'assessment\'');
$evStmt->execute([$testStudentId, $skillId]);
$evConf = (float)$evStmt->fetchColumn();
assertTest($evConf === 75.0, 'skill_evidence updated with assessment confidence 75%');

// 6. Test Skill Integrity Cross-Referencing
echo "\n6. Testing Skill Integrity Engine & Non-punitive Mismatch Detection...\n";
$audit = SkillIntegrityService::auditStudentSkill($testStudentId, $skillId);
assertTest($audit['status'] === SkillIntegrityService::STATUS_VERIFIED, 'Integrity audit status is VERIFIED after passing assessment');
assertTest(!empty($audit['evidence_sources']), 'Evidence sources recorded');
assertTest(!empty($audit['recommendations']), 'Constructive recommendations provided');

// Add an unverified skill to test non-punitive audit
$skPyStmt = $db->prepare('SELECT id FROM skills WHERE normalized_name = \'python\' LIMIT 1');
$skPyStmt->execute();
$pySkillId = $skPyStmt->fetchColumn();
if (!$pySkillId) {
    $pySkillId = 'sk_python_test';
    $db->prepare('INSERT INTO skills (id, name, normalized_name) VALUES (?, \'Python\', \'python\')')->execute([$pySkillId]);
}
$db->prepare('INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES (?, ?, \'expert\') ON CONFLICT (student_id, skill_id) DO UPDATE SET proficiency = \'expert\'')->execute([$testStudentId, $pySkillId]);

$pyAudit = SkillIntegrityService::auditStudentSkill($testStudentId, $pySkillId);
assertTest($pyAudit['status'] === SkillIntegrityService::STATUS_NOT_VERIFIED, 'Unassessed claimed expert skill classified non-punitively as NOT_VERIFIED');

// 7. Test ProofOfSkillService 5-Factor Integration
echo "\n7. Testing ProofOfSkillService Integration...\n";
$proofSkills = ProofOfSkillService::getStudentSkillsWithProof($testStudentId);
assertTest(count($proofSkills) >= 2, 'ProofOfSkillService returned candidate skills');
$reactProof = null;
foreach ($proofSkills as $ps) {
    if ($ps['skill_id'] === $skillId) {
        $reactProof = $ps;
        break;
    }
}
assertTest($reactProof !== null, 'React skill found in proof list');
assertTest($reactProof['evidence']['assessment'] === true, 'Assessment evidence flag is true');
assertTest($reactProof['evidence']['assessment_score'] === 75, 'Assessment score is 75 in ProofOfSkill');
assertTest($reactProof['integrity_status'] === 'VERIFIED', 'Integrity status VERIFIED reflected in ProofOfSkill');

// 8. Test IDOR Security Protection
echo "\n8. Testing IDOR & Authorization Protections...\n";
$attackerUserId = 'usr_atk_' . bin2hex(random_bytes(4));
$insUser->execute([$attackerUserId, "atk_{$attackerUserId}@example.com"]);
$attackerStudentId = 'stu_attacker_' . bin2hex(random_bytes(4));
$db->prepare('INSERT INTO students (id, user_id, name, college, program) VALUES (?, ?, \'Attacker\', \'Attacker College\', \'Security\')')->execute([$attackerStudentId, $attackerUserId]);

$idorBlocked = false;
try {
    SkillVerificationService::getQuestion($attackerStudentId, $attemptId, 0);
} catch (\Throwable $e) {
    $idorBlocked = true;
}
assertTest($idorBlocked === true, 'IDOR Blocked: Student B cannot access Student A verification attempt');

$idorSubmitBlocked = false;
try {
    SkillVerificationService::submitAnswer($attackerStudentId, $attemptId, $qRows[0]['id'], 'B');
} catch (\Throwable $e) {
    $idorSubmitBlocked = true;
}
assertTest($idorSubmitBlocked === true, 'IDOR Blocked: Student B cannot submit answers to Student A verification attempt');

// 9. Clean up test data
echo "\n9. Cleaning up test fixtures...\n";
$db->prepare('DELETE FROM students WHERE id IN (?, ?)')->execute([$testStudentId, $attackerStudentId]);
$db->prepare('DELETE FROM users WHERE id IN (?, ?)')->execute([$testUserId, $attackerUserId]);
echo "  ✅ Cleaned up test student and user records\n";

echo "\n============================================================\n";
echo "🎉 ALL PHASE 1 CORE VERIFICATION TESTS PASSED SUCCESSFULLY!\n";
echo "============================================================\n";
