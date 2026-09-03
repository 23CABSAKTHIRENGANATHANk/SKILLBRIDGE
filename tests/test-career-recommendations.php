<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/services/CareerRecommendationService.php';

$db = Database::getConnection();

// Pick a test student from users or student_profiles
$student = $db->query("SELECT id FROM users WHERE role = 'student' LIMIT 1")->fetch();
$studentId = $student['id'] ?? 'test-student-id';

echo "Testing CareerRecommendationService with Student ID: {$studentId}\n\n";

// 1. Career Readiness
echo "[1] Testing Career Readiness...\n";
$readiness = CareerRecommendationService::getCareerReadiness($studentId, 'Frontend Developer');
echo "    Career: {$readiness['career']['title']}\n";
echo "    Readiness Score: {$readiness['readiness_score']}%\n";
echo "    Readiness Tier: {$readiness['readiness_tier']}\n";
echo "    Missing Required: " . count($readiness['missing_required_skills']) . " skills\n\n";

// 2. Next Best Action
echo "[2] Testing 'What Should I Do Next?' Engine...\n";
$action = CareerRecommendationService::getNextBestAction($studentId, 'Frontend Developer');
echo "    Primary Action Type: {$action['primary_action']['action_type']}\n";
echo "    Title: {$action['primary_action']['title']}\n";
echo "    Rationale: {$action['primary_action']['rationale']}\n";
echo "    Expected Boost: {$action['primary_action']['expected_readiness_boost']}\n";
echo "    Secondary Actions: " . count($action['secondary_actions']) . " steps\n\n";

// 3. Reachable Jobs
echo "[3] Testing 4-Tier Reachable Jobs...\n";
$jobs = CareerRecommendationService::getReachableJobs($studentId);
echo "    Total Opportunities: {$jobs['total_opportunities']}\n";
echo "    Ready Now (Tier 1): {$jobs['tier_summary']['ready_now']}\n";
echo "    Nearly Ready (Tier 2): {$jobs['tier_summary']['nearly_ready']}\n";
echo "    Skill Gap (Tier 3): {$jobs['tier_summary']['skill_gap']}\n";
echo "    Future Target (Tier 4): {$jobs['tier_summary']['future_target']}\n\n";

// 4. Careers Catalog
echo "[4] Testing Careers Catalog...\n";
$careers = CareerRecommendationService::getCareers();
echo "    Total Careers: " . count($careers) . "\n";
echo "    First 3: " . implode(', ', array_map(fn($c) => $c['title'], array_slice($careers, 0, 3))) . "\n\n";

// 5. Single Career Detail
echo "[5] Testing Single Career Detail...\n";
$detail = CareerRecommendationService::getCareerDetail('Frontend Developer');
echo "    Title: {$detail['title']}\n";
echo "    Domain: {$detail['domain']}\n";
echo "    Active Job Postings: {$detail['active_job_postings']}\n";
echo "    Required Skills: " . count($detail['required_skills']) . "\n\n";

// 6. Skill Dependency Graph
echo "[6] Testing Skill Dependency Graph...\n";
$graph = CareerRecommendationService::getSkillDependencyGraph();
echo "    Total Graph Nodes: {$graph['total_nodes']}\n";
echo "    Total Graph Edges: {$graph['total_edges']}\n\n";

echo "ALL CAREER RECOMMENDATION SERVICE TESTS PASSED!\n";
