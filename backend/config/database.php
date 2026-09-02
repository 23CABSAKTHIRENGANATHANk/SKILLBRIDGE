<?php
declare(strict_types=1);

/**
 * SkillBridge Enterprise PostgreSQL Database Connection Manager
 * Supports Neon Serverless PostgreSQL with SNI / Endpoint ID resolution,
 * direct DATABASE_URL or individual DB_* env variables.
 */
class Database {
    private static ?PDO $pdo = null;

    public static function loadEnv(): void {
        $possibleFiles = [
            dirname(__DIR__) . '/.env',
            dirname(dirname(__DIR__)) . '/.env',
        ];

        foreach ($possibleFiles as $envFile) {
            if (file_exists($envFile)) {
                $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (empty($line) || str_starts_with($line, '#')) continue;
                    if (str_contains($line, '=')) {
                        [$key, $value] = explode('=', $line, 2);
                        $key = trim($key);
                        $value = trim($value, " \t\n\r\0\x0B\"'");
                        if (!str_contains($value, 'USER:PASSWORD@HOST') && !str_starts_with($value, 'CHANGE_ME')) {
                            $existingValue = getenv($key);
                            if ($existingValue !== false && $existingValue !== '') {
                                continue;
                            }
                            putenv("{$key}={$value}");
                            $_ENV[$key] = $value;
                            $_SERVER[$key] = $value;
                        }
                    }
                }
            }
        }
    }

    public static function getConnection(): PDO {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        self::loadEnv();

        $databaseUrl = getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? ($_SERVER['DATABASE_URL'] ?? ''));
        if (empty($databaseUrl) || str_contains($databaseUrl, '@HOST') || str_contains($databaseUrl, 'CHANGE_ME')) {
            throw new RuntimeException('DATABASE_URL is required and must be set in backend/.env. Placeholder values are not allowed.');
        }

        // Parse full connection string e.g. postgresql://user:pass@host:port/dbname?sslmode=require
        $parsed = parse_url($databaseUrl);
        if ($parsed === false || empty($parsed['host'])) {
            throw new RuntimeException('DATABASE_URL is invalid. Provide a complete PostgreSQL connection string.');
        }

        $host = $parsed['host'];
        $port = (string)($parsed['port'] ?? '5432');
        $user = urldecode($parsed['user'] ?? '');
        $pass = urldecode($parsed['pass'] ?? '');
        $dbname = ltrim($parsed['path'] ?? 'skillbridge', '/');

        parse_str($parsed['query'] ?? '', $query);
        $sslmode = $query['sslmode'] ?? 'require';

        // Handle Neon endpoint ID for libpq compatibility
        $optionsPart = "--client_encoding=UTF8";
        if (str_contains($host, '.neon.tech')) {
            $parts = explode('.', $host);
            // If host starts with pooler e.g. ep-xxx-pooler, endpoint is ep-xxx
            $endpoint = preg_replace('/-pooler$/', '', $parts[0]);
            $optionsPart .= " endpoint={$endpoint}";
        }

        $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode={$sslmode};options='{$optionsPart}'";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false
        ];

        try {
            self::$pdo = new PDO($dsn, $user, $pass, $options);
            return self::$pdo;
        } catch (PDOException $e) {
            error_log('Database connection failed: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed.',
                'hint' => 'Check your DATABASE_URL or PostgreSQL credentials in backend/.env'
            ]);
            exit;
        }
    }
}
