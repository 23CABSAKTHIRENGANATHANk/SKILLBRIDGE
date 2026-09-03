<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/database.php';

/**
 * Fetch & Normalize Career & Skills Taxonomies
 * Sourced from ESCO & O*NET Open Standards, mapped to SkillBridge database.
 */
class TaxonomyIngestor {

    public static function stage(string $batchId): array {
        $db = Database::getConnection();
        $sourceId = 'src_onet';
        $path = __DIR__ . '/imports/taxonomy.json';
        if (!is_file($path)) {
            return ['skills_processed' => 0, 'dependencies_processed' => 0, 'status' => 'manual_import_required'];
        }

        $payload = json_decode((string)file_get_contents($path), true);
        if (!is_array($payload)) {
            throw new RuntimeException('taxonomy.json must contain a JSON object');
        }

        $batch = $db->prepare('SELECT 1 FROM data_import_batches WHERE id = ? AND source_id = ?');
        $batch->execute([$batchId, $sourceId]);
        if (!$batch->fetchColumn()) {
            throw new RuntimeException('Taxonomy batch is not registered for the configured source');
        }

        $stmt = $db->prepare('INSERT INTO staging_taxonomy_records (batch_id, source_id, taxonomy_type, external_id, name, summary, category, raw_payload, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING');
        $skills = 0;
        foreach ((array)($payload['skills'] ?? []) as $record) {
            if (!is_array($record) || empty($record['id']) || empty($record['name'])) continue;
            $stmt->execute([$batchId, $sourceId, 'skill', (string)$record['id'], trim((string)$record['name']), $record['summary'] ?? null, $record['category'] ?? null, json_encode($record, JSON_THROW_ON_ERROR), hash('sha256', json_encode($record, JSON_THROW_ON_ERROR))]);
            $skills++;
        }
        $careers = 0;
        foreach ((array)($payload['careers'] ?? []) as $record) {
            if (!is_array($record) || empty($record['id']) || empty($record['name'])) continue;
            $stmt->execute([$batchId, $sourceId, 'career', (string)$record['id'], trim((string)$record['name']), $record['summary'] ?? null, $record['category'] ?? null, json_encode($record, JSON_THROW_ON_ERROR), hash('sha256', json_encode($record, JSON_THROW_ON_ERROR))]);
            $careers++;
        }
        return ['skills_processed' => $skills, 'careers_processed' => $careers, 'dependencies_processed' => 0, 'status' => 'staged'];
    }
}
