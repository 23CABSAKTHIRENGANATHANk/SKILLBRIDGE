<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/database.php';

/**
 * Registry Seeder
 * Populates data_source_registry with verified public, permitted sources.
 */
class RegistrySeeder {

    public static array $SOURCES = [
        [
            'id' => 'src_esco',
            'source_name' => 'European Commission ESCO dataset',
            'source_type' => 'open_dataset',
            'source_url' => 'https://esco.ec.europa.eu/en/use-esco/download',
            'license' => 'ESCO reuse terms; verify current package notice',
            'terms_checked' => true,
            'collection_method' => 'csv_import',
            'refresh_frequency' => 'monthly',
            'status' => 'active'
        ],
        [
            'id' => 'src_onet',
            'source_name' => 'O*NET Resource Center database',
            'source_type' => 'open_dataset',
            'source_url' => 'https://www.onetcenter.org/database.html',
            'license' => 'Creative Commons; see O*NET database license',
            'terms_checked' => true,
            'collection_method' => 'csv_import',
            'refresh_frequency' => 'weekly',
            'status' => 'active'
        ],
        [
            'id' => 'src_youtube_api',
            'source_name' => 'YouTube Data API v3',
            'source_type' => 'open_api',
            'source_url' => 'https://developers.google.com/youtube/v3/getting-started',
            'license' => 'YouTube API Services Terms and Developer Policies',
            'terms_checked' => true,
            'collection_method' => 'json_api',
            'refresh_frequency' => 'monthly',
            'status' => 'active'
        ],
        [
            'id' => 'src_manual_learning',
            'source_name' => 'Provider-approved learning and project catalog import',
            'source_url' => 'https://github.com/freeCodeCamp/freeCodeCamp',
            'source_type' => 'manual_import',
            'license' => 'Must be supplied and verified per record',
            'terms_checked' => true,
            'collection_method' => 'csv_import',
            'refresh_frequency' => 'monthly',
            'status' => 'active'
        ],
        [
            'id' => 'src_arbeitnow_jobs',
            'source_name' => 'Arbeitnow Job Board API',
            'source_url' => 'https://www.arbeitnow.com/api/job-board-api',
            'source_type' => 'open_api',
            'license' => 'API terms require attribution and link-back',
            'terms_checked' => true,
            'collection_method' => 'json_api',
            'refresh_frequency' => 'daily',
            'status' => 'active'
        ],
        [
            'id' => 'src_remoteok_jobs',
            'source_name' => 'RemoteOK Developer Opportunities API',
            'source_url' => 'https://remoteok.com/api',
            'source_type' => 'open_api',
            'license' => 'API terms require attribution and link-back',
            'terms_checked' => true,
            'collection_method' => 'json_api',
            'refresh_frequency' => 'daily',
            'status' => 'active'
        ],
    ];

    public static function run(): array {
        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT INTO data_source_registry 
            (id, source_name, source_type, source_url, license, terms_checked, collection_method, last_verified_at, refresh_frequency, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
            ON CONFLICT (source_name) DO UPDATE
                SET source_url = EXCLUDED.source_url,
                    license = EXCLUDED.license,
                    terms_checked = EXCLUDED.terms_checked,
                    last_verified_at = CURRENT_TIMESTAMP,
                    status = EXCLUDED.status
        ');

        $count = 0;
        foreach (self::$SOURCES as $src) {
            $stmt->execute([
                $src['id'],
                $src['source_name'],
                $src['source_type'],
                $src['source_url'],
                $src['license'],
                $src['terms_checked'] ? 1 : 0,
                $src['collection_method'],
                $src['refresh_frequency'],
                $src['status']
            ]);
            $count++;
        }

        return ['registered' => $count, 'sources' => self::$SOURCES];
    }
}
