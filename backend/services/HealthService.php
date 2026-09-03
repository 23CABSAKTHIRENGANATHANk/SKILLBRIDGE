<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

/**
 * Enterprise Production Health & Observability Diagnostic Service
 * Provides sanitized, non-leaking health checks distinguishing application
 * and database status without exposing credentials, hosts, or internal stacks.
 */
class HealthService {

    /**
     * Dedicated database health check
     * Example: { "status": "healthy", "database": "healthy" }
     */
    public static function getDatabaseHealth(): array {
        $db = Database::getHealth();
        $isHealthy = ($db['status'] === 'healthy' && $db['connected'] === true);

        return [
            'status' => $isHealthy ? 'healthy' : 'degraded',
            'database' => $isHealthy ? 'healthy' : 'unavailable',
            'latency_ms' => $db['latency_ms'] ?? null
        ];
    }

    /**
     * Comprehensive system health check
     */
    public static function checkHealth(): array {
        $startTime = microtime(true);
        $checks = [];
        $healthy = true;

        // 1. Database Check
        $dbHealth = Database::getHealth();
        $dbConnected = ($dbHealth['status'] === 'healthy' && $dbHealth['connected'] === true);

        $checks['database'] = [
            'status' => $dbConnected ? 'healthy' : 'unavailable',
            'driver' => 'pgsql',
            'connected' => $dbConnected,
            'latency_ms' => $dbHealth['latency_ms'] ?? null
        ];

        if (!$dbConnected) {
            $healthy = false;
        }

        // 2. Storage Writeability Check
        $storageRoot = dirname(__DIR__) . '/storage';
        $resumesDir = "{$storageRoot}/resumes";
        $logsDir = "{$storageRoot}/logs";
        $uploadsDir = dirname(__DIR__) . '/uploads/logos';

        $storageWritable = is_writable($storageRoot) || (!is_dir($storageRoot) && is_writable(dirname($storageRoot)));
        $checks['storage'] = [
            'status' => $storageWritable ? 'healthy' : 'degraded',
            'resumes_writable' => is_writable($resumesDir) || is_writable($storageRoot),
            'logs_writable' => is_writable($logsDir) || is_writable($storageRoot),
            'uploads_writable' => is_writable($uploadsDir) || is_writable(dirname(__DIR__) . '/uploads')
        ];

        if (!$storageWritable) {
            $healthy = false;
        }

        // 3. Disk Space & Memory
        $freeDisk = @disk_free_space(dirname(__DIR__));
        $totalDisk = @disk_total_space(dirname(__DIR__));
        $diskUsagePercent = ($totalDisk && $totalDisk > 0) ? round((1 - ($freeDisk / $totalDisk)) * 100, 1) : 0;

        $checks['system'] = [
            'php_version' => PHP_VERSION,
            'memory_used_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
            'memory_peak_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
            'disk_usage_percent' => $diskUsagePercent,
            'disk_free_gb' => $freeDisk ? round($freeDisk / 1024 / 1024 / 1024, 2) : null
        ];

        $totalDurationMs = round((microtime(true) - $startTime) * 1000, 2);

        return [
            'status' => $healthy ? 'healthy' : 'degraded',
            'application' => 'healthy',
            'database' => $dbConnected ? 'healthy' : 'unavailable',
            'timestamp' => date(DATE_ISO8601),
            'duration_ms' => $totalDurationMs,
            'environment' => getenv('APP_ENV') ?: 'production',
            'checks' => $checks
        ];
    }
}
