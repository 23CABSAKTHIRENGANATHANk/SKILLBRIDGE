<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/CareerEvolutionService.php';
require_once __DIR__ . '/../services/DataRecommendationService.php';
require_once __DIR__ . '/../services/CareerRecommendationService.php';
require_once __DIR__ . '/../services/DataQualityService.php';
require_once __DIR__ . '/../services/GeminiService.php';

/**
 * CareerEvolutionController
 * Full REST API controller for SkillBridge 3.0 Career Evolution Engine.
 */
class CareerEvolutionController {

    public static function getCareerIntelligence(array $user): void {
        $student = self::student($user);
        $role = trim((string)($_GET['role'] ?? '')) ?: null;
        jsonResponse(DataRecommendationService::getFullCareerProgressionChain($student['id'], $role));
    }

    private static function student(array $user): array {
        AuthMiddleware::requireRole($user, 'student');
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id, name, college, program, experience FROM students WHERE user_id = ? LIMIT 1');
        $stmt->execute([$user['user_id']]);
        $student = $stmt->fetch();
        if (!$student) errorResponse('Student profile not found.', 404);
        return $student;
    }

    /**
     * GET /student/career-dashboard
     * High-performance single-flight aggregator for the Student Career Command Center.
     */
    public static function getDashboard(array $user): void {
        $student = self::student($user);
        $db = Database::getConnection();

        // 1. Goal
        $gStmt = $db->prepare('SELECT target_role, target_timeline_weeks, target_industry, preferred_location, experience_level FROM career_goals WHERE student_id = ?');
        $gStmt->execute([$student['id']]);
        $goal = $gStmt->fetch();
        $targetRole = (string)($goal['target_role'] ?? 'Full Stack Developer');

        // 2. Readiness & Gaps
        $readiness = CareerEvolutionService::calculateReadiness($student['id'], $targetRole);
        $gaps = CareerEvolutionService::analyzeSkillGaps($student['id'], $targetRole);

        // 3. Next Best Action
        $nextAction = CareerEvolutionService::determineNextAction($student['id'], $targetRole);

        // 4. Active Roadmap
        $roadmapData = CareerEvolutionService::getOrCreateRoadmap($student['id'], $targetRole, (int)($goal['target_timeline_weeks'] ?? 16));

        // 5. Weekly Plan
        $weeklyPlan = CareerEvolutionService::getOrCreateWeeklyPlan($student['id'], $targetRole);

        // 6. Opportunities
        $opportunities = CareerEvolutionService::getCareerOpportunities($student['id']);

        // 7. Evolution Events
        $evolution = CareerEvolutionService::getKnowledgeEvolution($student['id']);

        // 8. Achievements
        $achievements = CareerEvolutionService::getAchievements($student['id']);

        jsonResponse([
            'student' => $student,
            'goal' => $goal ?: null,
            'readiness' => $readiness,
            'gaps' => $gaps,
            'next_action' => $nextAction,
            'roadmap' => $roadmapData,
            'weekly_plan' => $weeklyPlan,
            'opportunities' => $opportunities,
            'evolution' => $evolution,
            'achievements' => $achievements,
        ]);
    }

    /**
     * GET /student/career-goal
     */
    public static function getGoal(array $user): void {
        $student = self::student($user);
        $stmt = Database::getConnection()->prepare('SELECT id, target_role, target_industry, preferred_location, experience_level, target_timeline_weeks, created_at, updated_at FROM career_goals WHERE student_id = ?');
        $stmt->execute([$student['id']]);
        jsonResponse(['goal' => $stmt->fetch() ?: null]);
    }

    /**
     * POST /student/career-goal
     */
    public static function saveGoal(array $user): void {
        $student = self::student($user);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $role = trim((string)($input['target_role'] ?? ''));
        $timeline = (int)($input['target_timeline_weeks'] ?? 16);
        $industry = trim((string)($input['target_industry'] ?? '')) ?: null;
        $location = trim((string)($input['preferred_location'] ?? '')) ?: null;
        $expLevel = trim((string)($input['experience_level'] ?? 'entry')) ?: 'entry';

        if ($role === '') errorResponse('Target role is required.', 422);
        if ($timeline < 1 || $timeline > 260) errorResponse('Target timeline must be between 1 and 260 weeks.', 422);

        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT INTO career_goals (id, student_id, target_role, target_industry, preferred_location, experience_level, target_timeline_weeks)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (student_id) DO UPDATE
                SET target_role = EXCLUDED.target_role,
                    target_industry = EXCLUDED.target_industry,
                    preferred_location = EXCLUDED.preferred_location,
                    experience_level = EXCLUDED.experience_level,
                    target_timeline_weeks = EXCLUDED.target_timeline_weeks,
                    updated_at = CURRENT_TIMESTAMP
        ');
        $stmt->execute(['goal_' . bin2hex(random_bytes(8)), $student['id'], $role, $industry, $location, $expLevel, $timeline]);

        // Auto-generate or update personalized roadmap
        $roadmap = CareerEvolutionService::getOrCreateRoadmap($student['id'], $role, $timeline);

        // Record knowledge evolution milestone
        CareerEvolutionService::recordEvolutionEvent(
            $student['id'],
            'skill_learned',
            "Set Career Target: {$role}",
            "Committed to a {$timeline}-week roadmap towards {$role}."
        );

        jsonResponse([
            'message' => 'Career goal saved successfully.',
            'goal' => [
                'target_role' => $role,
                'target_timeline_weeks' => $timeline,
                'target_industry' => $industry,
                'preferred_location' => $location,
                'experience_level' => $expLevel
            ],
            'roadmap' => $roadmap,
        ]);
    }

    /**
     * GET /student/readiness
     */
    public static function getReadiness(array $user): void {
        $student = self::student($user);
        $role = trim((string)($_GET['role'] ?? ''));
        if (empty($role)) {
            $db = Database::getConnection();
            $gStmt = $db->prepare('SELECT target_role FROM career_goals WHERE student_id = ?');
            $gStmt->execute([$student['id']]);
            $role = (string)($gStmt->fetchColumn() ?: 'Full Stack Developer');
        }

        $readiness = CareerEvolutionService::calculateReadiness($student['id'], $role);
        jsonResponse($readiness);
    }

    /**
     * GET /student/skill-gaps
     */
    public static function getSkillGaps(array $user): void {
        $student = self::student($user);
        $role = trim((string)($_GET['role'] ?? ''));
        if (empty($role)) {
            $db = Database::getConnection();
            $gStmt = $db->prepare('SELECT target_role FROM career_goals WHERE student_id = ?');
            $gStmt->execute([$student['id']]);
            $role = (string)($gStmt->fetchColumn() ?: 'Full Stack Developer');
        }

        $gaps = CareerEvolutionService::analyzeSkillGaps($student['id'], $role);
        jsonResponse($gaps);
    }

    /**
     * GET /student/next-action
     */
    public static function getNextAction(array $user): void {
        $student = self::student($user);
        $action = CareerEvolutionService::determineNextAction($student['id']);
        $action['action_type'] = strtoupper((string)($action['type'] ?? 'IMPROVE_PROFILE'));
        $action['resource'] = null;
        $action['estimated_minutes'] = match ($action['action_type']) {
            'LEARN_SKILL' => 45,
            'COMPLETE_ASSESSMENT' => 30,
            'APPLY_JOBS' => 20,
            default => 15,
        };
        $action['priority'] = 1;
        jsonResponse(['action' => $action]);
    }

    /**
     * GET /student/roadmap
     */
    public static function getRoadmap(array $user): void {
        $student = self::student($user);
        $role = trim((string)($_GET['role'] ?? ''));
        if (empty($role)) {
            $db = Database::getConnection();
            $gStmt = $db->prepare('SELECT target_role, target_timeline_weeks FROM career_goals WHERE student_id = ?');
            $gStmt->execute([$student['id']]);
            $goal = $gStmt->fetch();
            $role = (string)($goal['target_role'] ?? 'Full Stack Developer');
            $timeline = (int)($goal['target_timeline_weeks'] ?? 16);
        } else {
            $timeline = 16;
        }

        $data = CareerEvolutionService::getOrCreateRoadmap($student['id'], $role, $timeline);
        jsonResponse($data);
    }

    /**
     * POST /student/roadmap/step/:id/complete
     */
    public static function completeRoadmapStep(array $user, string $stepId): void {
        $student = self::student($user);
        try {
            $data = CareerEvolutionService::toggleRoadmapStep($student['id'], $stepId);
            jsonResponse(['message' => 'Step updated.', 'roadmap' => $data]);
        } catch (\Throwable $e) {
            errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * GET /student/weekly-plan
     */
    public static function getWeeklyPlan(array $user): void {
        $student = self::student($user);
        $db = Database::getConnection();
        $gStmt = $db->prepare('SELECT target_role FROM career_goals WHERE student_id = ?');
        $gStmt->execute([$student['id']]);
        $role = (string)($gStmt->fetchColumn() ?: 'Full Stack Developer');

        $data = CareerEvolutionService::getOrCreateWeeklyPlan($student['id'], $role);
        jsonResponse($data);
    }

    /**
     * POST /student/weekly-plan/task/:id/toggle
     */
    public static function toggleWeeklyTask(array $user, string $taskId): void {
        $student = self::student($user);
        try {
            $data = CareerEvolutionService::toggleWeeklyTask($student['id'], $taskId);
            jsonResponse(['message' => 'Task toggled.', 'weekly_plan' => $data]);
        } catch (\Throwable $e) {
            errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * GET /student/opportunities
     */
    public static function getOpportunities(array $user): void {
        $student = self::student($user);
        $data = CareerEvolutionService::getCareerOpportunities($student['id']);
        jsonResponse($data);
    }

    /**
     * GET /student/evolution
     */
    public static function getEvolution(array $user): void {
        $student = self::student($user);
        $data = CareerEvolutionService::getKnowledgeEvolution($student['id']);
        jsonResponse($data);
    }

    /**
     * GET /student/learning
     */
    public static function getLearningResources(array $user): void {
        self::student($user);
        $skill = isset($_GET['skill']) ? trim((string)$_GET['skill']) : null;
        $type = isset($_GET['type']) ? trim((string)$_GET['type']) : null;
        $resources = CareerEvolutionService::getLearningResources($skill, $type);
        jsonResponse(['resources' => $resources, 'count' => count($resources)]);
    }

    public static function getRecommendedProjects(array $user): void {
        self::student($user);
        $projects = DataRecommendationService::getProjects($_GET['skill'] ?? null, $_GET['difficulty'] ?? null);
        jsonResponse(['projects' => $projects, 'count' => count($projects)]);
    }

    public static function getCareers(): void {
        $domain = isset($_GET['domain']) ? trim((string)$_GET['domain']) : null;
        $search = isset($_GET['search']) ? trim((string)$_GET['search']) : null;
        $careers = CareerRecommendationService::getCareers($domain, $search);
        jsonResponse(['careers' => $careers, 'count' => count($careers)]);
    }

    public static function getCareer(string $careerId): void {
        $career = CareerRecommendationService::getCareerDetail($careerId);
        if (!$career) { errorResponse('Career not found.', 404); }
        jsonResponse(['career' => $career]);
    }

    /**
     * GET /skills/dependencies
     */
    public static function getSkillDependencies(): void {
        $graph = CareerRecommendationService::getSkillDependencyGraph();
        jsonResponse($graph);
    }

    /**
     * GET /student/reachable-jobs
     */
    public static function getReachableJobs(array $user): void {
        $student = self::student($user);
        $role = trim((string)($_GET['role'] ?? '')) ?: null;
        $jobs = CareerRecommendationService::getReachableJobs($student['id'], $role);
        jsonResponse($jobs);
    }

    /**
     * GET /system/data-quality
     */
    public static function getDataQuality(): void {
        $audit = DataQualityService::runAudit();
        jsonResponse($audit);
    }

    /**
     * POST /career-coach/message
     * Grounded AI career coaching conversation with Gemini 3.7 Flash.
     */
    public static function chatCoach(array $user): void {
        $student = self::student($user);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $query = trim((string)($input['message'] ?? ''));

        if (empty($query)) {
            errorResponse('Message prompt is required.', 422);
        }

        $db = Database::getConnection();

        // 1. Fetch real student context
        $gStmt = $db->prepare('SELECT target_role, target_timeline_weeks FROM career_goals WHERE student_id = ?');
        $gStmt->execute([$student['id']]);
        $goal = $gStmt->fetch();
        $targetRole = (string)($goal['target_role'] ?? 'Software Developer');

        $readiness = CareerEvolutionService::calculateReadiness($student['id'], $targetRole);
        $gaps = CareerEvolutionService::analyzeSkillGaps($student['id'], $targetRole);
        $nextAction = CareerEvolutionService::determineNextAction($student['id'], $targetRole);

        $safeQuery = GeminiService::wrapUntrustedCandidateInput($query, 1000);

        $prompt = "You are the SkillBridge 3.0 AI Career Coach. You provide inspiring, actionable, and 100% grounded career evolution advice.
Never invent completed courses, fake skills, or guarantee job offers. Reference their actual verified data.

STUDENT PROFILE:
- Name: {$student['name']}
- College: {$student['college']}
- Program: {$student['program']}
- Target Career Role: {$targetRole}
- Overall Readiness: {$readiness['overall_readiness']}%
- Strong Verified Skills: " . implode(', ', array_column($gaps['strong'], 'skill')) . "
- Skills Needing Improvement: " . implode(', ', array_column($gaps['needs_improvement'], 'skill')) . "
- Missing Skills: " . implode(', ', array_column($gaps['missing'], 'skill')) . "
- Next Best Action: {$nextAction['title']} ({$nextAction['reason']})

STUDENT QUESTION:
{$safeQuery}

Respond in structured JSON format with:
{
  \"reply\": \"Clear, encouraging 2-3 paragraph answer referencing their actual skills, gaps, and readiness.\",
  \"recommended_next_action\": \"Specific next action directly from their roadmap.\",
  \"skills_to_focus_on\": [\"Skill 1\", \"Skill 2\"]
}";

        $rawResponse = GeminiService::generateText($prompt, 0.4);
        $parsed = null;
        if (preg_match('/\{[\s\S]*\}/', $rawResponse, $m)) {
            $parsed = json_decode($m[0], true);
        }

        if (!$parsed || !isset($parsed['reply'])) {
            $focusSkills = array_slice(array_column($gaps['needs_improvement'], 'skill'), 0, 2);
            if (empty($focusSkills)) $focusSkills = array_slice(array_column($gaps['missing'], 'skill'), 0, 2);

            $parsed = [
                'reply' => "Based on your verified profile for {$targetRole} ({$readiness['overall_readiness']}% ready), your immediate priority is closing your top skill gaps. You have demonstrated competence in your recorded skills, but formal verification will significantly increase your visibility with hiring teams.",
                'recommended_next_action' => $nextAction['title'],
                'skills_to_focus_on' => !empty($focusSkills) ? $focusSkills : ['TypeScript', 'Docker']
            ];
        }

        jsonResponse($parsed);
    }
}
