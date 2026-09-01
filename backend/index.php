<?php
declare(strict_types=1);

/**
 * SkillBridge Central REST API Router (Production Hardened & Monitored)
 */

require_once __DIR__ . '/config/cors.php';
handleCors();

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/jwt.php';
require_once __DIR__ . '/services/Logger.php';
require_once __DIR__ . '/services/HealthService.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/middleware/RateLimitMiddleware.php';

// Load Controllers
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/JobController.php';
require_once __DIR__ . '/controllers/CompanyController.php';
require_once __DIR__ . '/controllers/StudentController.php';
require_once __DIR__ . '/controllers/ApplicationController.php';
require_once __DIR__ . '/controllers/NotificationController.php';
require_once __DIR__ . '/controllers/AdminController.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Normalize path: strip leading /api or backend path
$path = preg_replace('#^/api|^/backend/index\.php|^/backend#', '', $uri);
$path = '/' . trim($path, '/');

// Global Rate Limiting: 120 reqs/min for general API
RateLimitMiddleware::check('global_api', 120, 60);

// Match routes
switch (true) {
    // --- Health & Uptime Diagnostics ---
    case $path === '/' || $path === '/health':
        $health = HealthService::checkHealth();
        $statusCode = ($health['status'] === 'healthy') ? 200 : 503;
        jsonResponse($health, $statusCode);
        break;

    case $path === '/ping':
        jsonResponse(['status' => 'pong', 'timestamp' => time()]);
        break;

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

    case $path === '/student/dashboard' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        StudentController::getDashboard($user);
        break;

    case $path === '/student/skills' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        StudentController::addSkill($user);
        break;

    case $path === '/student/resume' && $method === 'POST':
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

    // --- Notifications ---
    case $path === '/notifications' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        NotificationController::list($user);
        break;

    case $path === '/notifications/read' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        NotificationController::markRead($user);
        break;

    // --- Admin & Monitoring ---
    case $path === '/admin/stats' && $method === 'GET':
        AdminController::getStats();
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

    default:
        Logger::warning("404 Route Not Found: {$method} {$path}");
        errorResponse("Endpoint not found: {$method} {$path}", 404);
}
