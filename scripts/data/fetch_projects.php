<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/database.php';

final class ProjectsFetcher
{
    public static function fetchToStaging(string $batchId): array
    {
        $path = __DIR__ . '/imports/projects.json';
        if (!is_file($path)) return ['staged' => 0, 'status' => 'manual_import_required'];
        $records = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO staging_projects (batch_id, source_id, skill, title, description, deliverables, tech_stack, difficulty, repo_template_url, estimated_hours, validation_status, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)");
        $staged = 0;
        foreach ((array)$records as $record) {
            if (!is_array($record)) continue;
            $json = json_encode($record, JSON_THROW_ON_ERROR);
            $stmt->execute([$batchId, $record['source_id'] ?? 'src_manual_learning', $record['skill'] ?? '', $record['title'] ?? '', $record['description'] ?? '', json_encode($record['deliverables'] ?? [], JSON_THROW_ON_ERROR), json_encode($record['tech_stack'] ?? [], JSON_THROW_ON_ERROR), $record['difficulty'] ?? 'intermediate', $record['repo_template_url'] ?? null, $record['estimated_hours'] ?? 0, hash('sha256', $json)]);
            $staged++;
        }
        return ['staged' => $staged, 'status' => 'staged'];
    }
}
