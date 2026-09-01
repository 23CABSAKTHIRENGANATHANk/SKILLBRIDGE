<?php
declare(strict_types=1);

/**
 * Enterprise Production CORS & Security Headers Manager
 */

function handleCors(): void {
    $env = getenv('APP_ENV') ?: 'production';
    $allowedOrigins = [
        'https://skillbridge.dev',
        'https://www.skillbridge.dev',
        'https://app.skillbridge.dev',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:3000'
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $localhostOrigin = preg_match('/^http:\/\/(localhost|127\.0\.0\.1):(\d+)$/', $origin) === 1;

    if ($env === 'development' || in_array($origin, $allowedOrigins, true) || $localhostOrigin) {
        header("Access-Control-Allow-Origin: " . ($origin ?: '*'));
    } else if (!empty($allowedOrigins)) {
        header("Access-Control-Allow-Origin: " . $allowedOrigins[0]);
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 86400"); // 24 hours preflight cache
    header("Content-Type: application/json; charset=UTF-8");

    // Comprehensive Security Headers
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");
    header("X-XSS-Protection: 1; mode=block");
    header("Referrer-Policy: strict-origin-when-cross-origin");
    header("Permissions-Policy: geolocation=(), camera=(), microphone=()");
    
    if ($env === 'production' && (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')) {
        header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");
    }

    // Handle preflight OPTIONS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

require_once __DIR__ . '/response.php';
