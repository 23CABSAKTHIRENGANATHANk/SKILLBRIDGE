<?php
declare(strict_types=1);

/**
 * SkillBridge Central REST API Router (Production Hardened & Monitored)
 */

require_once __DIR__ . '/config/database.php';
Database::loadEnv();
require_once __DIR__ . '/config/cors.php';
handleCors();

require_once __DIR__ . '/config/response.php';    // ← consistent JSON envelope + global error handler
registerGlobalErrorHandler();

require_once __DIR__ . '/config/jwt.php';
require_once __DIR__ . '/services/Logger.php';
require_once __DIR__ . '/services/AuditLogger.php';   // ← tamper-evident audit trail
require_once __DIR__ . '/services/Validator.php';      // ← centralised input validation
require_once __DIR__ . '/services/HealthService.php';
require_once __DIR__ . '/services/MetricsService.php';
require_once __DIR__ . '/services/AlertService.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/middleware/RateLimitMiddleware.php';

// Load Controllers
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/JobController.php';
require_once __DIR__ . '/controllers/CompanyController.php';
require_once __DIR__ . '/controllers/StudentController.php';
require_once __DIR__ . '/controllers/ApplicationController.php';
require_once __DIR__ . '/controllers/NotificationController.php';
require_once __DIR__ . '/controllers/InterviewController.php';
require_once __DIR__ . '/controllers/AdminController.php';
require_once __DIR__ . '/services/GeminiService.php';
require_once __DIR__ . '/controllers/AIController.php';
require_once __DIR__ . '/services/ProofOfSkillService.php';
require_once __DIR__ . '/controllers/AssessmentController.php';
require_once __DIR__ . '/controllers/CareerCopilotController.php';
require_once __DIR__ . '/controllers/PassportController.php';
require_once __DIR__ . '/controllers/GitHubController.php';
require_once __DIR__ . '/controllers/InterviewAIController.php';
require_once __DIR__ . '/controllers/TalentSearchController.php';
// SkillBridge 3.0 — New services and controllers
require_once __DIR__ . '/services/SkillEvidenceService.php';
require_once __DIR__ . '/controllers/CollegePlacementController.php';
require_once __DIR__ . '/controllers/CareerEvolutionController.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Normalize path: strip leading /api or backend path
$path = preg_replace('#^/api|^/backend/index\\.php|^/backend#', '', $uri);
$path = '/' . trim($path, '/');

// Attach per-request ID for traceability across logs
$_SERVER['HTTP_X_REQUEST_ID'] ??= 'req_' . bin2hex(random_bytes(8));

// Global Request Log
Logger::info("API Request: {$method} {$path}", [
    'query'      => $_GET,
    'ip'         => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'request_id' => $_SERVER['HTTP_X_REQUEST_ID'],
]);

// Global Rate Limiting: 120 reqs/min for general API
RateLimitMiddleware::check('global_api', 120, 60);

// Match routes
switch (true) {
    // --- Health & Uptime Diagnostics ---
    // /health and /api/health are both valid entry points (Phase 1 requirement)
    case $path === '/' || $path === '/health' || $path === '/api/health':
        $health = HealthService::checkHealth();
        $statusCode = ($health['status'] === 'healthy') ? 200 : 503;
        jsonResponse(array_merge($health, [
            'version'     => '3.0.0',
            'environment' => getenv('APP_ENV') ?: 'production',
        ]), $statusCode);
        break;

    case $path === '/health/db':
        $dbHealth = HealthService::getDatabaseHealth();
        $statusCode = ($dbHealth['status'] === 'healthy') ? 200 : 503;
        jsonResponse($dbHealth, $statusCode);
        break;

    case $path === '/metrics':
        header('Content-Type: text/plain; version=0.0.4; charset=utf-8');
        echo MetricsService::renderPrometheus();
        exit;

    case $path === '/admin/alerts/test' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        if ($user['role'] !== 'admin') {
            jsonResponse(['error' => 'Forbidden: Admin access required', 'code' => 403], 403);
            break;
        }
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $res = AlertService::sendAlert(
            $body['level'] ?? 'info',
            $body['title'] ?? 'Manual Test Alert',
            $body['message'] ?? 'This is a test alert dispatched from SkillBridge admin API.',
            $body['context'] ?? ['dispatched_by' => $user['email']]
        );
        jsonResponse($res, 200);
        break;

    case $path === '/ping':
        jsonResponse(['status' => 'pong', 'timestamp' => time()]);
        break;

    case $path === '/docs':
        header('Content-Type: text/html; charset=UTF-8');
        readfile(__DIR__ . '/swagger-ui.html');
        exit;

    case $path === '/openapi.yaml':
        header('Content-Type: application/yaml; charset=UTF-8');
        header('Access-Control-Allow-Origin: *');
        readfile(__DIR__ . '/openapi.yaml');
        exit;

    // --- Authentication (Strict Rate Limiting: 15 reqs/min) ---
    case $path === '/auth/register' && $method === 'POST':
        RateLimitMiddleware::check('auth_register', 15, 60);
        AuthController::register();
        break;

    case $path === '/auth/login' && $method === 'POST':
        RateLimitMiddleware::check('auth_login', 15, 60);
        AuthController::login();
        break;

    case $path === '/auth/refresh' && $method === 'POST':
        RateLimitMiddleware::check('auth_refresh', 30, 60);
        AuthController::refresh();
        break;

    case $path === '/auth/logout' && $method === 'POST':
        AuthController::logout();
        break;

    case $path === '/auth/me' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AuthController::me($user);
        break;

    // --- Jobs ---
    case $path === '/jobs' && $method === 'GET':
        JobController::list();
        break;

    case preg_match('#^/jobs/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'GET':
        JobController::get($matches[1]);
        break;

    case $path === '/jobs' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        JobController::create($user);
        break;

    // --- Companies ---
    case $path === '/companies' && $method === 'GET':
        CompanyController::list();
        break;

    case preg_match('#^/companies/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'GET':
        CompanyController::getProfile($matches[1]);
        break;

    case $path === '/companies/profile' && in_array($method, ['PUT', 'POST'], true):
        $user = AuthMiddleware::authenticate();
        CompanyController::updateProfile($user);
        break;

    case $path === '/companies/logo' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        CompanyController::uploadLogo($user);
        break;

    // --- Student Profile & Protected Resume ---
    case $path === '/student/profile' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        StudentController::getProfile($user);
        break;

    case $path === '/student/profile' && in_array($method, ['PUT', 'POST'], true):
        $user = AuthMiddleware::authenticate();
        StudentController::updateProfile($user);
        break;

    case $path === '/student/onboarding' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        StudentController::saveOnboarding($user);
        break;

    case $path === '/student/dashboard' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        StudentController::getDashboard($user);
        break;

    case $path === '/student/skills' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        StudentController::addSkill($user);
        break;

    case $path === '/student/skills' && $method === 'DELETE':
        $user = AuthMiddleware::authenticate();
        StudentController::deleteSkill($user);
        break;

    case $path === '/student/skill-proof' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        StudentController::getSkillProof($user);
        break;

    case preg_match('#^/student/assessments/([^/]+)$#', $path, $matches) && $method === 'GET':
        RateLimitMiddleware::check('assessment_generation', 10, 60);
        $user = AuthMiddleware::authenticate();
        AssessmentController::getAssessment($user, urldecode($matches[1]));
        break;

    case $path === '/student/assessments' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        AssessmentController::submitAssessment($user);
        break;

    // --- SkillBridge 2.0: AI Skill Verification 2.0 & Integrity ---
    case $path === '/student/skill-verifications/start' && $method === 'POST':
        RateLimitMiddleware::check('verification_generation', 10, 60);
        $user = AuthMiddleware::authenticate();
        AssessmentController::startVerification($user);
        break;

    case $path === '/student/skill-verifications' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AssessmentController::getVerificationHistory($user);
        break;

    case preg_match('#^/student/skill-verifications/([a-zA-Z0-9_-]+)/question$#', $path, $matches) && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AssessmentController::getCurrentQuestion($user, $matches[1]);
        break;

    case preg_match('#^/student/skill-verifications/([a-zA-Z0-9_-]+)/answer$#', $path, $matches) && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        AssessmentController::submitAnswer($user, $matches[1]);
        break;

    case preg_match('#^/student/skill-verifications/([a-zA-Z0-9_-]+)/complete$#', $path, $matches) && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        AssessmentController::completeVerification($user, $matches[1]);
        break;

    case $path === '/student/skill-integrity' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AssessmentController::getSkillIntegrity($user);
        break;

    case preg_match('#^/student/skill-integrity/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AssessmentController::getSingleSkillIntegrity($user, $matches[1]);
        break;

    // --- Student Projects ---
    case $path === '/student/projects' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        StudentController::addProject($user);
        break;

    case preg_match('#^/student/projects/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'DELETE':
        $user = AuthMiddleware::authenticate();
        StudentController::deleteProject($user, $matches[1]);
        break;

    // --- Student Certificates ---
    case $path === '/student/certificates' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        StudentController::addCertificate($user);
        break;

    case preg_match('#^/student/certificates/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'DELETE':
        $user = AuthMiddleware::authenticate();
        StudentController::deleteCertificate($user, $matches[1]);
        break;

    case ($path === '/student/resume' || $path === '/student/resume/upload') && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        StudentController::uploadResume($user);
        break;

    case preg_match('#^/student/resume/download/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        StudentController::streamResume($user, $matches[1]);
        break;

    case $path === '/student/trust-profile' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        StudentController::getTrustProfile($user);
        break;

    case $path === '/student/verify-phone' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        StudentController::verifyPhone($user);
        break;

    // --- Applications & Candidate Pipeline ---
    case $path === '/applications/apply' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        ApplicationController::apply($user);
        break;

    case $path === '/applications/candidates' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        ApplicationController::getCandidates($user);
        break;

    case preg_match('#^/applications/timeline/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        ApplicationController::getTimeline($user, $matches[1]);
        break;

    case $path === '/applications/feedback' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        ApplicationController::submitFeedback($user);
        break;

    case $path === '/applications/stage' && in_array($method, ['PUT', 'POST'], true):
        $user = AuthMiddleware::authenticate();
        ApplicationController::updateStage($user);
        break;

    // --- Interviews ---
    case $path === '/interviews' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        InterviewController::list($user);
        break;

    case $path === '/interviews/schedule' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        InterviewController::schedule($user);
        break;

    case $path === '/interviews/status' && in_array($method, ['PUT', 'POST'], true):
        $user = AuthMiddleware::authenticate();
        InterviewController::updateStatus($user);
        break;

    // --- Notifications ---
    case $path === '/notifications' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        NotificationController::list($user);
        break;

    case $path === '/notifications/read' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        NotificationController::markRead($user);
        break;

    case preg_match('#^/notifications/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'DELETE':
        $user = AuthMiddleware::authenticate();
        NotificationController::delete($user, $matches[1]);
        break;

    // --- Admin & Monitoring ---
    case $path === '/stats' && $method === 'GET':
        AdminController::getPublicStats();
        break;

    case $path === '/admin/stats' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AdminController::getStats($user);
        break;

    case $path === '/admin/verify-company' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        AdminController::verifyCompany($user);
        break;

    case $path === '/admin/logs' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($user, 'admin');
        jsonResponse([
            'success' => true,
            'logs' => Logger::getRecentLogs(50)
        ]);
        break;

    case $path === '/admin/audit' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($user, 'admin');
        $action  = trim($_GET['action']  ?? '');
        $actorId = trim($_GET['actor_id'] ?? '');
        $limit   = min((int)($_GET['limit'] ?? 100), 500);
        $entries = AuditLogger::getRecent($limit, $action, $actorId);
        jsonResponse([
            'success'    => true,
            'audit_logs' => $entries,
            'total'      => count($entries),
        ]);
        break;

    // --- AI Features (Rate limited: 20 req/min) ---
    case $path === '/ai/resume-summary' && $method === 'POST':
        RateLimitMiddleware::check('ai_features', 20, 60);
        $user = AuthMiddleware::authenticate();
        AIController::resumeSummary($user);
        break;

    case $path === '/ai/match-explain' && $method === 'POST':
        RateLimitMiddleware::check('ai_features', 20, 60);
        $user = AuthMiddleware::authenticate();
        AIController::matchExplain($user);
        break;

    case $path === '/ai/recommendations' && $method === 'GET':
        RateLimitMiddleware::check('ai_features', 20, 60);
        $user = AuthMiddleware::authenticate();
        AIController::recommendations($user);
        break;

    case $path === '/ai/skill-gap' && $method === 'POST':
        RateLimitMiddleware::check('ai_features', 20, 60);
        $user = AuthMiddleware::authenticate();
        AIController::skillGap($user);
        break;

    case $path === '/ai/recruiter-insights' && $method === 'GET':
        RateLimitMiddleware::check('ai_features', 20, 60);
        $user = AuthMiddleware::authenticate();
        AIController::recruiterInsights($user);
        break;

    // --- Proof of Skill & Assessments ---
    case $path === '/assessment' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        $skill = trim((string)($_GET['skill'] ?? 'React'));
        AssessmentController::getAssessment($user, $skill);
        break;

    case $path === '/assessment/submit' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        AssessmentController::submitAssessment($user);
        break;

    // --- Career Simulator & Gap Analysis & Career Agent ---
    case $path === '/career/simulate' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        CareerCopilotController::simulate($user);
        break;

    case $path === '/career/gap-analysis' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        CareerCopilotController::gapAnalysis($user);
        break;

    case $path === '/career/agent' && $method === 'POST':
        RateLimitMiddleware::check('ai_features', 20, 60);
        $user = AuthMiddleware::authenticate();
        CareerCopilotController::chatAgent($user);
        break;

    // --- Skill Passports (Public & Private) ---
    case $path === '/student/passport' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        PassportController::getOrCreateToken($user);
        break;

    case preg_match('#^/passport/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'GET':
        PassportController::getPublicPassport($matches[1]);
        break;

    // --- GitHub Proof of Work ---
    case $path === '/student/github/connect' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        GitHubController::connectProfile($user);
        break;

    // --- AI Pre-screen Interview Studio ---
    case $path === '/interview-ai/session' && $method === 'GET':
        RateLimitMiddleware::check('ai_interview_generation', 10, 60);
        $user = AuthMiddleware::authenticate();
        InterviewAIController::startSession($user);
        break;

    case $path === '/interview-ai/evaluate' && $method === 'POST':
        RateLimitMiddleware::check('ai_features', 20, 60);
        $user = AuthMiddleware::authenticate();
        InterviewAIController::evaluateSession($user);
        break;

    // --- SkillBridge 2.0: AI Interview 2.0 Adaptive Studio ---
    case $path === '/interview-ai/start' && $method === 'POST':
        RateLimitMiddleware::check('ai_interview_generation', 10, 60);
        $user = AuthMiddleware::authenticate();
        InterviewAIController::startAdaptiveSession($user);
        break;

    case preg_match('#^/interview-ai/([a-zA-Z0-9_-]+)/answer$#', $path, $matches) && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        InterviewAIController::submitAdaptiveAnswer($user, $matches[1]);
        break;

    case preg_match('#^/interview-ai/([a-zA-Z0-9_-]+)/complete$#', $path, $matches) && $method === 'POST':
        RateLimitMiddleware::check('ai_features', 20, 60);
        $user = AuthMiddleware::authenticate();
        InterviewAIController::completeAdaptiveSession($user, $matches[1]);
        break;

    case preg_match('#^/interview-ai/([a-zA-Z0-9_-]+)/scorecard$#', $path, $matches) && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        InterviewAIController::getSessionScorecard($user, $matches[1]);
        break;

    // --- Phase 2: Proof-of-Work Engine & Cryptographic Passport ---
    case $path === '/student/proof-of-work' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        GitHubController::getProofOfWork($user);
        break;

    case $path === '/student/passport/reissue' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        PassportController::reissueCredential($user);
        break;

    case $path === '/student/passport/revoke' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        PassportController::revokeCredential($user);
        break;

    case preg_match('#^/passport/([a-zA-Z0-9_-]+)/verify$#', $path, $matches) && $method === 'GET':
        PassportController::verifyCredentialEndpoint($matches[1]);
        break;

    case preg_match('#^/passport/([a-zA-Z0-9_-]+)/qr$#', $path, $matches) && $method === 'GET':
        PassportController::getPassportQr($matches[1]);
        break;

    // --- Phase 2: Recruiter Talent Search 2.0 & Precision Match Engine ---
    case $path === '/recruiter/talent-search' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        TalentSearchController::searchTalent($user);
        break;

    case preg_match('#^/recruiter/talent-search/([a-zA-Z0-9_-]+)/proof$#', $path, $matches) && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        TalentSearchController::getCandidateProof($user, $matches[1]);
        break;

    case $path === '/recruiter/shortlist' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        TalentSearchController::shortlistCandidate($user);
        break;

    case $path === '/recruiter/shortlists' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        TalentSearchController::getShortlists($user);
        break;

    // -----------------------------------------------------------------------
    // SkillBridge 3.0 — Skill Evidence Graph
    // -----------------------------------------------------------------------
    case $path === '/student/skills/evidence' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($user, 'student');
        $db = Database::getConnection();
        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$user['user_id']]);
        $student = $sStmt->fetch();
        if (!$student) { errorResponse('Student profile not found.', 404); }
        $evidenceGraph = SkillEvidenceService::getStudentEvidenceGraph($student['id']);
        jsonResponse(['evidence_graph' => $evidenceGraph, 'total_skills' => count($evidenceGraph)]);
        break;

    // -----------------------------------------------------------------------
    // SkillBridge 3.0 — Skill Trust Score
    // -----------------------------------------------------------------------
    case $path === '/student/skills/trust-score' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($user, 'student');
        $db = Database::getConnection();
        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$user['user_id']]);
        $student = $sStmt->fetch();
        if (!$student) { errorResponse('Student profile not found.', 404); }
        $trustScores = ProofOfSkillService::getStudentTrustScores($student['id']);
        jsonResponse(['trust_scores' => $trustScores, 'computed_at' => date('c')]);
        break;

    // -----------------------------------------------------------------------
    // SkillBridge 3.0 — Student Career Evolution Engine
    // -----------------------------------------------------------------------
    case $path === '/student/career-dashboard' && $method === 'GET':
        CareerEvolutionController::getDashboard(AuthMiddleware::authenticate());
        break;

    case $path === '/student/career-goal' && $method === 'GET':
        CareerEvolutionController::getGoal(AuthMiddleware::authenticate());
        break;

    case $path === '/student/career-goal' && $method === 'POST':
        CareerEvolutionController::saveGoal(AuthMiddleware::authenticate());
        break;

    case $path === '/student/readiness' && $method === 'GET':
        CareerEvolutionController::getReadiness(AuthMiddleware::authenticate());
        break;

    case $path === '/student/skill-gaps' && $method === 'GET':
        CareerEvolutionController::getSkillGaps(AuthMiddleware::authenticate());
        break;

    case $path === '/student/next-action' && $method === 'GET':
        CareerEvolutionController::getNextAction(AuthMiddleware::authenticate());
        break;

    case $path === '/student/roadmap' && $method === 'GET':
        CareerEvolutionController::getRoadmap(AuthMiddleware::authenticate());
        break;

    case preg_match('#^/student/roadmap/step/([a-zA-Z0-9_-]+)/complete$#', $path, $matches) && $method === 'POST':
        CareerEvolutionController::completeRoadmapStep(AuthMiddleware::authenticate(), $matches[1]);
        break;

    case $path === '/student/learning' && $method === 'GET':
        CareerEvolutionController::getLearningResources();
        break;

    case $path === '/student/opportunities' && $method === 'GET':
        CareerEvolutionController::getOpportunities(AuthMiddleware::authenticate());
        break;

    case $path === '/student/evolution' && $method === 'GET':
        CareerEvolutionController::getEvolution(AuthMiddleware::authenticate());
        break;

    case $path === '/student/weekly-plan' && $method === 'GET':
        CareerEvolutionController::getWeeklyPlan(AuthMiddleware::authenticate());
        break;

    case preg_match('#^/student/weekly-plan/task/([a-zA-Z0-9_-]+)/toggle$#', $path, $matches) && $method === 'POST':
        CareerEvolutionController::toggleWeeklyTask(AuthMiddleware::authenticate(), $matches[1]);
        break;

    case $path === '/career-coach/message' && $method === 'POST':
        CareerEvolutionController::chatCoach(AuthMiddleware::authenticate());
        break;

    case $path === '/skills/dependencies' && $method === 'GET':
        CareerEvolutionController::getSkillDependencies();
        break;


    // -----------------------------------------------------------------------
    // SkillBridge 3.0 — College Placement Mode
    // -----------------------------------------------------------------------
    case $path === '/college/dashboard' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        CollegePlacementController::getDashboard($user);
        break;

    case $path === '/college/students' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        CollegePlacementController::getStudents($user);
        break;

    case $path === '/college/drives' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        CollegePlacementController::createDrive($user);
        break;

    case $path === '/college/analytics' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        CollegePlacementController::getAnalytics($user);
        break;

    case $path === '/college/students/enroll' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        CollegePlacementController::enrollStudent($user);
        break;

    default:
        Logger::warning("404 Route Not Found: {$method} {$path}");
        errorResponse("Endpoint not found: {$method} {$path}", 404);
}

