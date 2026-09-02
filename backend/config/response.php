<?php
declare(strict_types=1);

/**
 * SkillBridge Standard API Response Helpers
 *
 * Enforces a single, consistent JSON envelope across every endpoint:
 *
 * SUCCESS:
 * {
 *   "success": true,
 *   "data": { ... },          // or top-level keys
 *   "meta": { "request_id", "timestamp", "version" },
 *   "pagination": { ... }     // only when relevant
 * }
 *
 * ERROR:
 * {
 *   "success": false,
 *   "error": "Human-readable message",
 *   "code":  "MACHINE_CODE",
 *   "errors": { "field": "message" },  // validation errors only
 *   "meta": { "request_id", "timestamp" }
 * }
 */

define('API_VERSION', '2.0.0');

// ---------------------------------------------------------------------------
// Shared meta block
// ---------------------------------------------------------------------------
function apiMeta(): array {
    static $requestId = null;
    if ($requestId === null) {
        $requestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? ('req_' . bin2hex(random_bytes(8)));
    }
    return [
        'request_id' => $requestId,
        'timestamp'  => date('c'),
        'version'    => API_VERSION,
    ];
}

// ---------------------------------------------------------------------------
// Success response
// ---------------------------------------------------------------------------
if (!function_exists('jsonResponse')) {
    function jsonResponse(array $payload, int $status = 200): never {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=UTF-8');
            header('X-Request-Id: ' . (apiMeta()['request_id']));
            header('X-API-Version: ' . API_VERSION);
            header('X-Content-Type-Options: nosniff');
            header('Cache-Control: no-store, no-cache, must-revalidate');
        }

        // Inject meta into every response automatically
        $payload['meta'] = $payload['meta'] ?? apiMeta();

        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit;
    }
}

// ---------------------------------------------------------------------------
// Paginated success response
// ---------------------------------------------------------------------------
if (!function_exists('jsonPaginatedResponse')) {
    function jsonPaginatedResponse(array $items, int $total, int $page, int $perPage, int $status = 200): never {
        $totalPages = (int)ceil($total / max($perPage, 1));
        jsonResponse([
            'success' => true,
            'data'    => $items,
            'pagination' => [
                'total'       => $total,
                'per_page'    => $perPage,
                'page'        => $page,
                'total_pages' => $totalPages,
                'has_next'    => $page < $totalPages,
                'has_prev'    => $page > 1,
            ],
        ], $status);
    }
}

// ---------------------------------------------------------------------------
// Error response
// ---------------------------------------------------------------------------
if (!function_exists('errorResponse')) {
    function errorResponse(
        string $message,
        int    $status = 400,
        string $code   = 'BAD_REQUEST',
        array  $errors = []
    ): never {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=UTF-8');
            header('X-Request-Id: ' . (apiMeta()['request_id']));
            header('X-Content-Type-Options: nosniff');
        }

        // Map HTTP status to a default machine code if not explicitly provided
        if ($code === 'BAD_REQUEST') {
            $codeMap = [
                400 => 'BAD_REQUEST',
                401 => 'UNAUTHORIZED',
                403 => 'FORBIDDEN',
                404 => 'NOT_FOUND',
                409 => 'CONFLICT',
                422 => 'VALIDATION_ERROR',
                429 => 'RATE_LIMITED',
                500 => 'INTERNAL_ERROR',
                503 => 'SERVICE_UNAVAILABLE',
            ];
            $code = $codeMap[$status] ?? 'ERROR';
        }

        $isProd = (getenv('APP_ENV') ?: 'production') === 'production';
        $clientMessage = ($isProd && $status >= 500)
            ? 'An unexpected server error occurred.'
            : $message;

        $body = [
            'success' => false,
            'error'   => $clientMessage,
            'code'    => $code,
            'meta'    => apiMeta(),
        ];

        if (!empty($errors)) {
            $body['errors'] = $errors;
        }

        echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ---------------------------------------------------------------------------
// Fatal handler — catches uncaught exceptions and returns JSON instead of HTML
// ---------------------------------------------------------------------------
function registerGlobalErrorHandler(): void {
    set_exception_handler(function (\Throwable $e) {
        $isProd = (getenv('APP_ENV') ?: 'production') === 'production';
        $message = $isProd ? 'An unexpected server error occurred.' : $e->getMessage();

        // Attempt to log — may fail if Logger not loaded yet
        if (class_exists('Logger', false)) {
            Logger::critical('Uncaught exception', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'trace'   => array_slice(array_map(
                    fn($f) => ($f['file'] ?? '') . ':' . ($f['line'] ?? ''),
                    $e->getTrace()
                ), 0, 6),
            ]);
        }

        errorResponse($message, 500, 'INTERNAL_ERROR');
    });

    set_error_handler(function (int $severity, string $msg, string $file, int $line): bool {
        if ($severity & (E_ERROR | E_PARSE | E_CORE_ERROR)) {
            throw new \ErrorException($msg, 0, $severity, $file, $line);
        }
        return false;
    });
}
