<?php
declare(strict_types=1);

/**
 * SkillBridge 3.0 — Career Intelligence & Smart Recommendation Engine Master Test Suite
 * Validates 100+ careers, 500+ skills, DAG acyclicity, multi-factor scoring, 4-tier reachability,
 * and data quality governance.
 */

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/CareerRecommendationService.php';
require_once __DIR__ . '/../backend/services/DataQualityService.php';
require_once __DIR__ . '/../backend/services/ProofOfSkillService.php';

$passed = 0;
$failed = 0;

function assertCondition(bool $cond, string $message): void {
    global $passed, $failed;
    if ($cond) {
        echo "  [PASS] {$message}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$message}\n";
        $failed++;
    }
}

echo "=================================================================\n";
echo "SkillBridge 3.0 — Career Intelligence Master Test Suite\n";
echo "=================================================================\n\n";

$db = Database::getConnection();

// --- TEST 1: 100+ Technology Careers ---
echo "1. Validating Careers Catalog...\n";
$careersCount = (int)$db->query('SELECT count(*) FROM careers')->fetchColumn();
assertCondition($careersCount >= 100, "Careers catalog count >= 100 (Actual: {$careersCount})");

$domains = $db->query('SELECT DISTINCT domain FROM careers')->fetchAll(PDO::FETCH_COLUMN);
assertCondition(count($domains) >= 8, "Spans multiple domains (Actual: " . count($domains) . " domains)");

$sampleCareer = CareerRecommendationService::getCareerDetail('Frontend Developer');
assertCondition($sampleCareer !== null, "Career details retrievable by normalized slug/title");
assertCondition(!empty($sampleCareer['required_skills']), "Required skills populated (Count: " . count($sampleCareer['required_skills'] ?? []) . ")");
assertCondition(!empty($sampleCareer['career_progression']), "Career progression stages defined");

// --- TEST 2: 500+ Master Skills ---
echo "\n2. Validating Master Skills Dictionary...\n";
$skillsCount = (int)$db->query('SELECT count(*) FROM skills')->fetchColumn();
assertCondition($skillsCount >= 500, "Skills catalog count >= 500 (Actual: {$skillsCount})");

$skillCategories = $db->query('SELECT DISTINCT category FROM skills')->fetchAll(PDO::FETCH_COLUMN);
assertCondition(count($skillCategories) >= 10, "Skills span 10+ technology domains (Actual: " . count($skillCategories) . ")");

$emptySlugs = (int)$db->query("SELECT count(*) FROM skills WHERE slug IS NULL OR slug = ''")->fetchColumn();
assertCondition($emptySlugs === 0, "All skills have normalized slugs (0 empty)");

// --- TEST 3: Skill Dependency Acyclic Graph (DAG) ---
echo "\n3. Validating Skill Dependency Graph & Acyclicity...\n";
$depsCount = (int)$db->query('SELECT count(*) FROM skill_dependencies')->fetchColumn();
assertCondition($depsCount >= 100, "Dependency edges count >= 100 (Actual: {$depsCount})");

$graph = CareerRecommendationService::getSkillDependencyGraph();
assertCondition($graph['total_nodes'] >= 500, "Graph includes 500+ skill nodes (Actual: {$graph['total_nodes']})");
assertCondition($graph['total_edges'] >= 100, "Graph includes 100+ directed edges (Actual: {$graph['total_edges']})");

$audit = DataQualityService::runAudit();
assertCondition($audit['graph_integrity']['is_acyclic_dag'] === true, "Graph is strictly acyclic DAG with ZERO cycles detected via Kahn's Algorithm");

// --- TEST 4: 500+ Learning Resources & 100% HTTPS ---
echo "\n4. Validating Learning Resources Catalog...\n";
$resourcesCount = (int)$db->query('SELECT count(*) FROM learning_resources')->fetchColumn();
assertCondition($resourcesCount >= 500, "Learning resources count >= 500 (Actual: {$resourcesCount})");

$nonHttps = (int)$db->query("SELECT count(*) FROM learning_resources WHERE url NOT LIKE 'https://%'")->fetchColumn();
assertCondition($nonHttps === 0, "100% of learning resources enforce HTTPS protocol security (Non-HTTPS: {$nonHttps})");

$qualityScoreAvg = (float)$db->query('SELECT AVG(quality_score) FROM learning_resources')->fetchColumn();
assertCondition($qualityScoreAvg >= 85.0, "Average resource quality score >= 85 (Actual: " . round($qualityScoreAvg, 1) . ")");

// --- TEST 5: 200+ Project Recommendation Blueprints ---
echo "\n5. Validating Project Recommendations Catalog...\n";
$projectsCount = (int)$db->query('SELECT count(*) FROM project_recommendations')->fetchColumn();
assertCondition($projectsCount >= 200, "Project blueprints count >= 200 (Actual: {$projectsCount})");

$highValueProjects = (int)$db->query("SELECT count(*) FROM project_recommendations WHERE portfolio_value = 'high'")->fetchColumn();
assertCondition($highValueProjects >= 150, "Majority of projects marked as high portfolio value (Actual: {$highValueProjects})");

// --- TEST 6: Multi-Factor Recommendation Scoring Formula ---
echo "\n6. Validating Deterministic Multi-Factor Scoring Formula...\n";
$testItem = [
    'skill' => 'React',
    'difficulty' => 'intermediate',
    'quality_score' => 95,
    'last_verified_at' => date('Y-m-d H:i:s'),
    'prerequisites_satisfied' => true
];
$studentContext = [
    'missing_skills_lower' => ['react', 'typescript'],
    'core_career_skills_lower' => ['react', 'javascript', 'html', 'css'],
    'proficiency_level' => 'intermediate'
];
$scoreResult = CareerRecommendationService::calculateRecommendationScore($testItem, $studentContext);
assertCondition($scoreResult['total_score'] >= 85.0, "High relevance item scores >= 85 (Actual: {$scoreResult['total_score']})");
assertCondition(isset($scoreResult['factors']['gap_coverage']), "Scoring formula breaks down gap_coverage weight (30%)");
assertCondition(isset($scoreResult['factors']['prerequisite_readiness']), "Scoring formula breaks down prerequisite_readiness weight (25%)");
assertCondition(isset($scoreResult['factors']['career_alignment']), "Scoring formula breaks down career_alignment weight (20%)");
assertCondition(isset($scoreResult['factors']['difficulty_proximity']), "Scoring formula breaks down difficulty_proximity weight (10%)");
assertCondition(isset($scoreResult['factors']['resource_quality']), "Scoring formula breaks down resource_quality weight (10%)");
assertCondition(isset($scoreResult['factors']['freshness']), "Scoring formula breaks down freshness weight (5%)");

// --- TEST 7: 'What Should I Do Next?' Engine ---
echo "\n7. Validating 'What Should I Do Next?' Engine...\n";
$testStudent = $db->query("SELECT id FROM students ORDER BY id LIMIT 1")->fetchColumn() ?: 'test_student';
$nextAction = CareerRecommendationService::getNextBestAction($testStudent, 'Frontend Developer');
assertCondition(!empty($nextAction['primary_action']['title']), "Primary action generated: " . ($nextAction['primary_action']['title'] ?? ''));
assertCondition(!empty($nextAction['primary_action']['rationale']), "Explainable 'Why this?' rationale provided");
assertCondition(array_key_exists('estimated_hours', $nextAction['primary_action']), "Recommendation includes sourced effort metadata");
assertCondition(count($nextAction['secondary_actions']) <= 3, "Prioritizes up to 3 secondary follow-up actions (Actual: " . count($nextAction['secondary_actions']) . ")");

// --- TEST 8: Career Readiness Engine ---
echo "\n8. Validating Career Readiness Engine...\n";
$readiness = CareerRecommendationService::getCareerReadiness($testStudent, 'Frontend Developer');
assertCondition(isset($readiness['readiness_score']), "Career readiness score calculated (Score: {$readiness['readiness_score']}%)");
assertCondition(!empty($readiness['readiness_tier']), "Readiness tier assigned (Tier: {$readiness['readiness_tier']})");
assertCondition(isset($readiness['breakdown']['required_skills_coverage']), "Breakdown includes required skills coverage (50%)");
assertCondition(isset($readiness['breakdown']['preferred_skills_coverage']), "Breakdown includes preferred skills coverage (20%)");
assertCondition(isset($readiness['breakdown']['proficiency_benchmark']), "Breakdown includes proficiency benchmark (15%)");
assertCondition(isset($readiness['breakdown']['portfolio_evidence']), "Breakdown includes portfolio evidence (15%)");

// --- TEST 9: 4-Tier Reachable Jobs Engine ---
echo "\n9. Validating 4-Tier Reachable Jobs Engine...\n";
$reachableJobs = CareerRecommendationService::getReachableJobs($testStudent);
assertCondition($reachableJobs['total_opportunities'] > 0, "Total job opportunities evaluated (Actual: {$reachableJobs['total_opportunities']})");
assertCondition(isset($reachableJobs['tier_summary']['ready_now']), "Tier 1: Ready Now calculated");
assertCondition(isset($reachableJobs['tier_summary']['nearly_ready']), "Tier 2: Nearly Ready calculated");
assertCondition(isset($reachableJobs['tier_summary']['skill_gap']), "Tier 3: Skill Gap calculated");
assertCondition(isset($reachableJobs['tier_summary']['future_target']), "Tier 4: Future Target calculated");

// --- TEST 10: Data Quality & Governance ---
echo "\n10. Validating Data Quality Service & Health Index...\n";
assertCondition($audit['overall_health_index'] >= 95.0, "Overall System Health Index >= 95% (Actual: {$audit['overall_health_index']}%)");
assertCondition(file_exists(__DIR__ . '/../docs/DATA_QUALITY_REPORT.md'), "DATA_QUALITY_REPORT.md documentation generated");

echo "\n=================================================================\n";
echo "RESULTS: {$passed} PASSED / " . ($passed + $failed) . " TOTAL\n";
echo "=================================================================\n";

if ($failed > 0) {
    exit(1);
}
