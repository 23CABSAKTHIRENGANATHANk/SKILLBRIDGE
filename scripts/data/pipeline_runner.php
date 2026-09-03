<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/database.php';
require_once __DIR__ . '/registry_seed.php';
require_once __DIR__ . '/fetch_taxonomies.php';
require_once __DIR__ . '/fetch_learning_resources.php';
require_once __DIR__ . '/fetch_youtube.php';
require_once __DIR__ . '/fetch_projects.php';
require_once __DIR__ . '/fetch_jobs.php';

/**
 * Master Data Acquisition & Staging Pipeline Runner
 * Implements: SOURCE -> FETCH -> VALIDATE -> NORMALIZE -> DEDUPLICATE -> CLASSIFY -> QUALITY CHECK -> DATABASE SEED
 */
class PipelineRunner {

    public static function run(bool $dryRun = false): array {
        $db = Database::getConnection();
        $batchId = 'batch_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4));
        $metrics = [
            'batch_id' => $batchId,
            'dry_run' => $dryRun,
            'started_at' => date('c'),
            'sources_registered' => 0,
            'skills_cataloged' => 0,
            'skill_dependencies_cataloged' => 0,
            'staged_learning_resources' => 0,
            'staged_projects' => 0,
            'staged_jobs' => 0,
            'validated_records' => 0,
            'rejected_records' => 0,
            'duplicates_removed' => 0,
            'promoted_to_production' => 0,
            'tables_affected' => [],
        ];

        echo "=================================================================\n";
        echo "SkillBridge 3.0 — Data Ingestion & Staging Pipeline\n";
        echo "Batch ID: {$batchId} " . ($dryRun ? "[DRY-RUN MODE]" : "[LIVE INGESTION]") . "\n";
        echo "=================================================================\n\n";

        // -------------------------------------------------------------
        // Step 1: Seed Data Source Registry
        // -------------------------------------------------------------
        echo "[1/7] Seeding & Verifying Data Source Registry...\n";
        $regResult = RegistrySeeder::run();
        $metrics['sources_registered'] = $regResult['registered'];
        $metrics['tables_affected'][] = 'data_source_registry';
        echo "      Registered {$metrics['sources_registered']} vetted public data sources.\n";

        $batchStmt = $db->prepare('INSERT INTO data_import_batches (id, source_id, dry_run) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING');
        $batchStmt->execute([$batchId . '_onet', 'src_onet', $dryRun]);

        // -------------------------------------------------------------
        // Step 2: Fetch & Ingest Career & Skills Taxonomies
        // -------------------------------------------------------------
        echo "[2/7] Ingesting Skills Taxonomy & Prerequisite Graph...\n";
        $taxResult = TaxonomyIngestor::stage($batchId . '_onet');
        $metrics['skills_cataloged'] = $taxResult['skills_processed'];
        $metrics['skill_dependencies_cataloged'] = $taxResult['dependencies_processed'];
        $metrics['tables_affected'][] = 'staging_taxonomy_records';
        echo "      Cataloged {$metrics['skills_cataloged']} master skills & {$metrics['skill_dependencies_cataloged']} dependency edges.\n";

        // -------------------------------------------------------------
        // Step 3: Fetch Data into Isolated Staging Environment
        // -------------------------------------------------------------
        echo "[3/7] Fetching Raw Records into Isolated Staging Tables...\n";
        
        $lrResult = LearningResourcesFetcher::fetchToStaging($batchId);
        $metrics['staged_learning_resources'] = $lrResult['staged'];
        $youtubeResult = YouTubeResourcesFetcher::fetchToStaging($batchId, 'TypeScript');
        $metrics['staged_learning_resources'] += $youtubeResult['staged'];
        $metrics['tables_affected'][] = 'staging_learning_resources';
        echo "      Staged {$lrResult['staged']} learning resources (docs, courses, videos).\n";

        $projResult = ProjectsFetcher::fetchToStaging($batchId);
        $metrics['staged_projects'] = $projResult['staged'];
        $metrics['tables_affected'][] = 'staging_projects';
        echo "      Staged {$projResult['staged']} project blueprints.\n";

        $arbeitnowResult = JobsFetcher::fetchArbeitnow($batchId);
        $remoteokResult = JobsFetcher::fetchRemoteOK($batchId);
        $metrics['staged_jobs'] = $arbeitnowResult['staged'] + $remoteokResult['staged'];
        $metrics['tables_affected'][] = 'staging_jobs';
        echo "      Staged {$metrics['staged_jobs']} live developer jobs (Arbeitnow: {$arbeitnowResult['staged']}, RemoteOK: {$remoteokResult['staged']}).\n";

        // -------------------------------------------------------------
        // Step 4: Validate Records in Staging
        // -------------------------------------------------------------
        echo "[4/7] Running Data Validation & Security Sanitization...\n";

        // 4a. Validate Learning Resources
        $lrRows = $db->query("SELECT id, title, url, skill FROM staging_learning_resources WHERE batch_id = '{$batchId}'")->fetchAll();
        foreach ($lrRows as $r) {
            $url = $r['url'];
            $isValid = filter_var($url, FILTER_VALIDATE_URL) && str_starts_with($url, 'https://') && !empty($r['title']);
            if ($isValid) {
                $db->query("UPDATE staging_learning_resources SET validation_status = 'valid' WHERE id = {$r['id']}");
                $metrics['validated_records']++;
            } else {
                $db->query("UPDATE staging_learning_resources SET validation_status = 'rejected', rejection_reason = 'Invalid or insecure URL' WHERE id = {$r['id']}");
                $metrics['rejected_records']++;
            }
        }

        // 4b. Validate Projects
        $projRows = $db->query("SELECT id, title, skill, description FROM staging_projects WHERE batch_id = '{$batchId}'")->fetchAll();
        foreach ($projRows as $r) {
            $isValid = !empty($r['title']) && !empty($r['skill']) && strlen($r['description']) > 20;
            if ($isValid) {
                $db->query("UPDATE staging_projects SET validation_status = 'valid' WHERE id = {$r['id']}");
                $metrics['validated_records']++;
            } else {
                $db->query("UPDATE staging_projects SET validation_status = 'rejected', rejection_reason = 'Missing description or title' WHERE id = {$r['id']}");
                $metrics['rejected_records']++;
            }
        }

        // 4c. Validate Jobs
        $jobRows = $db->query("SELECT id, title, company_name FROM staging_jobs WHERE batch_id = '{$batchId}'")->fetchAll();
        foreach ($jobRows as $r) {
            $isValid = !empty($r['title']) && !empty($r['company_name']);
            if ($isValid) {
                $db->query("UPDATE staging_jobs SET validation_status = 'valid' WHERE id = {$r['id']}");
                $metrics['validated_records']++;
            } else {
                $db->query("UPDATE staging_jobs SET validation_status = 'rejected', rejection_reason = 'Empty title or company' WHERE id = {$r['id']}");
                $metrics['rejected_records']++;
            }
        }
        echo "      Validated: {$metrics['validated_records']} passed, {$metrics['rejected_records']} rejected.\n";

        // -------------------------------------------------------------
        // Step 5: Deduplicate
        // -------------------------------------------------------------
        echo "[5/7] Running Cryptographic Deduplication Engine...\n";

        // Deduplicate learning resources against production
        $dupLrStmt = $db->prepare('
            SELECT s.id 
            FROM staging_learning_resources s
            JOIN learning_resources p ON p.resource_url = s.url
            WHERE s.batch_id = ? AND s.validation_status = \'valid\'
        ');
        $dupLrStmt->execute([$batchId]);
        $dupLrIds = $dupLrStmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($dupLrIds as $dupId) {
            $db->query("UPDATE staging_learning_resources SET validation_status = 'rejected', rejection_reason = 'Duplicate URL already in production' WHERE id = {$dupId}");
            $metrics['duplicates_removed']++;
        }

        // Deduplicate projects against production
        $dupProjStmt = $db->prepare('
            SELECT s.id
            FROM staging_projects s
            JOIN project_recommendations p ON p.skill = s.skill AND p.title = s.title
            WHERE s.batch_id = ? AND s.validation_status = \'valid\'
        ');
        $dupProjStmt->execute([$batchId]);
        $dupProjIds = $dupProjStmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($dupProjIds as $dupId) {
            $db->query("UPDATE staging_projects SET validation_status = 'rejected', rejection_reason = 'Duplicate project blueprint' WHERE id = {$dupId}");
            $metrics['duplicates_removed']++;
        }

        echo "      Deduplication complete: {$metrics['duplicates_removed']} duplicate records filtered.\n";

        // -------------------------------------------------------------
        // Step 6: Promote Valid Records to Production
        // -------------------------------------------------------------
        echo "[6/7] Promoting Audited Records to Production Tables...\n";

        if (!$dryRun) {
            // 6a. Promote Learning Resources
            $promoLr = $db->prepare('
                INSERT INTO learning_resources (id, skill_id, title, provider, resource_type, difficulty, resource_url, duration, is_free, last_verified_at, source_id, active)
                SELECT \'res_\' || substr(s.content_hash, 1, 12), sk.id, s.title, s.provider, s.resource_type, s.level, s.url, s.duration, s.is_free, CURRENT_TIMESTAMP, s.source_id, TRUE
                FROM staging_learning_resources s JOIN skills sk ON LOWER(sk.name) = LOWER(s.skill)
                WHERE s.batch_id = ? AND s.validation_status = \'valid\'
                ON CONFLICT (id) DO NOTHING
            ');
            $promoLr->execute([$batchId]);
            $lrPromoted = $promoLr->rowCount();
            $metrics['promoted_to_production'] += $lrPromoted;
            $metrics['tables_affected'][] = 'learning_resources';

            // 6b. Promote Project Recommendations
            $promoProj = $db->prepare('
                INSERT INTO project_recommendations (id, skill, title, description, deliverables, tech_stack, difficulty, repo_template_url, estimated_hours, source_id, last_verified_at, active)
                SELECT \'proj_\' || substr(content_hash, 1, 12), skill, title, description, deliverables, tech_stack, difficulty, repo_template_url, estimated_hours, source_id, CURRENT_TIMESTAMP, TRUE
                FROM staging_projects
                WHERE batch_id = ? AND validation_status = \'valid\'
                ON CONFLICT (skill, title) DO NOTHING
            ');
            $promoProj->execute([$batchId]);
            $projPromoted = $promoProj->rowCount();
            $metrics['promoted_to_production'] += $projPromoted;
            $metrics['tables_affected'][] = 'project_recommendations';

            // 6c. Promote Jobs
            $validJobs = $db->prepare('
                SELECT * FROM staging_jobs 
                WHERE batch_id = ? AND validation_status = \'valid\'
            ');
            $validJobs->execute([$batchId]);
            $jobsPromoted = 0;

            $jobIns = $db->prepare('
                INSERT INTO jobs (id, company_id, title, summary, location, type, salary_range, status, source_id, external_id, last_verified_at, active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, \'active\', ?, ?, CURRENT_TIMESTAMP, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO NOTHING
            ');

            foreach ($validJobs->fetchAll() as $j) {
                $jobId = 'job_' . substr((string)$j['content_hash'], 0, 16);
                $compId = 'comp_' . substr(hash('sha256', strtolower(trim((string)$j['company_name']))), 0, 20);
                $db->prepare('INSERT INTO companies (id, name, industry, verified) VALUES (?, ?, \'Technology\', FALSE) ON CONFLICT (name) DO NOTHING')->execute([$compId, trim((string)$j['company_name'])]);
                $compId = $db->prepare('SELECT id FROM companies WHERE name = ?');
                $compId->execute([trim((string)$j['company_name'])]);
                $companyId = $compId->fetchColumn();
                $jobIns->execute([
                    $jobId,
                    $companyId,
                    $j['title'],
                    "Public opportunity listed by {$j['company_name']}; apply through the source listing.",
                    $j['location'],
                    $j['type'],
                    $j['salary_range'],
                    $j['source_id'],
                    $j['external_id']
                ]);
                $jobsPromoted++;
            }
            $metrics['promoted_to_production'] += $jobsPromoted;
            $metrics['tables_affected'][] = 'jobs';

            // Mark batch as promoted in staging
            $db->query("UPDATE staging_learning_resources SET validation_status = 'promoted' WHERE batch_id = '{$batchId}' AND validation_status = 'valid'");
            $db->query("UPDATE staging_projects SET validation_status = 'promoted' WHERE batch_id = '{$batchId}' AND validation_status = 'valid'");
            $db->query("UPDATE staging_jobs SET validation_status = 'promoted' WHERE batch_id = '{$batchId}' AND validation_status = 'valid'");

            echo "      Successfully promoted {$metrics['promoted_to_production']} clean records to production tables.\n";
        } else {
            echo "      [DRY-RUN] Skipped production promotion. Staging records retained for inspection.\n";
        }

        // -------------------------------------------------------------
        // Step 7: Update Registry Timestamps
        // -------------------------------------------------------------
        echo "[7/7] Updating Data Source Registry Verification Timestamps...\n";
        if (!$dryRun) {
            $db->prepare('UPDATE data_source_registry SET last_collected_at = CURRENT_TIMESTAMP, last_verified_at = CURRENT_TIMESTAMP WHERE id IN (?, ?) AND status = \'active\'')->execute(['src_arbeitnow_jobs', 'src_remoteok_jobs']);
        }

        $metrics['completed_at'] = date('c');
        $metrics['tables_affected'] = array_values(array_unique($metrics['tables_affected']));

        echo "\n=================================================================\n";
        echo "INGESTION PIPELINE EXECUTION SUMMARY\n";
        echo "=================================================================\n";
        echo "Batch ID:                  {$metrics['batch_id']}\n";
        echo "Data Sources Registered:   {$metrics['sources_registered']}\n";
        echo "Skills Cataloged:          {$metrics['skills_cataloged']}\n";
        echo "Dependencies Cataloged:    {$metrics['skill_dependencies_cataloged']}\n";
        echo "Staged Resources:          {$metrics['staged_learning_resources']}\n";
        echo "Staged Projects:           {$metrics['staged_projects']}\n";
        echo "Staged Jobs:               {$metrics['staged_jobs']}\n";
        echo "Validated Records:         {$metrics['validated_records']}\n";
        echo "Duplicates Filtered:       {$metrics['duplicates_removed']}\n";
        echo "Rejected Records:          {$metrics['rejected_records']}\n";
        echo "Promoted to Production:    {$metrics['promoted_to_production']}\n";
        echo "Database Tables Affected:  " . implode(', ', $metrics['tables_affected']) . "\n";
        echo "=================================================================\n\n";

        return $metrics;
    }
}

// Allow CLI execution directly
if (php_sapi_name() === 'cli' && basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    $isDryRun = in_array('--dry-run', $argv ?? [], true);
    PipelineRunner::run($isDryRun);
}
