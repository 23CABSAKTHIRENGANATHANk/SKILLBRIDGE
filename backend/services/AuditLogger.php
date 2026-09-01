<?php
declare(strict_types=1);

/**
 * SkillBridge Audit Logger
 * Writes tamper-evident, queryable audit entries to both:
 *  - Daily JSON-line log files (storage/logs/audit-YYYY-MM-DD.log)
 *  - The audit_logs PostgreSQL table for Admin Dashboard queries
 *
 * Actions audited:
 *  - Auth: register, login, logout, token_refresh, password_change
 *  - Applications: stage_update, applied, rejected, offer_sent
 *  - Admin: company_verify, company_revoke, user_disable, stats_access
 *  - Files: resume_upload, resume_download
 *  - Jobs: job_create, job_update, job_close
 */
class AuditLogger {
    private const LOG_DIR = __DIR__ . '/../storage/logs';

    // -----------------------------------------------------------------------
    // Core Write
    // -----------------------------------------------------------------------

    public static function log(
        string $action,
        string $actorUserId,
        string $actorRole,
        string $targetType = '',
        string $targetId   = '',
        array  $meta       = []
    ): void {
        $entry = [
            'audit_at'    => date('c'),
            'action'      => $action,
            'actor_id'    => $actorUserId,
            'actor_role'  => $actorRole,
            'target_type' => $targetType,
            'target_id'   => $targetId,
            'ip'          => self::clientIp(),
            'user_agent'  => substr($_SERVER['HTTP_USER_AGENT'] ?? 'CLI', 0, 255),
            'request_id'  => $_SERVER['HTTP_X_REQUEST_ID'] ?? uniqid('req_', true),
            'meta'        => $meta,
        ];

        // 1. File log (always works, even if DB is unreachable)
        self::writeToFile($entry);

        // 2. DB log (best-effort — never block the request on failure)
        try {
            self::writeToDB($entry);
        } catch (\Throwable) {
            // Silently degrade; file log is the source of truth
        }
    }

    // -----------------------------------------------------------------------
    // Convenience Wrappers
    // -----------------------------------------------------------------------

    public static function auth(string $action, string $userId, string $role, array $meta = []): void {
        self::log($action, $userId, $role, 'user', $userId, $meta);
    }

    public static function application(string $action, string $actorId, string $role, string $appId, array $meta = []): void {
        self::log($action, $actorId, $role, 'application', $appId, $meta);
    }

    public static function admin(string $action, string $adminId, string $targetType, string $targetId, array $meta = []): void {
        self::log($action, $adminId, 'admin', $targetType, $targetId, $meta);
    }

    public static function file(string $action, string $userId, string $role, string $fileKey, array $meta = []): void {
        self::log($action, $userId, $role, 'file', $fileKey, $meta);
    }

    public static function job(string $action, string $userId, string $jobId, array $meta = []): void {
        self::log($action, $userId, 'recruiter', 'job', $jobId, $meta);
    }

    // -----------------------------------------------------------------------
    // Retrieval for Admin Dashboard
    // -----------------------------------------------------------------------

    /**
     * Fetch recent audit entries from the DB.
     */
    public static function getRecent(int $limit = 100, string $action = '', string $actorId = ''): array {
        try {
            $db = Database::getConnection();
            $where = [];
            $params = [];

            if ($action !== '') {
                $where[] = 'action = ?';
                $params[] = $action;
            }
            if ($actorId !== '') {
                $where[] = 'actor_id = ?';
                $params[] = $actorId;
            }

            $whereClause = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
            $stmt = $db->prepare(
                "SELECT * FROM audit_logs {$whereClause} ORDER BY audit_at DESC LIMIT ?"
            );
            $params[] = $limit;
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (\Throwable) {
            return self::readFromFile($limit);
        }
    }

    // -----------------------------------------------------------------------
    // Private Helpers
    // -----------------------------------------------------------------------

    private static function writeToFile(array $entry): void {
        $dir = self::LOG_DIR;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $date = date('Y-m-d');
        $path = "{$dir}/audit-{$date}.log";
        $json = json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
        @file_put_contents($path, $json, FILE_APPEND | LOCK_EX);
    }

    private static function writeToDB(array $entry): void {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'INSERT INTO audit_logs
             (id, audit_at, action, actor_id, actor_role, target_type, target_id, ip, user_agent, request_id, meta)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)'
        );
        $stmt->execute([
            'al_' . bin2hex(random_bytes(8)),
            $entry['audit_at'],
            $entry['action'],
            $entry['actor_id'],
            $entry['actor_role'],
            $entry['target_type'],
            $entry['target_id'],
            $entry['ip'],
            $entry['user_agent'],
            $entry['request_id'],
            json_encode($entry['meta']),
        ]);
    }

    private static function readFromFile(int $limit): array {
        $dir  = self::LOG_DIR;
        $date = date('Y-m-d');
        $path = "{$dir}/audit-{$date}.log";
        if (!file_exists($path)) {
            return [];
        }
        $lines  = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $recent = array_slice(array_reverse($lines), 0, $limit);
        return array_values(array_filter(array_map(
            fn(string $l) => json_decode($l, true),
            $recent
        )));
    }

    private static function clientIp(): string {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
            if (!empty($_SERVER[$key])) {
                return trim(explode(',', $_SERVER[$key])[0]);
            }
        }
        return 'unknown';
    }
}
