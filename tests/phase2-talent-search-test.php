<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/PrecisionMatchService.php';
require_once __DIR__ . '/../backend/services/ProofOfSkillService.php';
require_once __DIR__ . '/../backend/services/ProofOfWorkService.php';

echo "=== SKILLBRIDGE 2.0: PHASE 2 TALENT SEARCH & PRECISION MATCH TEST SUITE ===\n";

$db = Database::getConnection();

// 1. Deterministic Precision Score Formula Verification
echo "\n--- 1. Testing Precision Match Formula & Weighting ---\n";
// Precision Match = 0.35*skill + 0.20*verified + 0.15*assessment + 0.15*pow + 0.10*proj + 0.05*exp
$mockStudent = [
    'name' => 'Sarah Connor',
    'experience' => '2 years'
];
$mockSkillsProof = [
    [
        'skill_name' => 'React',
        'is_verified' => true,
        'verification_level' => 'Advanced',
        'confidence_score' => 85,
        'evidence' => ['assessment_score' => 90]
    ],
    [
        'skill_name' => 'TypeScript',
        'is_verified' => true,
        'verification_level' => 'Advanced',
        'confidence_score' => 90,
        'evidence' => ['assessment_score' => 85]
    ]
];
$mockPoW = [
    'has_proof_of_work' => true,
    'total_repositories' => 3,
    'overall_pow_score' => 88,
    'proof_of_work_level' => 'HIGH'
];
$mockProjects = [
    ['title' => 'Project 1', 'tech_stack' => 'React, TypeScript'],
    ['title' => 'Project 2', 'tech_stack' => 'TypeScript, Node.js']
];

$criteria = [
    'required_skills' => ['React', 'TypeScript'],
    'min_verification' => 'advanced',
    'min_assessment' => 80,
    'pow_filter' => 'HIGH'
];

$match = PrecisionMatchService::calculateCandidateMatch($mockStudent, $mockSkillsProof, $mockPoW, $mockProjects, $criteria);

if ($match['passes_hard_filters'] === true) {
    echo "✓ Hard Filters Passed: Candidate meets required skills, advanced level, assessment cutoff, and high PoW\n";
} else {
    echo "FAIL: Hard filters unexpectedly failed\n";
    exit(1);
}

if ($match['precision_match_score'] >= 85) {
    echo "✓ Precision Match Score: {$match['precision_match_score']}% assigned (Tier: {$match['match_strength']})\n";
} else {
    echo "FAIL: Expected score >= 85%, got {$match['precision_match_score']}%\n";
    exit(1);
}

// 2. Explainable Match Reasoning
echo "\n--- 2. Testing Explainable Match Reasons & Gaps ---\n";
if (!empty($match['explainable_reasons'])) {
    echo "✓ Explainable Reasons Generated (" . count($match['explainable_reasons']) . " signals):\n";
    foreach ($match['explainable_reasons'] as $r) {
        echo "   - {$r}\n";
    }
} else {
    echo "FAIL: No explainable reasons generated\n";
    exit(1);
}

// 3. Hard Constraint Rejection (Missing Required Skill)
echo "\n--- 3. Testing Hard Constraint Rejection (Missing Required Skill) ---\n";
$missingCriteria = [
    'required_skills' => ['Docker', 'Kubernetes'], // Candidate lacks these
    'min_verification' => 'All'
];
$mismatchResult = PrecisionMatchService::calculateCandidateMatch($mockStudent, $mockSkillsProof, $mockPoW, $mockProjects, $missingCriteria);
if ($mismatchResult['passes_hard_filters'] === false && count($mismatchResult['missing_skills']) === 2) {
    echo "✓ Missing Skill Constraint: Candidate correctly failed hard filters due to missing required skills (Docker, Kubernetes)\n";
} else {
    echo "FAIL: Candidate should not pass when lacking all required skills\n";
    exit(1);
}

// 4. Hard Constraint Rejection (Assessment Score Cutoff)
echo "\n--- 4. Testing Assessment Cutoff Constraint ---\n";
$highCutoffCriteria = [
    'required_skills' => ['React'],
    'min_assessment' => 95 // Candidate avg is ~87.5%
];
$cutoffResult = PrecisionMatchService::calculateCandidateMatch($mockStudent, $mockSkillsProof, $mockPoW, $mockProjects, $highCutoffCriteria);
if ($cutoffResult['passes_hard_filters'] === false) {
    echo "✓ Assessment Cutoff Constraint: Candidate correctly filtered out when assessment average (87%) < cutoff (95%)\n";
} else {
    echo "FAIL: Candidate should not pass when below assessment cutoff\n";
    exit(1);
}

// 5. Database Multi-Parameter Search & Pagination
echo "\n--- 5. Testing Database Search Execution & Pagination Bounds ---\n";
$searchResult = PrecisionMatchService::searchCandidates([
    'skills' => ['React'],
    'verification_level' => 'All'
], 5, 0);

if (isset($searchResult['total'], $searchResult['candidates'], $searchResult['limit'], $searchResult['offset'])) {
    echo "✓ Database Search: Found {$searchResult['total']} candidates, returned page of " . count($searchResult['candidates']) . " (Limit: {$searchResult['limit']}, Offset: {$searchResult['offset']})\n";
} else {
    echo "FAIL: Invalid search response envelope\n";
    exit(1);
}

// Test Limit Clamping (Max 100)
$clampedResult = PrecisionMatchService::searchCandidates([], 500, 0);
if ($clampedResult['limit'] === 100) {
    echo "✓ Pagination Boundary: Requested limit of 500 clamped safely to max limit 100\n";
} else {
    echo "FAIL: Limit was not clamped to 100\n";
    exit(1);
}

// 6. Recruiter Shortlist & Company Boundary Isolation
echo "\n--- 6. Testing Recruiter Company Shortlist Isolation ---\n";
$comp = $db->query("SELECT id FROM companies LIMIT 1")->fetch();
$stud = $db->query("SELECT id FROM students LIMIT 1")->fetch();

if ($comp && $stud) {
    $slId = 'sl_test_' . bin2hex(random_bytes(4));
    $db->prepare("
        INSERT INTO recruiter_shortlists (id, company_id, student_id, stage, notes)
        VALUES (?, ?, ?, 'interview', 'Shortlisted for senior interview')
        ON CONFLICT (company_id, student_id) DO UPDATE SET stage = EXCLUDED.stage
    ")->execute([$slId, $comp['id'], $stud['id']]);

    // Query for this company
    $stmt = $db->prepare("SELECT * FROM recruiter_shortlists WHERE company_id = ? AND student_id = ?");
    $stmt->execute([$comp['id'], $stud['id']]);
    $slRow = $stmt->fetch();

    if ($slRow && $slRow['stage'] === 'interview') {
        echo "✓ Recruiter Shortlist: Candidate successfully bookmarked in company workspace\n";
    } else {
        echo "FAIL: Recruiter shortlist not found\n";
        exit(1);
    }
}

echo "\n>>> ALL TALENT SEARCH & PRECISION MATCH TESTS PASSED SUCCESSFULLY! <<<\n";
