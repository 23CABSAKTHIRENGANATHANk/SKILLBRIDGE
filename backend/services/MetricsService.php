<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/HealthService.php';

/**
 * Enterprise Production Prometheus & OpenMetrics Telemetry Exporter
 * Provides standard Prometheus text exposition format (version 0.0.4)
 * for scraping by Prometheus, Datadog OpenMetrics, VictoriaMetrics, or Grafana Agent.
 */
class MetricsService {

    /**
     * Render system and application metrics in standard Prometheus exposition format.
     */
    public static function renderPrometheus(): string {
        $lines = [];
        $lines[] = '# HELP skillbridge_uptime_seconds Total runtime uptime of the SkillBridge backend service.';
        $lines[] = '# TYPE skillbridge_uptime_seconds gauge';
        $lines[] = 'skillbridge_uptime_seconds ' . (time() - (int)($_SERVER['REQUEST_TIME'] ?? time()));

        // Memory Metrics
        $memUsage = memory_get_usage(true);
        $memPeak = memory_get_peak_usage(true);
        $lines[] = '# HELP skillbridge_memory_usage_bytes Current allocated memory in bytes.';
        $lines[] = '# TYPE skillbridge_memory_usage_bytes gauge';
        $lines[] = "skillbridge_memory_usage_bytes {$memUsage}";

        $lines[] = '# HELP skillbridge_memory_peak_bytes Peak allocated memory in bytes.';
        $lines[] = '# TYPE skillbridge_memory_peak_bytes gauge';
        $lines[] = "skillbridge_memory_peak_bytes {$memPeak}";

        // Database Metrics
        $dbHealth = Database::getHealth();
        $dbConnected = ($dbHealth['status'] === 'healthy' && $dbHealth['connected'] === true) ? 1 : 0;
        $dbLatency = (float)($dbHealth['latency_ms'] ?? 0.0);

        $lines[] = '# HELP skillbridge_db_connected Database connectivity state (1 = connected, 0 = disconnected).';
        $lines[] = '# TYPE skillbridge_db_connected gauge';
        $lines[] = "skillbridge_db_connected {$dbConnected}";

        $lines[] = '# HELP skillbridge_db_latency_ms Measured database roundtrip query latency in milliseconds.';
        $lines[] = '# TYPE skillbridge_db_latency_ms gauge';
        $lines[] = "skillbridge_db_latency_ms {$dbLatency}";

        // Database Counts
        try {
            $db = Database::getConnection();
            $userCount = (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn();
            $jobCount = (int)$db->query('SELECT COUNT(*) FROM jobs')->fetchColumn();
            $appCount = (int)$db->query('SELECT COUNT(*) FROM applications')->fetchColumn();
            
            $lines[] = '# HELP skillbridge_users_total Total registered users in the platform.';
            $lines[] = '# TYPE skillbridge_users_total counter';
            $lines[] = "skillbridge_users_total {$userCount}";

            $lines[] = '# HELP skillbridge_jobs_total Total posted jobs.';
            $lines[] = '# TYPE skillbridge_jobs_total counter';
            $lines[] = "skillbridge_jobs_total {$jobCount}";

            $lines[] = '# HELP skillbridge_applications_total Total job applications submitted.';
            $lines[] = '# TYPE skillbridge_applications_total counter';
            $lines[] = "skillbridge_applications_total {$appCount}";

            // Check if skill verification attempts table exists
            $svaCheck = $db->query("SELECT 1 FROM information_schema.tables WHERE table_name = 'skill_verification_attempts'")->fetchColumn();
            if ($svaCheck) {
                $verifCount = (int)$db->query('SELECT COUNT(*) FROM skill_verification_attempts')->fetchColumn();
                $lines[] = '# HELP skillbridge_verifications_total Total skill verification attempts.';
                $lines[] = '# TYPE skillbridge_verifications_total counter';
                $lines[] = "skillbridge_verifications_total {$verifCount}";
            }

            // Check if credentials table exists
            $credCheck = $db->query("SELECT 1 FROM information_schema.tables WHERE table_name = 'skill_credentials'")->fetchColumn();
            if ($credCheck) {
                $passCount = (int)$db->query('SELECT COUNT(*) FROM skill_credentials')->fetchColumn();
                $lines[] = '# HELP skillbridge_passports_issued_total Total cryptographic skill passports issued.';
                $lines[] = '# TYPE skillbridge_passports_issued_total counter';
                $lines[] = "skillbridge_passports_issued_total {$passCount}";
            }
        } catch (\Throwable $e) {
            // Degrade gracefully without throwing 500 on scraper
            $lines[] = '# HELP skillbridge_metrics_scrape_error Flag indicating if scrape encountered a partial error.';
            $lines[] = '# TYPE skillbridge_metrics_scrape_error gauge';
            $lines[] = 'skillbridge_metrics_scrape_error 1';
        }

        $lines[] = ''; // trailing newline
        return implode("\n", $lines);
    }
}
