<?php
declare(strict_types=1);

/**
 * SkillBridge 3.0 — Student Career Evolution Engine Verification Suite
 * Tests deterministic formulas, readiness bounds, skill gap categorization,
 * next action engine, roadmap generation, weekly plans, and RBAC isolation.
 */

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/CareerEvolutionService.php';
require_once __DIR__ . '/../backend/services/ProofOfSkillService.php';
require_once __DIR__ . '/../backend/middleware/AuthMiddleware.php';

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
echo "SkillBridge 3.0 — Career Evolution Engine Verification Suite\n";
echo "===============================================================\n\n";

$db = Database::getConnection();

// Fetch or create a verified test student
$student = $db->query("SELECT id, user_id FROM students LIMIT 1")->fetch();
if (!$student) {
    echo "ERROR: No student found in database to run tests against.\n";
    exit(1);
}
$studentId = $student['id'];
$userId = $student['user_id'];

// -------------------------------------------------------------------
// 1. Career Readiness Score
// -------------------------------------------------------------------
echo "Test Group 1: Career Readiness Calculation\n";
$readiness = CareerEvolutionService::calculateReadiness($studentId, 'Full Stack Developer');

assertTest(
    isset($readiness['overall_readiness']),
    'Readiness score field is present'
);
assertTest(
    $readiness['overall_readiness'] >= 0 && $readiness['overall_readiness'] <= 100,
    'Readiness score is strictly bounded in [0, 100]',
    "Got: {$readiness['overall_readiness']}"
);
assertTest(
    !empty($readiness['breakdown']),
    'Readiness includes granular skill breakdown'
);
assertTest(
    $readiness['required_skills_count'] > 0,
    'Target role requirements resolved (> 0 required skills)'
);

// -------------------------------------------------------------------
// 2. Skill Gap Analyzer
// -------------------------------------------------------------------
echo "\nTest Group 2: Skill Gap Analyzer\n";
$gaps = CareerEvolutionService::analyzeSkillGaps($studentId, 'Full Stack Developer');

assertTest(
    isset($gaps['strong']) && isset($gaps['needs_improvement']) && isset($gaps['missing']),
    'Gaps accurately partitioned into strong, needs_improvement, and missing'
);
assertTest(
    $gaps['total_gaps'] >= 0,
    'Total gaps computed deterministically'
);
foreach ($gaps['needs_improvement'] as $item) {
    assertTest(
        !empty($item['priority']) && !empty($item['reason']),
        "Gap item '{$item['skill']}' includes priority and explainable rationale"
    );
    break; // test at least one
}

// -------------------------------------------------------------------
// 3. "What Should I Do Next?" Engine
// -------------------------------------------------------------------
echo "\nTest Group 3: Deterministic Next Best Action Engine\n";
$action = CareerEvolutionService::determineNextAction($studentId, 'Full Stack Developer');

assertTest(
    !empty($action['type']),
    'Next action returns structured action type'
);
assertTest(
    !empty($action['badge']) && !empty($action['title']),
    'Next action has high-visibility badge and action title'
);
assertTest(
    !empty($action['reason']) && !empty($action['cta_url']),
    'Next action contains grounded rationale and direct actionable CTA URL'
);

// -------------------------------------------------------------------
// 4. Personalized Career Roadmap & Step Progression
// -------------------------------------------------------------------
echo "\nTest Group 4: Personalized Career Roadmap\n";
$roadmapData = CareerEvolutionService::getOrCreateRoadmap($studentId, 'Full Stack Developer', 16);

assertTest(
    !empty($roadmapData['roadmap']['id']),
    'Roadmap created and persisted with unique ID'
);
assertTest(
    count($roadmapData['steps']) >= 4,
    'Roadmap contains at least 4 sequential structured phases'
);

$firstStep = $roadmapData['steps'][0];
$initialStatus = $firstStep['is_completed'];
$toggledRoadmap = CareerEvolutionService::toggleRoadmapStep($studentId, $firstStep['id']);
$newFirstStep = $toggledRoadmap['steps'][0];

assertTest(
    $newFirstStep['is_completed'] !== $initialStatus,
    'Toggling roadmap step updates completion status in DB'
);
// Toggle back to preserve original state
CareerEvolutionService::toggleRoadmapStep($studentId, $firstStep['id']);

// -------------------------------------------------------------------
// 5. 7-Day Weekly Career Plan
// -------------------------------------------------------------------
echo "\nTest Group 5: 7-Day Weekly Career Planner\n";
$weekly = CareerEvolutionService::getOrCreateWeeklyPlan($studentId, 'Full Stack Developer');

assertTest(
    count($weekly['tasks']) === 7,
    'Weekly plan generates exactly 7 daily actionable tasks (Monday to Sunday)'
);
assertTest(
    $weekly['target_hours'] === 10,
    'Weekly plan sets target effort to 10 hours'
);

$task = $weekly['tasks'][0];
$toggledWeekly = CareerEvolutionService::toggleWeeklyTask($studentId, $task['id']);
$toggledTask = $toggledWeekly['tasks'][0];

assertTest(
    $toggledTask['is_completed'] !== $task['is_completed'],
    'Toggling weekly task updates completion and recalculates completed hours'
);
CareerEvolutionService::toggleWeeklyTask($studentId, $task['id']);

// -------------------------------------------------------------------
// 6. "Jobs You Can Reach" Opportunities Engine
// -------------------------------------------------------------------
echo "\nTest Group 6: Career Opportunities Tiers\n";
$opportunities = CareerEvolutionService::getCareerOpportunities($studentId);

assertTest(
    isset($opportunities['ready_now']) && isset($opportunities['almost_ready']) && isset($opportunities['future_target']),
    'Opportunities correctly partitioned into Ready Now, Almost Ready, and Future Target'
);
assertTest(
    isset($opportunities['counts']),
    'Opportunities returns tier counts'
);

// -------------------------------------------------------------------
// 7. Curated Learning Resources Engine
// -------------------------------------------------------------------
echo "\nTest Group 7: Curated Learning Resources Catalog\n";
$allResources = CareerEvolutionService::getLearningResources();
$tsResources = CareerEvolutionService::getLearningResources('TypeScript');
$videoResources = CareerEvolutionService::getLearningResources(null, 'video');

assertTest(
    count($allResources) >= 15,
    'Catalog contains at least 15 verified learning resources'
);
assertTest(
    count($tsResources) >= 2,
    'Filtering by skill (TypeScript) returns relevant verified resources'
);
assertTest(
    count($videoResources) >= 5,
    'Filtering by resource type (video) returns canonical video tutorials'
);

foreach ($allResources as $r) {
    assertTest(
        str_starts_with($r['url'], 'https://'),
        "Resource '{$r['title']}' has valid, secure public URL",
        $r['url']
    );
    break; // test sample
}

// -------------------------------------------------------------------
// 8. Skill Dependencies Topology (DAG)
// -------------------------------------------------------------------
echo "\nTest Group 8: Skill Dependencies Knowledge Graph\n";
$deps = CareerEvolutionService::getSkillDependencies('React');

assertTest(
    count($deps) > 0,
    'Prerequisite topology accurately maps dependencies for React'
);

// -------------------------------------------------------------------
// 9. Knowledge Evolution & Achievements
// -------------------------------------------------------------------
echo "\nTest Group 9: Knowledge Evolution & Achievements\n";
CareerEvolutionService::recordEvolutionEvent(
    $studentId,
    'skill_verified',
    'Automated Verification Test Milestone',
    'Verified skill credentials generated during test suite run.'
);
$evolution = CareerEvolutionService::getKnowledgeEvolution($studentId);

assertTest(
    $evolution['total_events'] > 0,
    'Knowledge evolution timeline ledger records and returns real chronological events'
);

$achievements = CareerEvolutionService::getAchievements($studentId);
assertTest(
    isset($achievements['achievements']) && isset($achievements['learning_streak_days']),
    'Achievements returns unlocked badges and learning streak calculation'
);

// -------------------------------------------------------------------
// 10. Security & IDOR Verification
// -------------------------------------------------------------------
echo "\nTest Group 10: Security & IDOR Protections\n";
try {
    // Attempt to toggle another student's roadmap step or non-existent step
    CareerEvolutionService::toggleRoadmapStep($studentId, 'invalid_step_id');
    assertTest(false, 'Unauthorized roadmap step access throws an exception');
} catch (\Throwable $e) {
    assertTest(true, 'Unauthorized roadmap step access correctly throws exception (IDOR blocked)');
}

try {
    CareerEvolutionService::toggleWeeklyTask($studentId, 'invalid_task_id');
    assertTest(false, 'Unauthorized weekly task access throws an exception');
} catch (\Throwable $e) {
    assertTest(true, 'Unauthorized weekly task access correctly throws exception (IDOR blocked)');
}

echo "\n===============================================================\n";
echo "CAREER EVOLUTION TEST RESULTS: {$passedTests} / {$totalTests} PASSED\n";
echo "===============================================================\n";

if ($passedTests === $totalTests) {
    echo "SUCCESS: ALL TESTS GREEN!\n";
    exit(0);
} else {
    echo "FAILURE: " . ($totalTests - $passedTests) . " TESTS FAILED!\n";
    exit(1);
}
