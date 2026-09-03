<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/database.php';

final class JobsFetcher
{
    private static function fetch(string $batchId, string $sourceId, string $url, callable $map): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_FOLLOWLOCATION => true, CURLOPT_HTTPHEADER => ['User-Agent: SkillBridge-Career-Platform/3.0 (+https://skillbridge.dev/data-sources)']]);
        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch) ?: null;
        curl_close($ch);
        if ($httpCode !== 200 || !$response) return ['source' => $sourceId, 'staged' => 0, 'http_code' => $httpCode, 'error' => $error];

        $records = json_decode($response, true);
        if (!is_array($records)) return ['source' => $sourceId, 'staged' => 0, 'http_code' => $httpCode, 'error' => 'Invalid JSON'];
        $records = isset($records['data']) && is_array($records['data']) ? $records['data'] : $records;
        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO staging_jobs (batch_id, source_id, external_id, title, company_name, location, type, salary_range, url, skills, raw_payload, validation_status, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?) ON CONFLICT DO NOTHING");
        $staged = 0;
        foreach (array_slice($records, 0, 50) as $record) {
            $job = $map($record);
            if (!$job || !filter_var($job['url'], FILTER_VALIDATE_URL) || !str_starts_with($job['url'], 'https://') || !$job['is_technical']) continue;
            $safe = ['external_id' => $job['external_id'], 'title' => $job['title'], 'company_name' => $job['company_name'], 'location' => $job['location'], 'tags' => $job['tags'], 'url' => $job['url']];
            $json = json_encode($safe, JSON_THROW_ON_ERROR);
            $stmt->execute([$batchId, $sourceId, $job['external_id'], $job['title'], $job['company_name'], $job['location'], $job['type'], $job['salary_range'], $job['url'], json_encode($job['tags'], JSON_THROW_ON_ERROR), $json, hash('sha256', $sourceId . '|' . $job['external_id'] . '|' . $job['url'])]);
            $staged++;
        }
        return ['source' => $sourceId, 'staged' => $staged, 'http_code' => $httpCode, 'error' => null];
    }

    public static function fetchArbeitnow(string $batchId): array
    {
        return self::fetch($batchId, 'src_arbeitnow_jobs', 'https://www.arbeitnow.com/api/job-board-api', static function (array $job): ?array {
            $tags = array_values(array_filter(array_map('strval', (array)($job['tags'] ?? []))));
            $title = trim((string)($job['title'] ?? ''));
            $technical = preg_match('/developer|engineer|software|data|devops|cloud|security|qa|test|program|frontend|backend|full.?stack|machine learning|ai/i', $title . ' ' . implode(' ', $tags)) === 1;
            return ['external_id' => (string)($job['slug'] ?? ''), 'title' => $title, 'company_name' => trim((string)($job['company_name'] ?? '')), 'location' => trim((string)($job['location'] ?? 'Remote')) ?: 'Remote', 'type' => !empty($job['remote']) ? 'Full Time' : 'Full Time', 'salary_range' => null, 'url' => (string)($job['url'] ?? ''), 'tags' => $tags, 'is_technical' => $technical];
        });
    }

    public static function fetchRemoteOK(string $batchId): array
    {
        return self::fetch($batchId, 'src_remoteok_jobs', 'https://remoteok.com/api', static function (array $job): ?array {
            if (!isset($job['position'], $job['company'])) return null;
            $tags = array_values(array_filter(array_map('strval', (array)($job['tags'] ?? []))));
            $title = trim((string)$job['position']);
            $technical = preg_match('/developer|engineer|software|data|devops|cloud|security|qa|test|program|frontend|backend|full.?stack|machine learning|ai/i', $title . ' ' . implode(' ', $tags)) === 1;
            $salary = isset($job['salary_min'], $job['salary_max']) && ((float)$job['salary_min'] > 0 || (float)$job['salary_max'] > 0) ? '$' . number_format((float)$job['salary_min']) . ' - $' . number_format((float)$job['salary_max']) : null;
            return ['external_id' => (string)($job['id'] ?? ''), 'title' => $title, 'company_name' => trim((string)$job['company']), 'location' => trim((string)($job['location'] ?? 'Remote')) ?: 'Remote', 'type' => 'Full Time', 'salary_range' => $salary, 'url' => (string)($job['url'] ?? $job['apply_url'] ?? ''), 'tags' => $tags, 'is_technical' => $technical];
        });
    }
}
