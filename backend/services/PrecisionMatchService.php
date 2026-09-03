<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/ProofOfSkillService.php';
require_once __DIR__ . '/ProofOfWorkService.php';

/**
 * PrecisionMatchService
 * Recruiter Precision Match Engine 2.0.
 * Implements multi-dimensional candidate ranking, PostgreSQL indexed filtering,
 * hard vs soft constraint handling, and explainable match reasons.
 */
class PrecisionMatchService {

    /**
     * Precision Match Scoring Weights
     */
    public const WEIGHTS = [
        'skill_match'           => 35, // 35%
        'verified_evidence'     => 20, // 20%
        'assessment_score'      => 15, // 15%
        'proof_of_work'         => 15, // 15%
        'project_relevance'     => 10, // 10%
        'experience_alignment'  => 5   // 5%
    ];

    /**
     * Search and rank candidates based on recruiter criteria.
     */
    public static function searchCandidates(array $filters, int $limit = 20, int $offset = 0): array {
        $db = Database::getConnection();
        $limit = max(1, min(100, $limit));
        $offset = max(0, $offset);

        $roleQuery = trim((string)($filters['role'] ?? ''));
        $requiredSkills = array_filter(array_map('trim', (array)($filters['skills'] ?? [])));
        $minVerification = trim((string)($filters['verification_level'] ?? 'All'));
        $minAssessment = isset($filters['min_assessment']) ? (int)$filters['min_assessment'] : 0;
        $powFilter = trim((string)($filters['proof_of_work'] ?? 'Any'));
        $location = trim((string)($filters['location'] ?? ''));
        $experience = trim((string)($filters['experience'] ?? ''));
        $sortBy = trim((string)($filters['sort_by'] ?? 'best_match'));

        // 1. Base query across students
        $sql = '
            SELECT s.id, s.name, s.college, s.program, s.experience, s.location, s.avatar_url, s.created_at,
                   sp.public_token as passport_token, sp.is_public as passport_is_public,
                   sc.status as credential_status, sc.credential_version, sc.signature as credential_signature
            FROM students s
            LEFT JOIN student_passports sp ON s.id = sp.student_id
            LEFT JOIN skill_credentials sc ON sp.public_token = sc.passport_token AND sc.status = \'VALID\'
            WHERE 1=1
        ';
        $params = [];

        if (!empty($location) && strtolower($location) !== 'all locations') {
            $sql .= ' AND (LOWER(s.location) LIKE ? OR LOWER(s.college) LIKE ?)';
            $params[] = '%' . strtolower($location) . '%';
            $params[] = '%' . strtolower($location) . '%';
        }

        if (!empty($experience) && strtolower($experience) !== 'all') {
            $sql .= ' AND LOWER(s.experience) LIKE ?';
            $params[] = '%' . strtolower($experience) . '%';
        }

        // Execute query to fetch candidate pool
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $candidates = $stmt->fetchAll();

        // 2. Evaluate and rank each candidate deterministically with batch preloading (Eliminates N+1 queries)
        $studentIds = array_column($candidates, 'id');
        $allSkillsProof = ProofOfSkillService::batchGetStudentsSkillsWithProof($studentIds);
        $allPowSummaries = ProofOfWorkService::batchGetStudentsProofOfWorkSummary($studentIds);

        // Preload projects in 1 batch query
        $projectsByStudent = [];
        if (!empty($studentIds)) {
            $pPlaceholders = implode(',', array_fill(0, count($studentIds), '?'));
            $pStmt = $db->prepare("SELECT student_id, title, tech_stack FROM student_projects WHERE student_id IN ({$pPlaceholders})");
            $pStmt->execute($studentIds);
            foreach ($pStmt->fetchAll() as $p) {
                $projectsByStudent[$p['student_id']][] = $p;
            }
        }

        $ranked = [];
        foreach ($candidates as $cand) {
            $candId = $cand['id'];
            $skillsProof = $allSkillsProof[$candId] ?? [];
            $powSummary = $allPowSummaries[$candId] ?? [
                'has_proof_of_work' => false,
                'total_repositories' => 0,
                'overall_pow_score' => 0,
                'proof_of_work_level' => 'NONE',
                'top_technologies' => [],
                'repositories' => [],
                'signals_summary' => []
            ];
            $projects = $projectsByStudent[$candId] ?? [];

            $eval = self::calculateCandidateMatch($cand, $skillsProof, $powSummary, $projects, [
                'role' => $roleQuery,
                'required_skills' => $requiredSkills,
                'min_verification' => $minVerification,
                'min_assessment' => $minAssessment,
                'pow_filter' => $powFilter
            ]);

            // Apply hard filter gates
            if (!$eval['passes_hard_filters']) {
                continue;
            }

            $ranked[] = [
                'student_id' => $candId,
                'name' => $cand['name'],
                'college' => $cand['college'],
                'program' => $cand['program'],
                'experience' => $cand['experience'],
                'location' => $cand['location'] ?? 'Not specified',
                'avatar_url' => $cand['avatar_url'],
                'passport_token' => $cand['passport_token'],
                'credential_status' => $cand['credential_status'] ?? 'UNVERIFIED',
                'has_cryptographic_passport' => !empty($cand['credential_signature']),
                'precision_match_score' => $eval['precision_match_score'],
                'match_strength' => $eval['match_strength'],
                'matched_skills' => $eval['matched_skills'],
                'missing_skills' => $eval['missing_skills'],
                'average_assessment_score' => $eval['average_assessment_score'],
                'proof_of_work' => [
                    'level' => $powSummary['proof_of_work_level'],
                    'score' => $powSummary['overall_pow_score'],
                    'repositories_count' => $powSummary['total_repositories']
                ],
                'relevant_projects_count' => count($projects),
                'explainable_reasons' => $eval['explainable_reasons'],
                'gaps' => $eval['gaps']
            ];
        }

        // 3. Sort candidates
        usort($ranked, function($a, $b) use ($sortBy) {
            if ($sortBy === 'highest_assessment') {
                return $b['average_assessment_score'] <=> $a['average_assessment_score'];
            }
            if ($sortBy === 'highest_pow') {
                return $b['proof_of_work']['score'] <=> $a['proof_of_work']['score'];
            }
            return $b['precision_match_score'] <=> $a['precision_match_score'];
        });

        $totalCount = count($ranked);
        $paginated = array_slice($ranked, $offset, $limit);

        return [
            'total' => $totalCount,
            'limit' => $limit,
            'offset' => $offset,
            'candidates' => $paginated
        ];
    }

    /**
     * Calculate precision score and explainable reasons for a candidate.
     */
    public static function calculateCandidateMatch(array $student, array $skillsProof, array $powSummary, array $projects, array $criteria): array {
        $requiredSkills = array_map('strtolower', $criteria['required_skills'] ?? []);
        $minVerification = strtolower($criteria['min_verification'] ?? 'all');
        $minAssessment = (int)($criteria['min_assessment'] ?? 0);
        $powFilter = strtoupper($criteria['pow_filter'] ?? 'ANY');

        $candSkillsMap = [];
        foreach ($skillsProof as $sp) {
            $candSkillsMap[strtolower(trim($sp['skill_name']))] = $sp;
        }

        $matchedSkills = [];
        $missingSkills = [];
        $assessScores = [];
        $verifiedMatches = 0;
        $explainableReasons = [];
        $gaps = [];

        if (!empty($requiredSkills)) {
            foreach ($requiredSkills as $req) {
                if (isset($candSkillsMap[$req])) {
                    $sk = $candSkillsMap[$req];
                    $matchedSkills[] = [
                        'skill_name' => $sk['skill_name'],
                        'verification_level' => $sk['verification_level'],
                        'is_verified' => (bool)$sk['is_verified'],
                        'confidence_score' => (int)$sk['confidence_score']
                    ];

                    if ($sk['is_verified'] || in_array(strtolower($sk['verification_level']), ['advanced', 'expert', 'proficient'], true)) {
                        $verifiedMatches++;
                        $explainableReasons[] = "{$sk['skill_name']} — Verified {$sk['verification_level']}";
                    } else {
                        $explainableReasons[] = "{$sk['skill_name']} — Self-Declared ({$sk['proficiency']})";
                        $gaps[] = "{$sk['skill_name']} requires assessment verification";
                    }

                    if (!empty($sk['evidence']['assessment_score'])) {
                        $assessScores[] = (int)$sk['evidence']['assessment_score'];
                    }
                } else {
                    $missingSkills[] = ucfirst($req);
                    $gaps[] = ucfirst($req) . ' not declared or verified';
                }
            }
            $skillMatchScore = (count($matchedSkills) / count($requiredSkills)) * 100;
            $verifiedEvidenceScore = count($matchedSkills) > 0 ? ($verifiedMatches / count($matchedSkills)) * 100 : 0;
        } else {
            // General match without specific required skills
            $skillMatchScore = 80;
            $verifiedCount = count(array_filter($skillsProof, fn($s) => $s['is_verified']));
            $verifiedEvidenceScore = count($skillsProof) > 0 ? ($verifiedCount / count($skillsProof)) * 100 : 0;
            foreach ($skillsProof as $sp) {
                if ($sp['is_verified']) {
                    $matchedSkills[] = [
                        'skill_name' => $sp['skill_name'],
                        'verification_level' => $sp['verification_level'],
                        'is_verified' => true,
                        'confidence_score' => (int)$sp['confidence_score']
                    ];
                    $explainableReasons[] = "{$sp['skill_name']} — Verified {$sp['verification_level']}";
                    if (!empty($sp['evidence']['assessment_score'])) {
                        $assessScores[] = (int)$sp['evidence']['assessment_score'];
                    }
                }
            }
        }

        // Assessment average
        $avgAssessment = !empty($assessScores) ? (int)round(array_sum($assessScores) / count($assessScores)) : 0;
        if ($avgAssessment >= 75) {
            $explainableReasons[] = "High Assessment Average: {$avgAssessment}%";
        }

        // Proof of work score
        $powScore = (int)($powSummary['overall_pow_score'] ?? 0);
        $powLevel = $powSummary['proof_of_work_level'] ?? 'NONE';
        if ($powLevel === 'HIGH') {
            $explainableReasons[] = "High Proof-of-Work: {$powSummary['total_repositories']} repositories analyzed";
        } elseif ($powLevel === 'MEDIUM') {
            $explainableReasons[] = "Moderate Proof-of-Work ({$powScore}% code evidence)";
        }

        // Project relevance
        $projectScore = min(100, count($projects) * 35);
        if (count($projects) > 0) {
            $explainableReasons[] = count($projects) . " relevant portfolio project(s)";
        }

        // Experience alignment
        $expScore = !empty($student['experience']) && strtolower($student['experience']) !== 'fresher' ? 85 : 65;

        // Composite Precision Match Score
        $precisionScore = (int)round(
            (($skillMatchScore / 100) * self::WEIGHTS['skill_match']) +
            (($verifiedEvidenceScore / 100) * self::WEIGHTS['verified_evidence']) +
            (($avgAssessment / 100) * self::WEIGHTS['assessment_score']) +
            (($powScore / 100) * self::WEIGHTS['proof_of_work']) +
            (($projectScore / 100) * self::WEIGHTS['project_relevance']) +
            (($expScore / 100) * self::WEIGHTS['experience_alignment'])
        );

        // Match strength category
        $strength = 'DEVELOPING';
        if ($precisionScore >= 90) {
            $strength = 'EXCEPTIONAL';
        } elseif ($precisionScore >= 75) {
            $strength = 'STRONG';
        } elseif ($precisionScore >= 50) {
            $strength = 'MODERATE';
        }

        // Hard Filter Gate evaluation
        $passesHard = true;
        if (!empty($requiredSkills) && count($matchedSkills) === 0) {
            $passesHard = false;
        }
        if ($minAssessment > 0 && $avgAssessment < $minAssessment) {
            $passesHard = false;
        }
        if ($powFilter === 'HIGH' && $powLevel !== 'HIGH') {
            $passesHard = false;
        }
        if ($powFilter === 'MEDIUM' && !in_array($powLevel, ['HIGH', 'MEDIUM'], true)) {
            $passesHard = false;
        }
        if ($minVerification === 'verified' && $verifiedMatches === 0) {
            $passesHard = false;
        }
        if ($minVerification === 'advanced') {
            $hasAdv = false;
            foreach ($matchedSkills as $ms) {
                if (in_array(strtolower($ms['verification_level']), ['advanced', 'expert'], true)) {
                    $hasAdv = true;
                    break;
                }
            }
            if (!$hasAdv) $passesHard = false;
        }
        if ($minVerification === 'expert') {
            $hasExp = false;
            foreach ($matchedSkills as $ms) {
                if (strtolower($ms['verification_level']) === 'expert') {
                    $hasExp = true;
                    break;
                }
            }
            if (!$hasExp) $passesHard = false;
        }

        return [
            'passes_hard_filters' => $passesHard,
            'precision_match_score' => $precisionScore,
            'match_strength' => $strength,
            'matched_skills' => $matchedSkills,
            'missing_skills' => $missingSkills,
            'average_assessment_score' => $avgAssessment,
            'explainable_reasons' => array_values(array_unique($explainableReasons)),
            'gaps' => array_values(array_unique($gaps))
        ];
    }
}
