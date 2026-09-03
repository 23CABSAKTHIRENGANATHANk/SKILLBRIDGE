<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/ProofOfSkillService.php';

/**
 * ProofOfWorkService
 * Enterprise Proof-of-Work engine for SkillBridge 2.0.
 * Calculates deterministic repository quality signals, technology detection,
 * commit activity analysis, and explainable evidence scores.
 */
class ProofOfWorkService {

    /**
     * Canonical skill alias mapping dictionary
     */
    private const ALIAS_MAP = [
        'reactjs' => 'React',
        'react.js' => 'React',
        'react' => 'React',
        'typescript' => 'TypeScript',
        'ts' => 'TypeScript',
        'javascript' => 'JavaScript',
        'js' => 'JavaScript',
        'python' => 'Python',
        'py' => 'Python',
        'nodejs' => 'Node.js',
        'node.js' => 'Node.js',
        'node' => 'Node.js',
        'express' => 'Express',
        'expressjs' => 'Express',
        'django' => 'Django',
        'fastapi' => 'FastAPI',
        'flask' => 'Flask',
        'docker' => 'Docker',
        'postgresql' => 'PostgreSQL',
        'postgres' => 'PostgreSQL',
        'pgsql' => 'PostgreSQL',
        'mongodb' => 'MongoDB',
        'mongo' => 'MongoDB',
        'tailwind' => 'Tailwind CSS',
        'tailwindcss' => 'Tailwind CSS',
        'nextjs' => 'Next.js',
        'next.js' => 'Next.js',
        'laravel' => 'Laravel',
        'spring' => 'Spring Boot',
        'springboot' => 'Spring Boot',
        'java' => 'Java',
        'php' => 'PHP',
        'sql' => 'SQL'
    ];

    /**
     * Normalize a detected keyword into a canonical master skill name.
     */
    public static function normalizeSkillName(string $raw): string {
        $clean = strtolower(trim($raw));
        if (isset(self::ALIAS_MAP[$clean])) {
            return self::ALIAS_MAP[$clean];
        }

        // Check against master skills table
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT name FROM skills WHERE normalized_name = ? OR LOWER(name) = ? LIMIT 1');
        $stmt->execute([$clean, $clean]);
        $row = $stmt->fetch();
        if ($row) {
            return $row['name'];
        }

        return ucfirst($raw);
    }

    /**
     * Calculate deterministic repository quality signals.
     * 
     * Formula:
     * overall_evidence_score = round(
     *     0.30 * technology_score +
     *     0.25 * activity_score +
     *     0.25 * complexity_score +
     *     0.20 * documentation_score
     * )
     */
    public static function calculateRepositoryQuality(array $repo, ?array $commits = null, array $detectedTechs = []): array {
        // 1. Technology Score (0-100)
        $techCount = count($detectedTechs);
        if ($techCount >= 4) {
            $techScore = 95;
        } elseif ($techCount === 3) {
            $techScore = 88;
        } elseif ($techCount === 2) {
            $techScore = 75;
        } elseif ($techCount === 1) {
            $techScore = 60;
        } else {
            $techScore = !empty($repo['language']) ? 50 : 25;
        }

        // 2. Activity Score (0-100)
        $pushedAt = !empty($repo['pushed_at']) ? strtotime($repo['pushed_at']) : (!empty($repo['updated_at']) ? strtotime($repo['updated_at']) : time());
        $daysSincePush = max(0, (time() - $pushedAt) / 86400);

        if ($daysSincePush <= 30) {
            $actScore = 90;
        } elseif ($daysSincePush <= 90) {
            $actScore = 78;
        } elseif ($daysSincePush <= 180) {
            $actScore = 65;
        } elseif ($daysSincePush <= 365) {
            $actScore = 50;
        } else {
            $actScore = 35;
        }

        // Commit count adjustment
        $commitCount = is_array($commits) ? count($commits) : (int)($repo['commit_count'] ?? 5);
        if ($commitCount >= 50) {
            $actScore = min(100, $actScore + 10);
        } elseif ($commitCount >= 15) {
            $actScore = min(100, $actScore + 5);
        }

        // 3. Documentation Score (0-100)
        $docScore = 20; // Base score
        $hasDescription = !empty($repo['description']) && strlen(trim((string)$repo['description'])) > 10;
        if ($hasDescription) {
            $docScore += 30;
        }
        $hasReadme = !empty($repo['has_readme']) || !empty($repo['readme_content']);
        if ($hasReadme) {
            $docScore += 35;
        }
        if (!empty($repo['homepage'])) {
            $docScore += 15;
        }
        $docScore = min(100, $docScore);

        // 4. Complexity Score (0-100)
        $compScore = 30;
        $sizeKb = (int)($repo['size'] ?? 100);
        if ($sizeKb > 2000) {
            $compScore += 30;
        } elseif ($sizeKb > 300) {
            $compScore += 20;
        }

        $stars = (int)($repo['stargazers_count'] ?? 0);
        $forks = (int)($repo['forks_count'] ?? 0);
        if ($stars > 5 || $forks > 2) {
            $compScore += 20;
        } elseif ($stars > 0 || $forks > 0) {
            $compScore += 10;
        }

        if ($techCount >= 2) {
            $compScore += 20;
        }
        $compScore = min(100, $compScore);

        // 5. Overall Evidence Score
        $overallScore = (int)round(
            (0.30 * $techScore) +
            (0.25 * $actScore) +
            (0.25 * $compScore) +
            (0.20 * $docScore)
        );

        $proofStrength = 'LOW';
        if ($overallScore >= 75) {
            $proofStrength = 'HIGH';
        } elseif ($overallScore >= 50) {
            $proofStrength = 'MEDIUM';
        }

        $signals = [
            'has_description' => $hasDescription,
            'has_readme' => $hasReadme,
            'is_recent' => ($daysSincePush <= 90),
            'commit_count' => $commitCount,
            'size_kb' => $sizeKb,
            'technologies' => $detectedTechs,
            'proof_strength' => $proofStrength,
            'quality_breakdown' => [
                'technology' => $techScore,
                'activity' => $actScore,
                'complexity' => $compScore,
                'documentation' => $docScore
            ]
        ];

        return [
            'activity_score' => $actScore,
            'technology_score' => $techScore,
            'documentation_score' => $docScore,
            'complexity_score' => $compScore,
            'overall_evidence_score' => $overallScore,
            'proof_strength' => $proofStrength,
            'signals' => $signals
        ];
    }

    /**
     * Detect technologies from dependency manifest files or file paths.
     */
    public static function detectTechnologiesFromManifests(array $files): array {
        $detected = [];

        foreach ($files as $name => $content) {
            $base = strtolower(basename($name));
            $c = is_string($content) ? strtolower($content) : '';

            // 1. package.json
            if ($base === 'package.json') {
                $json = json_decode($content, true) ?: [];
                $deps = array_merge(
                    array_keys($json['dependencies'] ?? []),
                    array_keys($json['devDependencies'] ?? [])
                );
                foreach ($deps as $dep) {
                    $d = strtolower($dep);
                    if (str_contains($d, 'react')) $detected[] = 'React';
                    if (str_contains($d, 'typescript')) $detected[] = 'TypeScript';
                    if (str_contains($d, 'next')) $detected[] = 'Next.js';
                    if (str_contains($d, 'vue')) $detected[] = 'Vue';
                    if (str_contains($d, 'angular')) $detected[] = 'Angular';
                    if (str_contains($d, 'express')) $detected[] = 'Express';
                    if (str_contains($d, 'tailwind')) $detected[] = 'Tailwind CSS';
                    if (str_contains($d, 'pg') || str_contains($d, 'postgres')) $detected[] = 'PostgreSQL';
                    if (str_contains($d, 'mongoose') || str_contains($d, 'mongo')) $detected[] = 'MongoDB';
                }
                $detected[] = 'Node.js';
            }

            // 2. requirements.txt / pyproject.toml
            if ($base === 'requirements.txt' || $base === 'pyproject.toml') {
                $detected[] = 'Python';
                if (str_contains($c, 'django')) $detected[] = 'Django';
                if (str_contains($c, 'fastapi')) $detected[] = 'FastAPI';
                if (str_contains($c, 'flask')) $detected[] = 'Flask';
                if (str_contains($c, 'pandas')) $detected[] = 'Pandas';
                if (str_contains($c, 'psycopg2') || str_contains($c, 'sqlalchemy')) $detected[] = 'PostgreSQL';
                if (str_contains($c, 'torch')) $detected[] = 'PyTorch';
                if (str_contains($c, 'tensorflow')) $detected[] = 'TensorFlow';
            }

            // 3. composer.json
            if ($base === 'composer.json') {
                $detected[] = 'PHP';
                if (str_contains($c, 'laravel')) $detected[] = 'Laravel';
                if (str_contains($c, 'symfony')) $detected[] = 'Symfony';
            }

            // 4. Dockerfile / docker-compose.yml
            if ($base === 'dockerfile' || str_contains($base, 'docker-compose')) {
                $detected[] = 'Docker';
            }

            // 5. Source code extensions
            if (str_ends_with($base, '.tsx') || str_ends_with($base, '.jsx')) {
                $detected[] = 'React';
            }
            if (str_ends_with($base, '.ts')) {
                $detected[] = 'TypeScript';
            }
            if (str_ends_with($base, '.py')) {
                $detected[] = 'Python';
            }
        }

        // Normalize every detected technology
        $normalized = [];
        foreach ($detected as $t) {
            $normalized[] = self::normalizeSkillName($t);
        }

        return array_values(array_unique($normalized));
    }

    /**
     * Persist repository proof analysis to database.
     */
    public static function saveRepositoryProof(string $studentId, array $repoData): array {
        $db = Database::getConnection();

        $repoName = trim((string)($repoData['name'] ?? 'repo_' . bin2hex(random_bytes(4))));
        $repoUrl = trim((string)($repoData['url'] ?? $repoData['html_url'] ?? "https://github.com/candidate/{$repoName}"));
        $primaryLang = $repoData['language'] ?? null;
        $techs = $repoData['technologies'] ?? [];
        if ($primaryLang && !in_array($primaryLang, $techs, true)) {
            $techs[] = self::normalizeSkillName($primaryLang);
        }

        $quality = self::calculateRepositoryQuality($repoData, $repoData['commits'] ?? null, $techs);

        $id = 'pow_' . bin2hex(random_bytes(8));
        $stmt = $db->prepare('
            INSERT INTO proof_of_work_repositories
            (id, student_id, repo_name, repo_url, primary_language, technologies, activity_score, technology_score, documentation_score, complexity_score, overall_evidence_score, signals, commit_count, last_commit_at, analyzed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, repo_name) DO UPDATE SET
                repo_url = EXCLUDED.repo_url,
                primary_language = EXCLUDED.primary_language,
                technologies = EXCLUDED.technologies,
                activity_score = EXCLUDED.activity_score,
                technology_score = EXCLUDED.technology_score,
                documentation_score = EXCLUDED.documentation_score,
                complexity_score = EXCLUDED.complexity_score,
                overall_evidence_score = EXCLUDED.overall_evidence_score,
                signals = EXCLUDED.signals,
                commit_count = EXCLUDED.commit_count,
                analyzed_at = CURRENT_TIMESTAMP
            RETURNING *
        ');

        $stmt->execute([
            $id,
            $studentId,
            $repoName,
            $repoUrl,
            $primaryLang,
            json_encode($techs),
            $quality['activity_score'],
            $quality['technology_score'],
            $quality['documentation_score'],
            $quality['complexity_score'],
            $quality['overall_evidence_score'],
            json_encode($quality['signals']),
            $quality['signals']['commit_count']
        ]);

        // Link with master skills table and record github_evidence in skill_evidence
        $skStmt = $db->query('SELECT id, name, normalized_name FROM skills');
        $allSkills = $skStmt->fetchAll();

        foreach ($techs as $tech) {
            $norm = strtolower($tech);
            foreach ($allSkills as $ms) {
                if (strtolower($ms['name']) === $norm || $ms['normalized_name'] === $norm) {
                    $evId = 'ev_pow_' . bin2hex(random_bytes(6));
                    $evStmt = $db->prepare('
                        INSERT INTO skill_evidence (id, student_id, skill_id, source, confidence, metadata, verified_at)
                        VALUES (?, ?, ?, \'github_evidence\', ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT (student_id, skill_id, source) DO UPDATE SET
                            confidence = GREATEST(skill_evidence.confidence, EXCLUDED.confidence),
                            metadata = EXCLUDED.metadata,
                            verified_at = CURRENT_TIMESTAMP
                    ');
                    $evStmt->execute([
                        $evId,
                        $studentId,
                        $ms['id'],
                        $quality['overall_evidence_score'],
                        json_encode([
                            'repository' => $repoName,
                            'url' => $repoUrl,
                            'proof_strength' => $quality['proof_strength'],
                            'score' => $quality['overall_evidence_score']
                        ])
                    ]);
                    break;
                }
            }
        }

        return [
            'repo_name' => $repoName,
            'repo_url' => $repoUrl,
            'overall_evidence_score' => $quality['overall_evidence_score'],
            'proof_strength' => $quality['proof_strength'],
            'technologies' => $techs,
            'signals' => $quality['signals']
        ];
    }

    /**
     * Get aggregate Proof-of-Work summary for a student.
     */
    public static function getStudentProofOfWorkSummary(string $studentId): array {
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT * FROM proof_of_work_repositories
            WHERE student_id = ?
            ORDER BY overall_evidence_score DESC
        ');
        $stmt->execute([$studentId]);
        $repos = $stmt->fetchAll();

        $totalRepos = count($repos);
        if ($totalRepos === 0) {
            return [
                'has_proof_of_work' => false,
                'total_repositories' => 0,
                'overall_pow_score' => 0,
                'proof_of_work_level' => 'NONE',
                'top_technologies' => [],
                'repositories' => [],
                'signals_summary' => ['No public repositories analyzed yet.']
            ];
        }

        $totalScore = 0;
        $allTechs = [];
        $repoList = [];

        foreach ($repos as $r) {
            $totalScore += (int)$r['overall_evidence_score'];
            $techs = json_decode($r['technologies'] ?? '[]', true) ?: [];
            $allTechs = array_merge($allTechs, $techs);

            $repoList[] = [
                'repo_name' => $r['repo_name'],
                'repo_url' => $r['repo_url'],
                'primary_language' => $r['primary_language'],
                'overall_evidence_score' => (int)$r['overall_evidence_score'],
                'proof_strength' => $r['overall_evidence_score'] >= 75 ? 'HIGH' : ($r['overall_evidence_score'] >= 50 ? 'MEDIUM' : 'LOW'),
                'technologies' => $techs,
                'signals' => json_decode($r['signals'] ?? '{}', true),
                'commit_count' => (int)$r['commit_count'],
                'analyzed_at' => $r['analyzed_at']
            ];
        }

        $avgScore = (int)round($totalScore / $totalRepos);
        $uniqueTechs = array_values(array_unique($allTechs));

        $level = 'LOW';
        if ($avgScore >= 75 && $totalRepos >= 2) {
            $level = 'HIGH';
        } elseif ($avgScore >= 50 || $totalRepos >= 1) {
            $level = 'MEDIUM';
        }

        $signalsSummary = [
            "{$totalRepos} Public Repositories Analyzed",
            count($uniqueTechs) . " Verified Technologies Detected",
            "Proof-of-Work Quality: {$level} ({$avgScore}% composite evidence)"
        ];

        return [
            'has_proof_of_work' => true,
            'total_repositories' => $totalRepos,
            'overall_pow_score' => $avgScore,
            'proof_of_work_level' => $level,
            'top_technologies' => array_slice($uniqueTechs, 0, 8),
            'repositories' => array_slice($repoList, 0, 6),
            'signals_summary' => $signalsSummary
        ];
    }

    /**
     * Batch fetch proof-of-work summaries for multiple candidates (Eliminates N+1 queries)
     */
    public static function batchGetStudentsProofOfWorkSummary(array $studentIds): array {
        if (empty($studentIds)) {
            return [];
        }

        $studentIds = array_values(array_unique(array_filter($studentIds)));
        if (count($studentIds) === 1) {
            return [$studentIds[0] => self::getStudentProofOfWorkSummary($studentIds[0])];
        }

        $db = Database::getConnection();
        $placeholders = implode(',', array_fill(0, count($studentIds), '?'));

        $stmt = $db->prepare("
            SELECT * FROM proof_of_work_repositories
            WHERE student_id IN ({$placeholders})
            ORDER BY overall_evidence_score DESC
        ");
        $stmt->execute($studentIds);
        $reposByStudent = [];
        foreach ($stmt->fetchAll() as $r) {
            $reposByStudent[$r['student_id']][] = $r;
        }

        $summaries = [];
        foreach ($studentIds as $sId) {
            $repos = $reposByStudent[$sId] ?? [];
            $totalRepos = count($repos);
            if ($totalRepos === 0) {
                $summaries[$sId] = [
                    'has_proof_of_work' => false,
                    'total_repositories' => 0,
                    'overall_pow_score' => 0,
                    'proof_of_work_level' => 'NONE',
                    'top_technologies' => [],
                    'repositories' => [],
                    'signals_summary' => ['No public repositories analyzed yet.']
                ];
                continue;
            }

            $totalScore = 0;
            $allTechs = [];
            $repoList = [];

            foreach ($repos as $r) {
                $totalScore += (int)$r['overall_evidence_score'];
                $techs = json_decode($r['technologies'] ?? '[]', true) ?: [];
                $allTechs = array_merge($allTechs, $techs);

                $repoList[] = [
                    'repo_name' => $r['repo_name'],
                    'repo_url' => $r['repo_url'],
                    'primary_language' => $r['primary_language'],
                    'overall_evidence_score' => (int)$r['overall_evidence_score'],
                    'proof_strength' => $r['overall_evidence_score'] >= 75 ? 'HIGH' : ($r['overall_evidence_score'] >= 50 ? 'MEDIUM' : 'LOW'),
                    'technologies' => $techs,
                    'signals' => json_decode($r['signals'] ?? '{}', true),
                    'commit_count' => (int)$r['commit_count'],
                    'analyzed_at' => $r['analyzed_at']
                ];
            }

            $avgScore = (int)round($totalScore / $totalRepos);
            $uniqueTechs = array_values(array_unique($allTechs));

            $level = 'LOW';
            if ($avgScore >= 75 && $totalRepos >= 2) {
                $level = 'HIGH';
            } elseif ($avgScore >= 50 || $totalRepos >= 1) {
                $level = 'MEDIUM';
            }

            $signalsSummary = [
                "{$totalRepos} Public Repositories Analyzed",
                count($uniqueTechs) . " Verified Technologies Detected",
                "Proof-of-Work Quality: {$level} ({$avgScore}% composite evidence)"
            ];

            $summaries[$sId] = [
                'has_proof_of_work' => true,
                'total_repositories' => $totalRepos,
                'overall_pow_score' => $avgScore,
                'proof_of_work_level' => $level,
                'top_technologies' => array_slice($uniqueTechs, 0, 8),
                'repositories' => array_slice($repoList, 0, 6),
                'signals_summary' => $signalsSummary
            ];
        }

        return $summaries;
    }
}
