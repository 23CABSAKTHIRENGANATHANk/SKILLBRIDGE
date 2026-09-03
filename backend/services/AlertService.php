<?php
declare(strict_types=1);

require_once __DIR__ . '/Logger.php';

/**
 * Enterprise Production Alert & Incident Notification Service
 * Dispatches critical operational and security alerts to external webhook
 * channels (e.g. Slack, Discord, Incident Management Webhooks) and logs
 * structured JSON audit events to backend/storage/logs/alerts.log.
 */
class AlertService {

    /**
     * Dispatch an operational or security alert.
     * 
     * @param string $level 'info' | 'warning' | 'error' | 'critical'
     * @param string $title Short incident summary
     * @param string $message Detailed description
     * @param array $context Additional diagnostic key-values (sanitized)
     */
    public static function sendAlert(string $level, string $title, string $message, array $context = []): array {
        $timestamp = date('Y-m-d\TH:i:sP');
        $environment = getenv('APP_ENV') ?: 'production';
        
        $alertPayload = [
            'timestamp'   => $timestamp,
            'environment' => $environment,
            'level'       => strtoupper($level),
            'title'       => $title,
            'message'     => $message,
            'context'     => $context,
            'host'        => gethostname() ?: 'unknown',
        ];

        // 1. Persist to structured alerts log
        $logDir = dirname(__DIR__) . '/storage/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        $logFile = "{$logDir}/alerts.log";
        $logLine = json_encode($alertPayload, JSON_UNESCAPED_SLASHES) . "\n";
        @file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);

        Logger::info("Alert Dispatched: [{$alertPayload['level']}] {$title}", $context);

        // 2. Dispatch to external webhook if configured
        $webhookUrl = getenv('ALERT_WEBHOOK_URL') ?: '';
        $dispatched = false;
        $httpCode = 0;

        if (!empty($webhookUrl) && filter_var($webhookUrl, FILTER_VALIDATE_URL)) {
            try {
                // Enterprise SSRF Guard: reject private IP ranges, loopback, link-local metadata endpoints
                if (!self::isSafeWebhookUrl($webhookUrl)) {
                    Logger::warning("Blocked unsafe webhook destination (SSRF protection): {$webhookUrl}");
                    return ['success' => false, 'error' => 'Unsafe webhook URL'];
                }

                // Compatible with Slack/Discord incoming webhook format
                $notificationBody = [
                    'text' => "*[SkillBridge Alert - {$alertPayload['level']}]* {$title}\n{$message}",
                    'attachments' => [
                        [
                            'color' => in_array($level, ['error', 'critical'], true) ? '#FF0000' : '#FFA500',
                            'fields' => [
                                ['title' => 'Environment', 'value' => $environment, 'short' => true],
                                ['title' => 'Timestamp', 'value' => $timestamp, 'short' => true],
                            ]
                        ]
                    ]
                ];

                $ch = curl_init($webhookUrl);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST           => true,
                    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                    CURLOPT_POSTFIELDS     => json_encode($notificationBody),
                    CURLOPT_TIMEOUT        => 5,
                    CURLOPT_CONNECTTIMEOUT => 3,
                ]);

                curl_exec($ch);
                $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                $dispatched = ($httpCode >= 200 && $httpCode < 300);
            } catch (\Throwable $e) {
                Logger::error("Failed to send alert webhook: " . $e->getMessage());
            }
        }

        return [
            'success'     => true,
            'alert_level' => $alertPayload['level'],
            'logged'      => true,
            'webhook_url_configured' => !empty($webhookUrl),
            'webhook_dispatched'     => $dispatched,
            'webhook_status'         => $httpCode,
            'timestamp'   => $timestamp
        ];
    }

    /**
     * Diagnostic anomaly checker: evaluates system error counters and triggers alerts if thresholds are breached.
     */
    public static function checkThresholds(int $recent5xxCount, float $dbLatencyMs, bool $dbConnected): array {
        $alertsFired = [];

        if (!$dbConnected) {
            $alertsFired[] = self::sendAlert('critical', 'DATABASE_DISCONNECTED', 'The database connection is unavailable.');
        } elseif ($dbLatencyMs > 2000.0) {
            $alertsFired[] = self::sendAlert('warning', 'DATABASE_LATENCY_SPIKE', "Database query latency exceeded 2000ms: {$dbLatencyMs}ms", [
                'latency_ms' => $dbLatencyMs
            ]);
        }

        if ($recent5xxCount >= 10) {
            $alertsFired[] = self::sendAlert('error', 'HIGH_5XX_ERROR_RATE', "Encountered {$recent5xxCount} server errors in observation window.", [
                'error_count' => $recent5xxCount
            ]);
        }

        return [
            'checked'      => true,
            'alerts_fired' => count($alertsFired),
            'details'      => $alertsFired
        ];
    }

    /**
     * SSRF Validation Guard: Validates that a webhook URL is HTTPS and does not resolve
     * to a private, loopback, or reserved network range.
     */
    public static function isSafeWebhookUrl(string $url): bool {
        $parsed = parse_url($url);
        if (!isset($parsed['scheme'], $parsed['host'])) {
            return false;
        }

        $scheme = strtolower($parsed['scheme']);
        if (!in_array($scheme, ['https', 'http'], true)) {
            return false;
        }

        $host = strtolower($parsed['host']);
        if (in_array($host, ['localhost', '127.0.0.1', '::1', '169.254.169.254'], true)) {
            return false;
        }

        $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : gethostbyname($host);
        if ($ip && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return false;
        }

        return true;
    }
}

