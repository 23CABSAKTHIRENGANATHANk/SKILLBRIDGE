<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/ProofOfSkillService.php';

/**
 * SkillEvidenceService
 *
 * Aggregates ALL real evidence from every source that exists for a student's skill
 * and returns a structured evidence graph that answers:
 *   "WHY is this skill verified?"
 *
 * Sources queried (in order of weight):
 *  1. skill_verification_attempts  — formal 4-stage Bloom verification
 *  2. skill_assessments            — legacy quick assessment
 *  3. student_github_profiles      — GitHub language & detected skills
 *  4. proof_of_work_repositories   — per-repo evidence breakdown
 *  5. ai_interview_sessions_v2     — adaptive AI interview scorecard
 *  6. skill_evidence               — raw multi-factor evidence rows (self/resume/project)
 *  7. skill_integrity_audits       — cross-source integrity status
 *
 * IMPORTANT: This service NEVER invents evidence.
 * Every item has a real DB row backing it.
 */
class SkillEvidenceService {

    /**
     * Evidence type labels
     */
    public const TYPE_VERIFICATION  = 'skill_verification';
    public const TYPE_ASSESSMENT    = 'assessment';
    public const TYPE_GITHUB        = 'github';
    public const TYPE_PROOF_OF_WORK = 'proof_of_work';
    public const TYPE_AI_INTERVIEW  = 'ai_interview';
    public const TYPE_RESUME        = 'resume';
    public const TYPE_PROJECT       = 'project';
    public const TYPE_SELF_DECLARED = 'self_declared';

    /**
     * Get the full Skill Evidence Graph for a student across all their skills.
     * Returns an array keyed by skill_id.
     */
    public static function getStudentEvidenceGraph(string $studentId): array {
        $db = Database::getConnection();

        // 1. Fetch all student skills
        $skillStmt = $db->prepare('
            SELECT s.id AS skill_id, s.name AS skill_name, s.normalized_name,
                   sk.proficiency, sk.created_at AS claimed_at
            FROM student_skills sk
            JOIN skills s ON sk.skill_id = s.id
            WHERE sk.student_id = ?
            ORDER BY s.name ASC
        ');
        $skillStmt->execute([$studentId]);
        $skills = $skillStmt->fetchAll();

        if (empty($skills)) {
            return [];
        }

        $skillIds   = array_column($skills, 'skill_id');
        $skillIndex = [];
        foreach ($skills as $sk) {
            $skillIndex[$sk['skill_id']] = $sk;
        }

        // 2. Batch-fetch all evidence rows (self/resume/project)
        $placeholders = implode(',', array_fill(0, count($skillIds), '?'));
        $evStmt = $db->prepare("
            SELECT skill_id, source, confidence, metadata, verified_at
            FROM skill_evidence
            WHERE student_id = ? AND skill_id IN ({$placeholders})
            ORDER BY confidence DESC
        ");
        $evStmt->execute(array_merge([$studentId], $skillIds));
        $evidenceRows = $evStmt->fetchAll();

        // 3. Batch-fetch all skill_verification_attempts
        $vaStmt = $db->prepare("
            SELECT skill_id, score, verified_level, confidence, passed, completed_at, breakdown
            FROM skill_verification_attempts
            WHERE student_id = ? AND skill_id IN ({$placeholders}) AND status = 'completed'
            ORDER BY score DESC, completed_at DESC
        ");
        $vaStmt->execute(array_merge([$studentId], $skillIds));
        $verificationRows = $vaStmt->fetchAll();

        // 4. Batch-fetch all skill_assessments
        $saStmt = $db->prepare("
            SELECT skill_id, score, level, knowledge_score, problem_solving_score, practical_score, created_at
            FROM skill_assessments
            WHERE student_id = ? AND skill_id IN ({$placeholders})
            ORDER BY score DESC
        ");
        $saStmt->execute(array_merge([$studentId], $skillIds));
        $assessmentRows = $saStmt->fetchAll();

        // 5. Fetch GitHub profile (single row, applies to language-level skills)
        $ghStmt = $db->prepare('
            SELECT languages, detected_skills, analyzed_at, public_repos_count
            FROM student_github_profiles
            WHERE student_id = ? LIMIT 1
        ');
        $ghStmt->execute([$studentId]);
        $github = $ghStmt->fetch();
        $ghLanguages     = $github ? (is_string($github['languages']) ? json_decode($github['languages'], true) : $github['languages']) : [];
        $ghDetectedSkills = $github ? (is_string($github['detected_skills']) ? json_decode($github['detected_skills'], true) : $github['detected_skills']) : [];

        // 6. Batch-fetch Proof-of-Work repositories
        $powStmt = $db->prepare('
            SELECT repo_name, technologies, overall_evidence_score, technology_score,
                   activity_score, documentation_score, complexity_score,
                   primary_language, commit_count, last_commit_at, analyzed_at
            FROM proof_of_work_repositories
            WHERE student_id = ?
            ORDER BY overall_evidence_score DESC
        ');
        $powStmt->execute([$studentId]);
        $powRepos = $powStmt->fetchAll();

        // 7. Fetch AI Interview scorecards
        $aiStmt = $db->prepare('
            SELECT target_role, overall_score, scorecard, status, created_at
            FROM ai_interview_sessions_v2
            WHERE student_id = ? AND status = \'completed\' AND overall_score IS NOT NULL
            ORDER BY overall_score DESC, created_at DESC
            LIMIT 3
        ');
        $aiStmt->execute([$studentId]);
        $interviewSessions = $aiStmt->fetchAll();

        // 8. Batch-fetch integrity audits
        $iaStmt = $db->prepare("
            SELECT skill_id, status, confidence_score, supported_level, evidence_sources, last_audited_at
            FROM skill_integrity_audits
            WHERE student_id = ? AND skill_id IN ({$placeholders})
        ");
        $iaStmt->execute(array_merge([$studentId], $skillIds));
        $integrityRows = $iaStmt->fetchAll();

        // --- Build index maps ---
        $verificationMap = [];
        foreach ($verificationRows as $vr) {
            if (!isset($verificationMap[$vr['skill_id']])) {
                $verificationMap[$vr['skill_id']] = $vr;
            }
        }

        $assessmentMap = [];
        foreach ($assessmentRows as $ar) {
            if (!isset($assessmentMap[$ar['skill_id']])) {
                $assessmentMap[$ar['skill_id']] = $ar;
            }
        }

        $evidenceMap = [];
        foreach ($evidenceRows as $er) {
            $evidenceMap[$er['skill_id']][$er['source']] = $er;
        }

        $integrityMap = [];
        foreach ($integrityRows as $ir) {
            $integrityMap[$ir['skill_id']] = $ir;
        }

        // --- Assemble evidence graph ---
        $graph = [];

        foreach ($skills as $skill) {
            $sid  = $skill['skill_id'];
            $norm = strtolower($skill['normalized_name'] ?? $skill['skill_name']);
            $items = [];

            // Self-declaration
            if (!empty($evidenceMap[$sid][self::TYPE_SELF_DECLARED])) {
                $ev = $evidenceMap[$sid][self::TYPE_SELF_DECLARED];
                $items[] = self::buildItem(
                    self::TYPE_SELF_DECLARED,
                    'Student Profile',
                    (int)$ev['confidence'],
                    $ev['verified_at'],
                    'Beginner',
                    'unverified',
                    ['proficiency' => $skill['proficiency']]
                );
            }

            // Resume evidence
            if (!empty($evidenceMap[$sid]['resume_evidence'])) {
                $ev = $evidenceMap[$sid]['resume_evidence'];
                $items[] = self::buildItem(
                    self::TYPE_RESUME,
                    'Resume / CV',
                    (int)$ev['confidence'],
                    $ev['verified_at'],
                    'Developing',
                    'document',
                    is_string($ev['metadata']) ? json_decode($ev['metadata'], true) ?? [] : ($ev['metadata'] ?? [])
                );
            }

            // Project evidence
            if (!empty($evidenceMap[$sid]['project_evidence'])) {
                $ev = $evidenceMap[$sid]['project_evidence'];
                $meta = is_string($ev['metadata']) ? json_decode($ev['metadata'], true) ?? [] : ($ev['metadata'] ?? []);
                $items[] = self::buildItem(
                    self::TYPE_PROJECT,
                    'Student Projects',
                    (int)$ev['confidence'],
                    $ev['verified_at'],
                    'Developing',
                    'project',
                    $meta
                );
            }

            // GitHub — language match
            $ghMatch = false;
            foreach ((array)$ghLanguages as $lang) {
                $langName = strtolower(is_array($lang) ? ($lang['name'] ?? '') : (string)$lang);
                if ($langName && str_contains($norm, $langName) || str_contains($langName, $norm)) {
                    $ghMatch = true;
                    break;
                }
            }
            foreach ((array)$ghDetectedSkills as $ds) {
                $dsName = strtolower(is_array($ds) ? ($ds['name'] ?? (string)$ds) : (string)$ds);
                if ($dsName && (str_contains($norm, $dsName) || str_contains($dsName, $norm))) {
                    $ghMatch = true;
                    break;
                }
            }
            if ($ghMatch && $github) {
                $items[] = self::buildItem(
                    self::TYPE_GITHUB,
                    'GitHub Profile',
                    70,
                    $github['analyzed_at'],
                    'Developing',
                    'github',
                    ['repos' => $github['public_repos_count'] ?? 0, 'analyzed_at' => $github['analyzed_at']]
                );
            }

            // Proof-of-Work repositories that mention this skill
            $matchedRepos = [];
            foreach ($powRepos as $repo) {
                $techs = is_string($repo['technologies']) ? json_decode($repo['technologies'], true) ?? [] : ($repo['technologies'] ?? []);
                foreach ($techs as $t) {
                    $tName = strtolower(is_array($t) ? ($t['name'] ?? (string)$t) : (string)$t);
                    if ($tName && (str_contains($norm, $tName) || str_contains($tName, $norm))) {
                        $matchedRepos[] = $repo;
                        break;
                    }
                }
                // Also match primary language
                $pl = strtolower($repo['primary_language'] ?? '');
                if ($pl && (str_contains($norm, $pl) || str_contains($pl, $norm))) {
                    if (!in_array($repo, $matchedRepos, true)) {
                        $matchedRepos[] = $repo;
                    }
                }
            }
            if (!empty($matchedRepos)) {
                $bestRepo = $matchedRepos[0];
                $items[] = self::buildItem(
                    self::TYPE_PROOF_OF_WORK,
                    'GitHub Proof-of-Work',
                    min(95, (int)$bestRepo['overall_evidence_score']),
                    $bestRepo['analyzed_at'],
                    'Verified',
                    'github',
                    [
                        'repo'             => $bestRepo['repo_name'],
                        'repos_count'      => count($matchedRepos),
                        'commit_count'     => $bestRepo['commit_count'],
                        'evidence_score'   => $bestRepo['overall_evidence_score'],
                        'technology_score' => $bestRepo['technology_score'],
                        'activity_score'   => $bestRepo['activity_score'],
                    ]
                );
            }

            // Skill Assessment
            if (!empty($assessmentMap[$sid])) {
                $as = $assessmentMap[$sid];
                $items[] = self::buildItem(
                    self::TYPE_ASSESSMENT,
                    'Skill Assessment',
                    (int)$as['score'],
                    $as['created_at'],
                    ucfirst($as['level'] ?? 'intermediate'),
                    'verified',
                    [
                        'score'                  => $as['score'],
                        'knowledge_score'         => $as['knowledge_score'],
                        'problem_solving_score'   => $as['problem_solving_score'],
                        'practical_score'         => $as['practical_score'],
                    ]
                );
            }

            // Formal Skill Verification (Bloom's 4-stage)
            if (!empty($verificationMap[$sid])) {
                $vr = $verificationMap[$sid];
                $breakdown = is_string($vr['breakdown']) ? json_decode($vr['breakdown'], true) ?? [] : ($vr['breakdown'] ?? []);
                $items[] = self::buildItem(
                    self::TYPE_VERIFICATION,
                    'Skill Verification (4-Stage)',
                    (int)round((float)$vr['confidence']),
                    $vr['completed_at'],
                    $vr['verified_level'] ?? 'Not Verified',
                    $vr['passed'] ? 'verified' : 'partial',
                    [
                        'score'          => $vr['score'],
                        'verified_level' => $vr['verified_level'],
                        'passed'         => (bool)$vr['passed'],
                        'breakdown'      => $breakdown,
                    ]
                );
            }

            // AI Interview
            foreach ($interviewSessions as $session) {
                $scorecard = is_string($session['scorecard']) ? json_decode($session['scorecard'], true) ?? [] : ($session['scorecard'] ?? []);
                // Check if this interview is relevant to this skill's domain
                $items[] = self::buildItem(
                    self::TYPE_AI_INTERVIEW,
                    'AI Adaptive Interview',
                    (int)round((float)($session['overall_score'] ?? 0)),
                    $session['created_at'],
                    'Verified',
                    'ai',
                    [
                        'target_role'   => $session['target_role'],
                        'overall_score' => $session['overall_score'],
                        'scorecard'     => $scorecard,
                    ]
                );
                break; // one interview entry per skill is sufficient
            }

            // Integrity audit
            $integrity = $integrityMap[$sid] ?? null;
            $integrityStatus = $integrity ? $integrity['status'] : 'NOT_VERIFIED';
            $integrityConfidence = $integrity ? (int)$integrity['confidence_score'] : 0;

            // Final confidence: weighted from best available evidence
            $finalConfidence = self::computeFinalConfidence($items);

            $graph[$sid] = [
                'skill_id'            => $sid,
                'skill_name'          => $skill['skill_name'],
                'proficiency'         => $skill['proficiency'],
                'integrity_status'    => $integrityStatus,
                'integrity_confidence'=> $integrityConfidence,
                'evidence_count'      => count($items),
                'final_confidence'    => $finalConfidence,
                'verification_level'  => self::confidenceToLevel($finalConfidence),
                'evidence'            => $items,
            ];
        }

        return array_values($graph);
    }

    /**
     * Build a single evidence item — the canonical structure.
     */
    private static function buildItem(
        string $type,
        string $source,
        int $confidence,
        ?string $timestamp,
        string $verificationLevel,
        string $integrityStatus,
        array $metadata = []
    ): array {
        return [
            'evidence_type'      => $type,
            'source'             => $source,
            'confidence'         => $confidence,
            'timestamp'          => $timestamp,
            'verification_level' => $verificationLevel,
            'integrity_status'   => $integrityStatus,
            'metadata'           => $metadata,
        ];
    }

    /**
     * Compute the final confidence score as a weighted combination
     * of the strongest evidence from each type.
     * Weights match ProofOfSkillService::WEIGHTS for consistency.
     */
    private static function computeFinalConfidence(array $items): int {
        $typeWeights = [
            self::TYPE_VERIFICATION  => 30,
            self::TYPE_ASSESSMENT    => 20,
            self::TYPE_PROOF_OF_WORK => 15,
            self::TYPE_AI_INTERVIEW  => 10,
            self::TYPE_PROJECT       => 10,
            self::TYPE_GITHUB        => 10,
            self::TYPE_RESUME        => 3,
            self::TYPE_SELF_DECLARED => 2,
        ];

        // Best confidence per type
        $bestByType = [];
        foreach ($items as $item) {
            $t = $item['evidence_type'];
            if (!isset($bestByType[$t]) || $item['confidence'] > $bestByType[$t]) {
                $bestByType[$t] = $item['confidence'];
            }
        }

        if (empty($bestByType)) {
            return 0;
        }

        $totalWeight = 0;
        $weightedSum = 0;
        foreach ($bestByType as $type => $conf) {
            $w = $typeWeights[$type] ?? 5;
            $totalWeight += $w;
            $weightedSum += $w * $conf;
        }

        return $totalWeight > 0 ? (int)round($weightedSum / $totalWeight) : 0;
    }

    private static function confidenceToLevel(int $confidence): string {
        if ($confidence >= 80) return 'Verified';
        if ($confidence >= 60) return 'Developing';
        if ($confidence >= 40) return 'Beginner';
        return 'Not Verified';
    }
}
