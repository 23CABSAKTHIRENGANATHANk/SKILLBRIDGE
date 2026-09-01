<?php
declare(strict_types=1);

/**
 * SkillBridge Enterprise PostgreSQL Database Connection Manager
 * Automatically parses backend/.env if present, with fallback to defaults.
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

        $driver = getenv('DB_CONNECTION') ?: 'pgsql';
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $port = getenv('DB_PORT') ?: '5432';
        $dbname = getenv('DB_NAME') ?: 'skillbridge';
        $user = getenv('DB_USER') ?: 'postgres';
        $pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';

        if ($driver === 'pgsql') {
            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};options='--client_encoding=UTF8'";
        } else {
            $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
        }

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
                'hint' => 'Ensure PostgreSQL service is running on ' . $host . ':' . $port . ' and configured in backend/.env'
            ]);
            exit;
        }
    }
}
