<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/cors.php';

/**
 * Enterprise In-Memory / File-Based API Rate Limiter
 */
class RateLimitMiddleware {
    private static function getStorageDir(): string {
        $dir = sys_get_temp_dir() . '/skillbridge_ratelimit';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    private static function getClientIp(): string {
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }

    /**
     * Enforce rate limit per IP & action
     *
     * @param string $action Action key, e.g. 'auth_login' or 'api_general'
     * @param int $maxAttempts Max permitted requests within window
     * @param int $windowSeconds Duration window in seconds
     */
    public static function check(string $action, int $maxAttempts = 60, int $windowSeconds = 60): void {
        if (getenv('APP_ENV') === 'testing') {
            return;
        }
        $ip = self::getClientIp();
        $key = md5("{$ip}_{$action}");
        $file = self::getStorageDir() . "/{$key}.json";

        $now = time();
        $data = ['count' => 0, 'start' => $now];

        if (file_exists($file)) {
            $content = file_get_contents($file);
            $parsed = json_decode($content ?: '{}', true);
            if ($parsed && isset($parsed['start']) && ($now - $parsed['start']) < $windowSeconds) {
                $data = $parsed;
            }
        }

        $data['count']++;

        if ($data['count'] > $maxAttempts) {
            $retryAfter = $windowSeconds - ($now - $data['start']);
            header("Retry-After: {$retryAfter}");
            header("X-RateLimit-Limit: {$maxAttempts}");
            header("X-RateLimit-Remaining: 0");
            header("X-RateLimit-Reset: " . ($data['start'] + $windowSeconds));

            errorResponse("Too many requests. Rate limit exceeded. Please try again in {$retryAfter} seconds.", 429);
        }

        @file_put_contents($file, json_encode($data));

        header("X-RateLimit-Limit: {$maxAttempts}");
        header("X-RateLimit-Remaining: " . max(0, $maxAttempts - $data['count']));
        header("X-RateLimit-Reset: " . ($data['start'] + $windowSeconds));
    }
}
