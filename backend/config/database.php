<?php
declare(strict_types=1);

/**
 * SkillBridge Enterprise PostgreSQL Database Connection Manager
 * Supports Neon Serverless PostgreSQL with SNI / Endpoint ID resolution,
 * direct DATABASE_URL or individual DB_* env variables.
 */
class Database {
    private static ?PDO $pdo = null;

    private static function loadEnv(): void {
        $envFile = dirname(__DIR__) . '/.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || str_starts_with($line, '#')) continue;
                if (str_contains($line, '=')) {
                    [$key, $value] = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value, " \t\n\r\0\x0B\"'");
                    if (!getenv($key)) {
                        putenv("{$key}={$value}");
                        $_ENV[$key] = $value;
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

        $databaseUrl = getenv('DATABASE_URL');

        if (!empty($databaseUrl)) {
            // Parse full connection string e.g. postgresql://user:pass@host:port/dbname?sslmode=require
            $parsed = parse_url($databaseUrl);
            $host = $parsed['host'] ?? '127.0.0.1';
            $port = (string)($parsed['port'] ?? '5432');
            $user = urldecode($parsed['user'] ?? '');
            $pass = urldecode($parsed['pass'] ?? '');
            $dbname = ltrim($parsed['path'] ?? 'neondb', '/');
            
            parse_str($parsed['query'] ?? '', $query);
            $sslmode = $query['sslmode'] ?? 'require';
        } else {
            $host = getenv('DB_HOST') ?: '127.0.0.1';
            $port = getenv('DB_PORT') ?: '5432';
            $dbname = getenv('DB_NAME') ?: 'skillbridge';
            $user = getenv('DB_USER') ?: 'postgres';
            $pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
            $sslmode = getenv('DB_SSLMODE') ?: 'require';
        }

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
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed: ' . $e->getMessage(),
                'hint' => 'Check your DATABASE_URL or PostgreSQL credentials in backend/.env'
            ]);
            exit;
        }
    }
}
