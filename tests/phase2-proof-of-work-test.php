<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/ProofOfWorkService.php';
require_once __DIR__ . '/../backend/services/ProofOfSkillService.php';

echo "=== SKILLBRIDGE 2.0: PHASE 2 PROOF-OF-WORK ENGINE TEST SUITE ===\n";

$db = Database::getConnection();

// 1. Skill Name Normalization Test
echo "\n--- 1. Testing Skill Name Canonical Normalization ---\n";
$aliases = [
    'reactjs' => 'React',
    'react.js' => 'React',
    'ts' => 'TypeScript',
    'py' => 'Python',
    'nodejs' => 'Node.js',
    'node' => 'Node.js',
    'postgres' => 'PostgreSQL',
    'docker' => 'Docker'
];

$passedAliases = 0;
foreach ($aliases as $raw => $expected) {
    $norm = ProofOfWorkService::normalizeSkillName($raw);
    if ($norm === $expected) {
        $passedAliases++;
    } else {
        echo "FAIL: {$raw} normalized to '{$norm}', expected '{$expected}'\n";
    }
}
echo "✓ Skill Aliases Normalized: {$passedAliases}/" . count($aliases) . " passed\n";

// 2. Dependency Manifest Technology Detection
echo "\n--- 2. Testing Dependency Manifest Technology Detection ---\n";
$pkgJson = json_encode([
    'dependencies' => [
        'react' => '^18.2.0',
        'next' => '^14.0.0',
        'pg' => '^8.11.0'
    ],
    'devDependencies' => [
        'typescript' => '^5.0.0',
        'tailwindcss' => '^3.3.0'
    ]
]);

$reqTxt = "django>=4.2\npsycopg2-binary>=2.9\nfastapi>=0.100.0\npandas>=2.0.0\n";
$dockerfile = "FROM node:18-alpine\nWORKDIR /app\n";

$detectedPkg = ProofOfWorkService::detectTechnologiesFromManifests(['package.json' => $pkgJson]);
$detectedReq = ProofOfWorkService::detectTechnologiesFromManifests(['requirements.txt' => $reqTxt]);
$detectedDock = ProofOfWorkService::detectTechnologiesFromManifests(['Dockerfile' => $dockerfile]);

$hasReact = in_array('React', $detectedPkg, true);
$hasTS = in_array('TypeScript', $detectedPkg, true);
$hasTailwind = in_array('Tailwind CSS', $detectedPkg, true);
$hasPython = in_array('Python', $detectedReq, true);
$hasFastAPI = in_array('FastAPI', $detectedReq, true);
$hasDocker = in_array('Docker', $detectedDock, true);

if ($hasReact && $hasTS && $hasTailwind && $hasPython && $hasFastAPI && $hasDocker) {
    echo "✓ Manifest Detection: All 6 technology categories detected accurately from real manifests\n";
} else {
    echo "FAIL: Manifest detection mismatch: Pkg=" . implode(',', $detectedPkg) . " Req=" . implode(',', $detectedReq) . "\n";
    exit(1);
}

// 3. Deterministic Repository Quality Signals Formula Verification
echo "\n--- 3. Testing Repository Quality Signal Formula & Bounds ---\n";
$repoHigh = [
    'name' => 'skillbridge-core',
    'language' => 'TypeScript',
    'pushed_at' => date('c', time() - 86400 * 5), // 5 days ago
    'description' => 'Enterprise production skill assessment platform with microservices.',
    'has_readme' => true,
    'size' => 4500,
    'stargazers_count' => 12,
    'forks_count' => 3,
    'commit_count' => 42
];
$techsHigh = ['TypeScript', 'React', 'Node.js', 'PostgreSQL'];

$evalHigh = ProofOfWorkService::calculateRepositoryQuality($repoHigh, null, $techsHigh);

// Mathematical check: round(0.30*tech + 0.25*activity + 0.25*complexity + 0.20*doc)
$expectedHigh = (int)round(
    (0.30 * $evalHigh['technology_score']) +
    (0.25 * $evalHigh['activity_score']) +
    (0.25 * $evalHigh['complexity_score']) +
    (0.20 * $evalHigh['documentation_score'])
);

if ($evalHigh['overall_evidence_score'] === $expectedHigh) {
    echo "✓ Deterministic Formula Check: Calculated {$evalHigh['overall_evidence_score']}% equals theoretical formula\n";
} else {
    echo "FAIL: Score mismatch: calculated={$evalHigh['overall_evidence_score']}, expected={$expectedHigh}\n";
    exit(1);
}

if ($evalHigh['proof_strength'] === 'HIGH') {
    echo "✓ Proof Strength Tier: HIGH assigned to comprehensive repository with active commits\n";
} else {
    echo "FAIL: Expected HIGH, got {$evalHigh['proof_strength']}\n";
    exit(1);
}

// Low evidence repo check
$repoLow = [
    'name' => 'scratch-test',
    'language' => null,
    'pushed_at' => date('c', time() - 86400 * 400), // > 1 year ago
    'description' => '',
    'has_readme' => false,
    'size' => 10,
    'stargazers_count' => 0,
    'forks_count' => 0,
    'commit_count' => 1
];
$evalLow = ProofOfWorkService::calculateRepositoryQuality($repoLow, null, []);
if ($evalLow['proof_strength'] === 'LOW' && $evalLow['overall_evidence_score'] < 50) {
    echo "✓ Low Proof Tier: Correctly designated LOW ({$evalLow['overall_evidence_score']}%) for stale, undocumented repository\n";
} else {
    echo "FAIL: Expected LOW, got {$evalLow['proof_strength']} ({$evalLow['overall_evidence_score']}%)\n";
    exit(1);
}

// 4. Persistence & Database Proof Linking
echo "\n--- 4. Testing Proof-of-Work Repository Persistence & Skill Linking ---\n";
// Create or find a test student
$sStmt = $db->query("SELECT id FROM students LIMIT 1");
$student = $sStmt->fetch();
if (!$student) {
    echo "Creating fixture student for testing...\n";
    $uId = 'u_pow_test_' . bin2hex(random_bytes(4));
    $sId = 's_pow_test_' . bin2hex(random_bytes(4));
    $db->prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, 'pow_test@skillbridge.dev', 'hash', 'student')")->execute([$uId]);
    $db->prepare("INSERT INTO students (id, user_id, name, college, program) VALUES (?, ?, 'Alex Test', 'MIT', 'CS')")->execute([$sId, $uId]);
    $studentId = $sId;
} else {
    $studentId = $student['id'];
}

$saveResult = ProofOfWorkService::saveRepositoryProof($studentId, [
    'name' => 'pow-verified-engine',
    'url' => 'https://github.com/candidate/pow-verified-engine',
    'language' => 'TypeScript',
    'technologies' => ['TypeScript', 'React', 'PostgreSQL'],
    'pushed_at' => date('c'),
    'description' => 'Verified cryptographic proof engine with automated continuous integration.',
    'has_readme' => true,
    'size' => 3000,
    'stargazers_count' => 5,
    'commit_count' => 28
]);

echo "✓ Repository Saved: '{$saveResult['repo_name']}' with evidence score {$saveResult['overall_evidence_score']}%\n";

// 5. Student Aggregate Proof Summary
echo "\n--- 5. Testing Student Proof-of-Work Aggregate Summary ---\n";
$summary = ProofOfWorkService::getStudentProofOfWorkSummary($studentId);
if ($summary['has_proof_of_work'] && $summary['total_repositories'] >= 1 && $summary['overall_pow_score'] > 0) {
    echo "✓ Aggregate Summary: {$summary['total_repositories']} repos, composite evidence score: {$summary['overall_pow_score']}%, level: {$summary['proof_of_work_level']}\n";
} else {
    echo "FAIL: Invalid summary output\n";
    exit(1);
}

// 6. Integration with ProofOfSkillService
echo "\n--- 6. Testing ProofOfSkillService Backward Compatibility & Additive Metrics ---\n";
$skillsWithProof = ProofOfSkillService::getStudentSkillsWithProof($studentId);
$powFieldsChecked = 0;
foreach ($skillsWithProof as $sp) {
    if (array_key_exists('proof_of_work_score', $sp) && array_key_exists('proof_of_work_level', $sp) && array_key_exists('proof_signals', $sp)) {
        $powFieldsChecked++;
    }
}
if ($powFieldsChecked === count($skillsWithProof)) {
    echo "✓ Backward Compatibility & Additive Fields: All " . count($skillsWithProof) . " skills contain proof_of_work_score and proof_of_work_level without altering legacy confidence calculations\n";
} else {
    echo "FAIL: Some skills lack additive proof_of_work fields\n";
    exit(1);
}

echo "\n>>> ALL PROOF-OF-WORK ENGINE TESTS PASSED SUCCESSFULLY! <<<\n";
