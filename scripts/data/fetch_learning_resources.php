<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/database.php';

final class LearningResourcesFetcher
{
    public static function fetchToStaging(string $batchId): array
    {
        $path = __DIR__ . '/imports/learning_resources.json';
        if (!is_file($path)) return ['staged' => 0, 'status' => 'manual_import_required'];
        $records = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO staging_learning_resources (batch_id, source_id, skill, title, provider, resource_type, level, url, duration, is_free, relevance_reason, raw_payload, validation_status, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)");
        $staged = 0;
        foreach ((array)$records as $record) {
            if (!is_array($record)) continue;
            $json = json_encode($record, JSON_THROW_ON_ERROR);
            $stmt->execute([$batchId, $record['source_id'] ?? 'src_manual_learning', $record['skill'] ?? '', $record['title'] ?? '', $record['provider'] ?? '', $record['resource_type'] ?? '', $record['level'] ?? 'beginner', $record['url'] ?? '', $record['duration'] ?? null, $record['is_free'] ?? false, $record['summary'] ?? null, $json, hash('sha256', $json)]);
            $staged++;
        }
        return ['staged' => $staged, 'status' => 'staged'];
    }
}
