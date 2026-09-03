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
        if (!$goal) {
            jsonResponse([
                'student' => $student,
                'goal' => null,
                'setup_required' => true,
                'readiness' => null,
                'gaps' => null,
                'next_action' => null,
                'roadmap' => null,
                'weekly_plan' => null,
                'opportunities' => null,
                'evolution' => CareerEvolutionService::getKnowledgeEvolution($student['id']),
                'achievements' => CareerEvolutionService::getAchievements($student['id']),
            ]);
            return;
        }
        $targetRole = (string)$goal['target_role'];

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

        // 9. Deterministic Career Insights (CareerInsightService)
        $insights = CareerInsightService::generateInsights($student['id'], $targetRole);

        // 10. Reachable Jobs 4-Tier Matrix
        $reachableJobs = CareerRecommendationService::getReachableJobs($student['id'], $targetRole);

        // 11. Historical Readiness Progression
        $readinessHistory = CareerEvolutionService::getReadinessHistory($student['id'], $targetRole);

        // 12. Interactive Topological Skill Graph
        $skillGraph = CareerEvolutionService::getInteractiveSkillGraph($student['id'], $targetRole);

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
            'insights' => $insights,
            'reachable_jobs' => $reachableJobs,
            'readiness_history' => $readinessHistory,
            'skill_graph' => $skillGraph,
        ]);
    }

    /**
     * GET /student/career-goal
     */
    public static function getGoal(array $user): void {
        $student = self::student($user);
        $stmt = Database::getConnection()->prepare('SELECT id, target_role, secondary_target_role, career_domain, target_industry, preferred_location, experience_level, target_timeline_weeks, created_at, updated_at FROM career_goals WHERE student_id = ?');
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
        $secondaryRole = trim((string)($input['secondary_target_role'] ?? '')) ?: null;
        $careerDomain = trim((string)($input['career_domain'] ?? '')) ?: null;
        $location = trim((string)($input['preferred_location'] ?? '')) ?: null;
        $expLevel = trim((string)($input['experience_level'] ?? 'entry')) ?: 'entry';

        if ($role === '') errorResponse('Target role is required.', 422);
        if ($timeline < 1 || $timeline > 260) errorResponse('Target timeline must be between 1 and 260 weeks.', 422);

        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT INTO career_goals (id, student_id, target_role, secondary_target_role, career_domain, target_industry, preferred_location, experience_level, target_timeline_weeks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (student_id) DO UPDATE
                SET target_role = EXCLUDED.target_role,
                    secondary_target_role = EXCLUDED.secondary_target_role,
                    career_domain = EXCLUDED.career_domain,
                    target_industry = EXCLUDED.target_industry,
                    preferred_location = EXCLUDED.preferred_location,
                    experience_level = EXCLUDED.experience_level,
                    target_timeline_weeks = EXCLUDED.target_timeline_weeks,
                    updated_at = CURRENT_TIMESTAMP
        ');
        $stmt->execute(['goal_' . bin2hex(random_bytes(8)), $student['id'], $role, $secondaryRole, $careerDomain, $industry, $location, $expLevel, $timeline]);

        // Auto-generate or update personalized roadmap
        $roadmap = CareerEvolutionService::getOrCreateRoadmap($student['id'], $role, $timeline);

        // Record readiness snapshot
        $readiness = CareerRecommendationService::getCareerReadiness($student['id'], $role);
        CareerEvolutionService::recordReadinessSnapshot(
            $student['id'],
            $role,
            (int)($readiness['readiness_score'] ?? 0),
            (string)($readiness['readiness_tier'] ?? 'Foundational'),
            $readiness['breakdown'] ?? []
        );

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
                'secondary_target_role' => $secondaryRole,
                'career_domain' => $careerDomain,
                'target_timeline_weeks' => $timeline,
                'target_industry' => $industry,
                'preferred_location' => $location,
                'experience_level' => $expLevel
            ],
            'roadmap' => $roadmap,
        ]);
    }

    /** PUT /student/career-goal -- explicit update contract, backed by the same upsert. */
    public static function updateGoal(array $user): void {
        self::saveGoal($user);
    }

    /** DELETE /student/career-goal. Roadmap history is retained; only the active destination is removed. */
    public static function deleteGoal(array $user): void {
        $student = self::student($user);
        $stmt = Database::getConnection()->prepare('DELETE FROM career_goals WHERE student_id = ?');
        $stmt->execute([$student['id']]);
        if ($stmt->rowCount() === 0) errorResponse('Career goal not found.', 404);
        jsonResponse(['message' => 'Career goal removed. Set a new goal to receive personalized recommendations.']);
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
        $student = self::student($user);
        $skill = isset($_GET['skill']) ? trim((string)$_GET['skill']) : null;
        $type = isset($_GET['type']) ? trim((string)$_GET['type']) : null;
        $resources = CareerEvolutionService::getLearningResources($skill, $type);
        if (!empty($resources)) {
            $ids = array_values(array_filter(array_column($resources, 'id')));
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $progressStmt = Database::getConnection()->prepare("SELECT resource_id, status, progress, started_at, completed_at, last_accessed_at FROM student_learning_progress WHERE student_id = ? AND resource_id IN ({$placeholders})");
            $progressStmt->execute(array_merge([$student['id']], $ids));
            $progressByResource = [];
            foreach ($progressStmt->fetchAll() as $progress) $progressByResource[$progress['resource_id']] = $progress;
            foreach ($resources as &$resource) $resource['progress'] = $progressByResource[$resource['id']] ?? null;
            unset($resource);
        }
        jsonResponse(['resources' => $resources, 'count' => count($resources)]);
    }

    /** POST /student/learning/:resourceId/progress -- explicit, idempotent learning state mutation. */
    public static function updateLearningProgress(array $user, string $resourceId): void {
        $student = self::student($user);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = strtolower(trim((string)($input['status'] ?? 'started')));
        $progress = (int)($input['progress'] ?? ($status === 'completed' ? 100 : 0));
        if (!in_array($status, ['started', 'in_progress', 'completed'], true) || $progress < 0 || $progress > 100) {
            errorResponse('Invalid learning progress state.', 422);
        }
        if ($status === 'completed') $progress = 100;
        $db = Database::getConnection();
        $exists = $db->prepare('SELECT 1 FROM learning_resources WHERE id = ?');
        $exists->execute([$resourceId]);
        if (!$exists->fetchColumn()) errorResponse('Learning resource not found.', 404);
        $stmt = $db->prepare("INSERT INTO student_learning_progress (student_id, resource_id, status, progress, started_at, completed_at, last_accessed_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, resource_id) DO UPDATE SET
              status = EXCLUDED.status, progress = EXCLUDED.progress,
              completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN COALESCE(student_learning_progress.completed_at, CURRENT_TIMESTAMP) ELSE student_learning_progress.completed_at END,
              last_accessed_at = CURRENT_TIMESTAMP
            RETURNING status, progress, started_at, completed_at, last_accessed_at");
        $stmt->execute([$student['id'], $resourceId, $status, $progress, $status]);
        jsonResponse(['resource_id' => $resourceId, 'progress' => $stmt->fetch()]);
    }

    /** POST /student/projects/:projectId/progress -- only records explicit student actions. */
    public static function updateProjectProgress(array $user, string $projectId): void {
        $student = self::student($user);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = strtolower(trim((string)($input['status'] ?? 'not_started')));
        $progress = (int)($input['progress'] ?? ($status === 'completed' ? 100 : 0));
        $repositoryUrl = trim((string)($input['repository_url'] ?? '')) ?: null;
        if (!in_array($status, ['not_started', 'in_progress', 'completed', 'submitted', 'verified'], true) || $progress < 0 || $progress > 100) errorResponse('Invalid project progress state.', 422);
        if ($status === 'completed') $progress = 100;
        $db = Database::getConnection();
        $exists = $db->prepare('SELECT 1 FROM project_recommendations WHERE id = ?');
        $exists->execute([$projectId]);
        if (!$exists->fetchColumn()) errorResponse('Project recommendation not found.', 404);
        $stmt = $db->prepare("INSERT INTO student_project_progress (student_id, project_id, status, progress, repository_url, started_at, completed_at)
            VALUES (?, ?, ?, ?, ?, CASE WHEN ? IN ('in_progress','completed','submitted','verified') THEN CURRENT_TIMESTAMP ELSE NULL END, CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END)
            ON CONFLICT (student_id, project_id) DO UPDATE SET status = EXCLUDED.status, progress = EXCLUDED.progress,
              repository_url = COALESCE(EXCLUDED.repository_url, student_project_progress.repository_url),
              started_at = COALESCE(student_project_progress.started_at, EXCLUDED.started_at),
              completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN COALESCE(student_project_progress.completed_at, CURRENT_TIMESTAMP) ELSE student_project_progress.completed_at END,
              last_accessed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            RETURNING status, progress, repository_url, started_at, completed_at, last_accessed_at");
        $stmt->execute([$student['id'], $projectId, $status, $progress, $repositoryUrl, $status, $status]);
        jsonResponse(['project_id' => $projectId, 'progress' => $stmt->fetch()]);
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
     * GET /student/evolution-loop
     */
    public static function getEvolutionLoop(array $user): void {
        $student = self::student($user);
        $role = trim((string)($_GET['role'] ?? '')) ?: null;
        jsonResponse(CareerEvolutionService::getEvolutionLoopState($student['id'], $role));
    }

    /**
     * POST /student/evolution-loop/advance
     */
    public static function advanceEvolutionLoop(array $user): void {
        $student = self::student($user);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $skill = trim((string)($input['skill'] ?? ''));
        $stage = trim((string)($input['stage'] ?? ''));
        $payload = (array)($input['payload'] ?? []);

        if (empty($skill) || empty($stage)) {
            errorResponse('Both skill and stage parameters are required.', 422);
        }

        try {
            $result = CareerEvolutionService::advanceEvolutionLoop($student['id'], $skill, $stage, $payload);
            jsonResponse($result);
        } catch (\Throwable $e) {
            errorResponse($e->getMessage(), 400);
        }
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

        // Persist to career_coach_sessions and career_coach_messages
        try {
            $sessionStmt = $db->prepare('SELECT id FROM career_coach_sessions WHERE student_id = ? ORDER BY updated_at DESC LIMIT 1');
            $sessionStmt->execute([$student['id']]);
            $sessionId = $sessionStmt->fetchColumn();
            if (!$sessionId) {
                $sessionId = 'session_' . bin2hex(random_bytes(8));
                $db->prepare('INSERT INTO career_coach_sessions (id, student_id, title) VALUES (?, ?, ?)')
                   ->execute([$sessionId, $student['id'], 'Career Strategy for ' . $targetRole]);
            } else {
                $db->prepare('UPDATE career_coach_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                   ->execute([$sessionId]);
            }
            $db->prepare('INSERT INTO career_coach_messages (session_id, sender, message) VALUES (?, ?, ?)')
               ->execute([$sessionId, 'student', $query]);
            $db->prepare('INSERT INTO career_coach_messages (session_id, sender, message, metadata) VALUES (?, ?, ?, ?)')
               ->execute([$sessionId, 'coach', $parsed['reply'], json_encode($parsed)]);
        } catch (\Throwable) {
            // Non-fatal
        }

        jsonResponse($parsed);
    }

    /**
     * GET /student/career-insights
     */
    public static function getCareerInsights(array $user): void {
        $student = self::student($user);
        $role = trim((string)($_GET['role'] ?? '')) ?: null;
        jsonResponse([
            'insights' => CareerInsightService::generateInsights($student['id'], $role)
        ]);
    }

    /**
     * GET /student/skill-graph
     */
    public static function getSkillGraph(array $user): void {
        $student = self::student($user);
        $role = trim((string)($_GET['role'] ?? '')) ?: null;
        jsonResponse(CareerEvolutionService::getInteractiveSkillGraph($student['id'], $role));
    }

    /**
     * POST /student/learning/{id}/start
     */
    public static function startLearning(array $user, string $resourceId): void {
        $student = self::student($user);
        jsonResponse([
            'success' => true,
            'progress' => CareerEvolutionService::startLearningResource($student['id'], $resourceId)
        ]);
    }

    /**
     * POST /student/learning/{id}/complete
     */
    public static function completeLearning(array $user, string $resourceId): void {
        $student = self::student($user);
        jsonResponse([
            'success' => true,
            'progress' => CareerEvolutionService::completeLearningResource($student['id'], $resourceId)
        ]);
    }

    /**
     * POST /student/projects/{id}/start
     */
    public static function startProject(array $user, string $projectId): void {
        $student = self::student($user);
        jsonResponse([
            'success' => true,
            'progress' => CareerEvolutionService::startProjectRecommendation($student['id'], $projectId)
        ]);
    }

    /**
     * POST /student/projects/{id}/complete
     */
    public static function completeProject(array $user, string $projectId): void {
        $student = self::student($user);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $repoUrl = trim((string)($input['repository_url'] ?? '')) ?: null;
        jsonResponse([
            'success' => true,
            'progress' => CareerEvolutionService::completeProjectRecommendation($student['id'], $projectId, $repoUrl)
        ]);
    }

    /**
     * POST /student/weekly-plan/regenerate
     */
    public static function regenerateWeeklyPlan(array $user): void {
        $student = self::student($user);
        $role = trim((string)($_GET['role'] ?? '')) ?: null;
        jsonResponse([
            'success' => true,
            'weekly_plan' => CareerEvolutionService::regenerateWeeklyPlan($student['id'], $role)
        ]);
    }

    /**
     * POST /student/weekly-plan/task/{id}/skip
     */
    public static function skipWeeklyTask(array $user, string $taskId): void {
        $student = self::student($user);
        jsonResponse(CareerEvolutionService::skipWeeklyTask($student['id'], $taskId));
    }

    /**
     * GET /student/readiness-history
     */
    public static function getReadinessHistory(array $user): void {
        $student = self::student($user);
        $role = trim((string)($_GET['role'] ?? '')) ?: null;
        jsonResponse([
            'history' => CareerEvolutionService::getReadinessHistory($student['id'], $role)
        ]);
    }
}
