<?php
declare(strict_types=1);

/**
 * SkillBridge Enterprise PostgreSQL Database Connection Manager
 * Supports Neon Serverless PostgreSQL with SNI / Endpoint ID resolution,
 * environment isolation (development, staging, production, testing),
 * connection pooling attributes, bounded retries, and clean health diagnostics.
 */
class Database {
    private static ?PDO $pdo = null;

    public static function loadEnv(): void {
        $env = getenv('APP_ENV') ?: ($_ENV['APP_ENV'] ?? ($_SERVER['APP_ENV'] ?? 'development'));
        $possibleFiles = ($env === 'testing')
            ? [dirname(__DIR__) . '/.env.testing']
            : [dirname(__DIR__) . '/.env', dirname(dirname(__DIR__)) . '/.env'];

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
                            if (getenv($key) === false) {
                                putenv("{$key}={$value}");
                                $_ENV[$key] = $value;
                                $_SERVER[$key] = $value;
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Resolve the active database connection string based on APP_ENV
     */
    public static function resolveDatabaseUrl(): string {
        self::loadEnv();
        $env = strtolower(getenv('APP_ENV') ?: ($_ENV['APP_ENV'] ?? 'production'));

        if ($env === 'testing') {
            $testUrl = getenv('TEST_DATABASE_URL') ?: ($_ENV['TEST_DATABASE_URL'] ?? '');
            if (empty($testUrl)) {
                throw new RuntimeException('Safety violation: TEST_DATABASE_URL is required when APP_ENV=testing.');
            }
            $parsedTest = parse_url($testUrl);
            $testHost = strtolower((string)($parsedTest['host'] ?? ''));
            $testDatabase = strtolower(ltrim((string)($parsedTest['path'] ?? ''), '/'));
            $localHosts = ['127.0.0.1', 'localhost', '::1'];
            if (!in_array($testHost, $localHosts, true) || !preg_match('/(^|[_-])test([_-]|$)/', $testDatabase)) {
                throw new RuntimeException('Safety violation: testing database must be a local isolated database with a test-specific name.');
            }
            return $testUrl;
        } elseif ($env === 'staging') {
            $stagingUrl = getenv('STAGING_DATABASE_URL') ?: ($_ENV['STAGING_DATABASE_URL'] ?? '');
            if (!empty($stagingUrl)) {
                return $stagingUrl;
            }
        }

        $databaseUrl = getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? ($_SERVER['DATABASE_URL'] ?? ''));

        // Guard against running tests against a production database url
        if ($env === 'testing' && str_contains(strtolower($databaseUrl), 'production') && !getenv('ALLOW_PROD_TEST')) {
            throw new RuntimeException('Safety violation: Automated testing against production database is strictly prohibited.');
        }

        return $databaseUrl;
    }

    public static function getConnection(): PDO {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $databaseUrl = self::resolveDatabaseUrl();

        if (empty($databaseUrl) || str_contains($databaseUrl, '@HOST') || str_contains($databaseUrl, 'CHANGE_ME')) {
            throw new RuntimeException('DATABASE_URL is not set or contains placeholders. Configure DATABASE_URL in backend/.env.');
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

        // Handle Neon endpoint ID for libpq / serverless router compatibility
        $optionsPart = "--client_encoding=UTF8";
        if (str_contains($host, '.neon.tech')) {
            $parts = explode('.', $host);
            $optionsPart .= " endpoint={$parts[0]}";
        }

        $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode={$sslmode};options='{$optionsPart}'";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => true,
            PDO::ATTR_TIMEOUT            => 5,
        ];

        // Bounded retry behavior for transient serverless cold-starts (max 2 retries)
        $maxRetries = 2;
        $attempt = 0;
        $lastException = null;

        while ($attempt <= $maxRetries) {
            try {
                $attempt++;
                self::$pdo = new PDO($dsn, $user, $pass, $options);
                return self::$pdo;
            } catch (PDOException $e) {
                $lastException = $e;
                if ($attempt <= $maxRetries) {
                    usleep(200000); // 200ms exponential backoff
                }
            }
        }

        // Redact credentials from error log
        $sanitizedError = preg_replace('/:[^:@]+@/', ':***@', $lastException ? $lastException->getMessage() : 'Unknown error');
        error_log("Database connection failed after {$maxRetries} retries: {$sanitizedError}");

        throw new RuntimeException('Database connection failed. Service degraded.');
    }

    /**
     * Check database connectivity and latency safely (No credentials exposed)
     */
    public static function getHealth(): array {
        $startTime = microtime(true);
        try {
            $db = self::getConnection();
            $stmt = $db->query('SELECT 1');
            $latency = round((microtime(true) - $startTime) * 1000, 2);
            return [
                'status' => 'healthy',
                'connected' => true,
                'driver' => 'pgsql',
                'latency_ms' => $latency
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'unavailable',
                'connected' => false,
                'driver' => 'pgsql',
                'error' => 'Database unreachable'
            ];
        }
    }

    /**
     * Reset cached connection (useful for testing reconnects)
     */
    public static function resetConnection(): void {
        self::$pdo = null;
    }
}
