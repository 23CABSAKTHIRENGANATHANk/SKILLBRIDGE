<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../config/cors.php';

/**
 * Authentication and Role Authorization Middleware
 */
class AuthMiddleware {
    private static function getAuthorizationHeader(): ?string {
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return $_SERVER['HTTP_AUTHORIZATION'];
        }
        if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $key => $val) {
                if (strcasecmp($key, 'Authorization') === 0) {
                    return $val;
                }
            }
        }
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $key => $val) {
                if (strcasecmp($key, 'Authorization') === 0) {
                    return $val;
                }
            }
        }
        return null;
    }

    /**
     * Authenticate request and return token payload or fail with 401
     */
    public static function authenticate(): array {
        $authHeader = self::getAuthorizationHeader();

        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', trim($authHeader), $matches)) {
            errorResponse('Missing or invalid Authorization header. Bearer token required.', 401);
        }

        $token = trim($matches[1]);
        $payload = JWT::decode($token);

        if (!$payload) {
            errorResponse('Invalid or expired authentication token.', 401);
        }

        return $payload;
    }

    /**
     * Optional authentication — returns user payload or null if anonymous
     */
    public static function optionalAuth(): ?array {
        $authHeader = self::getAuthorizationHeader();

        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', trim($authHeader), $matches)) {
            return null;
        }

        return JWT::decode(trim($matches[1]));
    }

    /**
     * Ensure current user has one of the allowed roles
     */
    public static function requireRole(array $user, string ...$allowedRoles): void {
        if (!in_array($user['role'] ?? '', $allowedRoles, true)) {
            errorResponse('Access denied. Insufficient permissions for this action.', 403);
        }
    }
}
