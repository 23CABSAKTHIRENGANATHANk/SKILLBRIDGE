<?php
declare(strict_types=1);

/**
 * Enterprise Production Structured Logger
 * 
 * Features:
 * - Structured JSON logging format
 * - Automatic daily log rotation
 * - Comprehensive recursive secret and credential redaction
 * - Contextual metadata & safe request tracing
 * - Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
 */
class Logger {
    private const LOG_DIR = __DIR__ . '/../storage/logs';

    private static function ensureLogDirectory(): string {
        $dir = self::LOG_DIR;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    /**
     * Recursively sanitize and redact sensitive values from logs
     */
    private static function redact(mixed $data): mixed {
        if (is_array($data)) {
            $sanitized = [];
            foreach ($data as $key => $val) {
                $lower = strtolower((string)$key);
                if (
                    in_array($lower, ['password', 'password_hash', 'token', 'access_token', 'refresh_token', 'authorization', 'cookie', 'database_url', 'gemini_api_key', 'github_token', 'private_key', 'secret'], true)
                    || str_contains($lower, 'secret')
                    || str_contains($lower, 'password')
                    || str_contains($lower, 'token')
                    || str_contains($lower, 'apikey')
                ) {
                    $sanitized[$key] = '[REDACTED]';
                } else {
                    $sanitized[$key] = self::redact($val);
                }
            }
            return $sanitized;
        } elseif (is_string($data)) {
            // Redact Bearer tokens, credentials in URIs, etc.
            $data = preg_replace('/Bearer\s+[A-Za-z0-9._-]+/i', 'Bearer [REDACTED]', $data);
            $data = preg_replace('/:[^:@]+@/', ':***@', $data);
            return $data;
        }
        return $data;
    }

    public static function log(string $level, string $message, array $context = []): void {
        $dir = self::ensureLogDirectory();
        $date = date('Y-m-d');
        $logFile = "{$dir}/app-{$date}.log";

        $sanitizedContext = self::redact($context);
        $sanitizedMessage = self::redact($message);

        $entry = [
            'timestamp'   => date('c'),
            'level'       => strtoupper($level),
            'message'     => $sanitizedMessage,
            'environment' => getenv('APP_ENV') ?: 'production',
            'ip'          => $_SERVER['REMOTE_ADDR'] ?? 'CLI',
            'uri'         => preg_replace('/:[^:@]+@/', ':***@', $_SERVER['REQUEST_URI'] ?? 'CLI'),
            'context'     => $sanitizedContext
        ];

        $json = json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
        @file_put_contents($logFile, $json, FILE_APPEND | LOCK_EX);
    }

    public static function info(string $message, array $context = []): void {
        self::log('INFO', $message, $context);
    }

    public static function warning(string $message, array $context = []): void {
        self::log('WARNING', $message, $context);
    }

    public static function error(string $message, array $context = []): void {
        self::log('ERROR', $message, $context);
    }

    public static function critical(string $message, array $context = []): void {
        self::log('CRITICAL', $message, $context);
    }

    /**
     * Retrieve recent log entries for Admin Dashboard
     */
    public static function getRecentLogs(int $limit = 50): array {
        $dir = self::ensureLogDirectory();
        $date = date('Y-m-d');
        $logFile = "{$dir}/app-{$date}.log";

        if (!file_exists($logFile)) {
            return [];
        }

        $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $recent = array_slice($lines, -$limit);

        $parsed = [];
        foreach (array_reverse($recent) as $line) {
            $data = json_decode($line, true);
            if ($data) {
                $parsed[] = $data;
            }
        }

        return $parsed;
    }
}
