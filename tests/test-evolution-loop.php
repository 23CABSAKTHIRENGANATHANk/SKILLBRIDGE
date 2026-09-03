<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/services/CareerEvolutionService.php';

$db = Database::getConnection();
$student = $db->query("SELECT id FROM users WHERE role = 'student' LIMIT 1")->fetch();
$studentId = $student['id'] ?? 'u_student_1';

echo "=================================================================\n";
echo "Testing Career Evolution Flywheel State & Loop Progression\n";
echo "=================================================================\n\n";

// 1. Fetch Master State
echo "[1] Fetching Evolution Loop State for student: {$studentId}...\n";
$loop = CareerEvolutionService::getEvolutionLoopState($studentId, 'Frontend Developer');

echo "    - Target Goal: {$loop['goal']['target_role']}\n";
echo "    - Career Readiness: {$loop['readiness']['readiness_score']}% ({$loop['readiness']['readiness_tier']})\n";
echo "    - Skill Graph Nodes: " . count($loop['skill_graph']['nodes']) . " nodes, " . count($loop['skill_graph']['edges']) . " edges\n";
echo "    - Missing Skills: " . count($loop['skill_gaps']['missing']) . "\n";
echo "    - Active Target Skill: {$loop['active_skill']}\n";
echo "    - What Should I Do Next?: {$loop['next_action']['primary_action']['title']}\n";
echo "    - Current Modality: {$loop['current_modality']}\n";
echo "    - Learn Resources: " . count($loop['modalities']['learn']['resources']) . "\n";
echo "    - Practice Drills: " . count($loop['modalities']['practice']['drills']) . "\n";
echo "    - Build Projects: " . count($loop['modalities']['build']['projects']) . "\n";
echo "    - Assess Info: {$loop['modalities']['assess']['assessment_title']}\n";
echo "    - Verify Info: {$loop['modalities']['verify']['skill']} (Score: {$loop['modalities']['verify']['confidence_score']})\n";
echo "    - Reachable Jobs: " . $loop['reachable_jobs']['total_opportunities'] . " total\n";
echo "    - Flywheel Stages: " . count($loop['flywheel_stages']) . " stages defined\n\n";

// 2-5. Unsubstantiated stage transitions must be rejected.
foreach (['learn', 'practice', 'assess'] as $stage) {
    echo "[2] Verifying {$stage} cannot advance without persisted evidence...\n";
    try {
        CareerEvolutionService::advanceEvolutionLoop($studentId, $loop['active_skill'], $stage);
        echo "    FAILURE: {$stage} advanced without evidence.\n";
        exit(1);
    } catch (InvalidArgumentException $exception) {
        echo "    PASS: {$exception->getMessage()}\n";
    }
}

echo "[5] Verifying build requires a real repository URL...\n";
try {
    CareerEvolutionService::advanceEvolutionLoop($studentId, $loop['active_skill'], 'build', [
        'project_title' => 'Test Project'
    ]);
    echo "    FAILURE: build advanced without repository evidence.\n";
    exit(1);
} catch (InvalidArgumentException $exception) {
    echo "    PASS: {$exception->getMessage()}\n";
}

echo "[6] Flywheel evidence guards passed without mutating student progress.\n";
