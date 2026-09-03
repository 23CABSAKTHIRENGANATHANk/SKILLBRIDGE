<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

/**
 * ProofOfSkillService
 * Calculates deterministic multi-factor skill verification & confidence scores.
 * 
 * Weights:
 *  - Self-Declaration: 10%
 *  - Resume Evidence:  20%
 *  - Project Evidence: 20%
 *  - Assessment:       35%
 *  - GitHub Evidence:  15%
 */
class ProofOfSkillService {
    public const WEIGHTS = [
        'self_declared'    => 10,
        'resume_evidence'  => 20,
        'project_evidence' => 20,
        'assessment'       => 35,
        'github_evidence'  => 15
    ];

    public static function getStudentSkillConfidence(string $studentId): array {
        $confidence = [];
        foreach (self::getStudentSkillsWithProof($studentId) as $skill) {
            $confidence[strtolower(trim($skill['skill_name']))] = (int)$skill['confidence_score'];
        }
        return $confidence;
    }

    /**
     * Compute verification breakdown and overall confidence score for a student's skills
     */
    public static function getStudentSkillsWithProof(string $studentId): array {
        $db = Database::getConnection();

        // 1. Fetch skills
        $stmt = $db->prepare('
            SELECT s.id as skill_id, s.name as skill_name, sk.proficiency
            FROM student_skills sk
            JOIN skills s ON sk.skill_id = s.id
            WHERE sk.student_id = ?
        ');
        $stmt->execute([$studentId]);
        $skills = $stmt->fetchAll();

        // 2. Fetch evidence sources
        $evStmt = $db->prepare('
            SELECT skill_id, source, confidence, metadata
            FROM skill_evidence
            WHERE student_id = ?
        ');
        $evStmt->execute([$studentId]);
        $evidenceRows = $evStmt->fetchAll();
        $evidenceMap = [];
        foreach ($evidenceRows as $row) {
            $evidenceMap[$row['skill_id']][$row['source']] = [
                'confidence' => (int)$row['confidence'],
                'metadata'   => is_string($row['metadata']) ? json_decode($row['metadata'], true) : $row['metadata']
            ];
        }

        // 3. Fetch assessments
        $asStmt = $db->prepare('
            SELECT skill_id, score, level, knowledge_score, problem_solving_score, practical_score, created_at
            FROM skill_assessments
            WHERE student_id = ?
            ORDER BY created_at DESC
        ');
        $asStmt->execute([$studentId]);
        $assessments = $asStmt->fetchAll();
        $assessmentMap = [];
        foreach ($assessments as $as) {
            if (!isset($assessmentMap[$as['skill_id']])) {
                $assessmentMap[$as['skill_id']] = $as;
            }
        }

        // 4. Fetch projects & github profile to detect contextual evidence
        $pStmt = $db->prepare('SELECT tech_stack, title, description FROM student_projects WHERE student_id = ?');
        $pStmt->execute([$studentId]);
        $projects = $pStmt->fetchAll();

        $ghStmt = $db->prepare('SELECT detected_skills, languages FROM student_github_profiles WHERE student_id = ?');
        $ghStmt->execute([$studentId]);
        $ghProfile = $ghStmt->fetch();
        $ghSkills = [];
        if ($ghProfile) {
            $ghSkills = is_string($ghProfile['detected_skills']) ? json_decode($ghProfile['detected_skills'], true) : ($ghProfile['detected_skills'] ?? []);
        }

        // 5. Fetch skill integrity audits
        $iaStmt = $db->prepare('SELECT skill_id, status, supported_level, confidence_score, recommendations FROM skill_integrity_audits WHERE student_id = ?');
        $iaStmt->execute([$studentId]);
        $auditRows = $iaStmt->fetchAll();
        $auditMap = [];
        foreach ($auditRows as $ar) {
            $auditMap[$ar['skill_id']] = [
                'status' => $ar['status'],
                'supported_level' => $ar['supported_level'],
                'confidence' => (float)$ar['confidence_score'],
                'recommendations' => is_string($ar['recommendations']) ? json_decode($ar['recommendations'], true) : $ar['recommendations']
            ];
        }

        $powStmt = $db->prepare('SELECT repo_name, technologies, overall_evidence_score, signals FROM proof_of_work_repositories WHERE student_id = ?');
        $powStmt->execute([$studentId]);
        $powRows = $powStmt->fetchAll();

        $results = [];
        foreach ($skills as $sk) {
            $sId = $sk['skill_id'];
            $sName = strtolower(trim($sk['skill_name']));

            // Sources evaluation
            $hasSelf = true; // Added in portfolio
            $hasAssessment = isset($assessmentMap[$sId]);
            $assessmentScore = $hasAssessment ? (int)$assessmentMap[$sId]['score'] : 0;

            // Project evidence check
            $hasProject = false;
            foreach ($projects as $proj) {
                $pStack = strtolower(($proj['tech_stack'] ?? '') . ' ' . ($proj['title'] ?? '') . ' ' . ($proj['description'] ?? ''));
                if (str_contains($pStack, $sName)) {
                    $hasProject = true;
                    break;
                }
            }

            // GitHub evidence check
            $hasGithub = false;
            foreach ($ghSkills as $ghs) {
                if (str_contains(strtolower((string)$ghs), $sName)) {
                    $hasGithub = true;
                    break;
                }
            }

            // Proof of work repository match
            $powScore = 0;
            $powSignals = [];
            foreach ($powRows as $pr) {
                $techs = json_decode($pr['technologies'] ?? '[]', true) ?: [];
                foreach ($techs as $t) {
                    if (str_contains(strtolower((string)$t), $sName) || str_contains($sName, strtolower((string)$t))) {
                        $powScore = max($powScore, (int)$pr['overall_evidence_score']);
                        $sigData = json_decode($pr['signals'] ?? '{}', true);
                        $powSignals[] = "Repository {$pr['repo_name']}: {$pr['overall_evidence_score']}% evidence";
                        if (!empty($sigData['is_recent'])) {
                            $powSignals[] = "Recent commits detected in {$pr['repo_name']}";
                        }
                        break;
                    }
                }
            }
            $powLevel = $powScore >= 75 ? 'HIGH' : ($powScore >= 50 ? 'MEDIUM' : ($powScore > 0 ? 'LOW' : 'NONE'));

            // Resume evidence
            $hasResume = isset($evidenceMap[$sId]['resume_evidence']) && $evidenceMap[$sId]['resume_evidence']['confidence'] > 0;

            // Weighted confidence calculation
            $totalScore = 0;
            if ($hasSelf) $totalScore += self::WEIGHTS['self_declared'];
            if ($hasResume) $totalScore += self::WEIGHTS['resume_evidence'];
            if ($hasProject) $totalScore += self::WEIGHTS['project_evidence'];
            if ($hasAssessment) {
                $totalScore += (int)round(($assessmentScore / 100) * self::WEIGHTS['assessment']);
            }
            if ($hasGithub) $totalScore += self::WEIGHTS['github_evidence'];

            $confidenceLabel = 'Self-Declared';
            if ($totalScore >= 75) {
                $confidenceLabel = 'High Confidence';
            } else if ($totalScore >= 45) {
                $confidenceLabel = 'Moderate Confidence';
            } else if ($totalScore > 10) {
                $confidenceLabel = 'Evidence Detected';
            }

            $audit = $auditMap[$sId] ?? null;
            $integrityStatus = $audit['status'] ?? ($hasAssessment ? ($assessmentScore >= 60 ? 'VERIFIED' : 'EVIDENCE_MISMATCH') : ($hasProject || $hasGithub ? 'DEVELOPING' : 'NOT_VERIFIED'));

            $results[] = [
                'skill_id'           => $sId,
                'skill_name'         => $sk['skill_name'],
                'proficiency'        => $sk['proficiency'],
                'confidence_score'   => $totalScore,
                'confidence_level'   => $confidenceLabel,
                'is_verified'        => $totalScore >= 50,
                'verification_level' => $audit['supported_level'] ?? ($assessmentMap[$sId]['level'] ?? 'Not Verified'),
                'integrity_status'   => $integrityStatus,
                'evidence_score'     => (float)($audit['confidence_score'] ?? $totalScore),
                'supported_level'    => $audit['supported_level'] ?? null,
                'recommendations'    => is_string($audit['recommendations'] ?? null) ? (json_decode($audit['recommendations'], true) ?: []) : ($audit['recommendations'] ?? []),
                'proof_of_work_score' => $powScore,
                'proof_of_work_level' => $powLevel,
                'proof_signals'      => array_values(array_unique($powSignals)),
                'evidence'           => [
                    'self_declared'    => $hasSelf,
                    'resume_evidence'  => $hasResume,
                    'project_evidence' => $hasProject,
                    'assessment'       => $hasAssessment,
                    'assessment_score' => $assessmentScore,
                    'github_evidence'  => $hasGithub,
                ],
                'assessment_details' => $assessmentMap[$sId] ?? null,
                'audit_details'      => $audit
            ];
        }

        return $results;
    }

    /**
     * Batch fetch and compute skills with proof for multiple candidates (Eliminates N+1 queries)
     */
    public static function batchGetStudentsSkillsWithProof(array $studentIds): array {
        if (empty($studentIds)) {
            return [];
        }

        $studentIds = array_values(array_unique(array_filter($studentIds)));
        if (count($studentIds) === 1) {
            return [$studentIds[0] => self::getStudentSkillsWithProof($studentIds[0])];
        }

        $db = Database::getConnection();
        $placeholders = implode(',', array_fill(0, count($studentIds), '?'));

        // 1. Fetch skills for all candidates
        $stmt = $db->prepare("
            SELECT sk.student_id, s.id as skill_id, s.name as skill_name, sk.proficiency
            FROM student_skills sk
            JOIN skills s ON sk.skill_id = s.id
            WHERE sk.student_id IN ({$placeholders})
        ");
        $stmt->execute($studentIds);
        $skillsByStudent = [];
        foreach ($stmt->fetchAll() as $sk) {
            $skillsByStudent[$sk['student_id']][] = $sk;
        }

        // 2. Fetch evidence sources for all candidates
        $evStmt = $db->prepare("
            SELECT student_id, skill_id, source, confidence, metadata
            FROM skill_evidence
            WHERE student_id IN ({$placeholders})
        ");
        $evStmt->execute($studentIds);
        $evidenceByStudent = [];
        foreach ($evStmt->fetchAll() as $row) {
            $evidenceByStudent[$row['student_id']][$row['skill_id']][$row['source']] = [
                'confidence' => (int)$row['confidence'],
                'metadata'   => is_string($row['metadata']) ? json_decode($row['metadata'], true) : $row['metadata']
            ];
        }

        // 3. Fetch assessments for all candidates
        $asStmt = $db->prepare("
            SELECT student_id, skill_id, score, level, knowledge_score, problem_solving_score, practical_score, created_at
            FROM skill_assessments
            WHERE student_id IN ({$placeholders})
            ORDER BY created_at DESC
        ");
        $asStmt->execute($studentIds);
        $assessmentsByStudent = [];
        foreach ($asStmt->fetchAll() as $as) {
            if (!isset($assessmentsByStudent[$as['student_id']][$as['skill_id']])) {
                $assessmentsByStudent[$as['student_id']][$as['skill_id']] = $as;
            }
        }

        // 4. Fetch projects for all candidates
        $pStmt = $db->prepare("SELECT student_id, tech_stack, title, description FROM student_projects WHERE student_id IN ({$placeholders})");
        $pStmt->execute($studentIds);
        $projectsByStudent = [];
        foreach ($pStmt->fetchAll() as $p) {
            $projectsByStudent[$p['student_id']][] = $p;
        }

        // 5. Fetch integrity audits for all candidates
        $iaStmt = $db->prepare("SELECT student_id, skill_id, status, supported_level, confidence_score, recommendations FROM skill_integrity_audits WHERE student_id IN ({$placeholders})");
        $iaStmt->execute($studentIds);
        $auditByStudent = [];
        foreach ($iaStmt->fetchAll() as $ar) {
            $auditByStudent[$ar['student_id']][$ar['skill_id']] = [
                'status' => $ar['status'],
                'supported_level' => $ar['supported_level'],
                'confidence' => (float)$ar['confidence_score'],
                'recommendations' => is_string($ar['recommendations']) ? json_decode($ar['recommendations'], true) : $ar['recommendations']
            ];
        }

        // 6. Fetch proof of work repos for all candidates
        $powStmt = $db->prepare("SELECT student_id, repo_name, technologies, overall_evidence_score, signals FROM proof_of_work_repositories WHERE student_id IN ({$placeholders})");
        $powStmt->execute($studentIds);
        $powByStudent = [];
        foreach ($powStmt->fetchAll() as $pw) {
            $powByStudent[$pw['student_id']][] = $pw;
        }

        $allResults = [];
        foreach ($studentIds as $sId) {
            $studentSkills = $skillsByStudent[$sId] ?? [];
            $evidenceMap = $evidenceByStudent[$sId] ?? [];
            $assessmentMap = $assessmentsByStudent[$sId] ?? [];
            $projects = $projectsByStudent[$sId] ?? [];
            $auditMap = $auditByStudent[$sId] ?? [];
            $powRows = $powByStudent[$sId] ?? [];

            $studentResults = [];
            foreach ($studentSkills as $sk) {
                $skillId = $sk['skill_id'];
                $sName = strtolower(trim($sk['skill_name']));

                $hasSelf = true;
                $hasAssessment = isset($assessmentMap[$skillId]);
                $assessmentScore = $hasAssessment ? (int)$assessmentMap[$skillId]['score'] : 0;

                $hasProject = false;
                foreach ($projects as $p) {
                    if (str_contains(strtolower($p['tech_stack'] ?? ''), $sName) || str_contains(strtolower($p['title'] ?? ''), $sName)) {
                        $hasProject = true;
                        break;
                    }
                }

                $hasGithub = false;
                $powScore = 0;
                $powLevel = 'NONE';
                $powSignals = [];
                foreach ($powRows as $pr) {
                    $techs = is_string($pr['technologies'] ?? null) ? json_decode($pr['technologies'], true) : ($pr['technologies'] ?? []);
                    if (is_array($techs)) {
                        foreach ($techs as $t) {
                            if (strtolower(trim($t)) === $sName) {
                                $hasGithub = true;
                                $score = (int)($pr['overall_evidence_score'] ?? 0);
                                if ($score > $powScore) {
                                    $powScore = $score;
                                    $powLevel = $score >= 75 ? 'HIGH' : ($score >= 50 ? 'MEDIUM' : 'LOW');
                                }
                                $powSignals[] = "Code repository '{$pr['repo_name']}' verified ({$score}% quality)";
                            }
                        }
                    }
                }

                $hasResume = isset($evidenceMap[$skillId]['resume']);

                // Calculate multi-factor confidence
                $totalScore = 0;
                if ($hasSelf) $totalScore += self::WEIGHTS['self_declared'];
                if ($hasResume) $totalScore += self::WEIGHTS['resume_evidence'];
                if ($hasProject) $totalScore += self::WEIGHTS['project_evidence'];
                if ($hasAssessment) {
                    $weightedAssessment = (int)round(($assessmentScore / 100) * self::WEIGHTS['assessment']);
                    $totalScore += $weightedAssessment;
                }
                if ($hasGithub) {
                    $weightedGithub = (int)round(($powScore / 100) * self::WEIGHTS['github_evidence']);
                    $totalScore += max(5, $weightedGithub);
                }
                $totalScore = min(100, $totalScore);

                $audit = $auditMap[$skillId] ?? null;
                $integrityStatus = $audit['status'] ?? ($hasAssessment ? ($assessmentScore >= 60 ? 'VERIFIED' : 'EVIDENCE_MISMATCH') : ($hasProject || $hasGithub ? 'DEVELOPING' : 'NOT_VERIFIED'));

                $studentResults[] = [
                    'skill_id'           => $skillId,
                    'skill_name'         => $sk['skill_name'],
                    'proficiency'        => $sk['proficiency'],
                    'confidence_score'   => $totalScore,
                    'confidence_level'   => $totalScore >= 80 ? 'Mastery Verified' : ($totalScore >= 60 ? 'Advanced Proof' : 'Evidence Detected'),
                    'is_verified'        => $totalScore >= 50,
                    'verification_level' => $audit['supported_level'] ?? ($assessmentMap[$skillId]['level'] ?? 'Not Verified'),
                    'integrity_status'   => $integrityStatus,
                    'evidence_score'     => (float)($audit['confidence_score'] ?? $totalScore),
                    'supported_level'    => $audit['supported_level'] ?? null,
                    'recommendations'    => is_string($audit['recommendations'] ?? null) ? (json_decode($audit['recommendations'], true) ?: []) : ($audit['recommendations'] ?? []),
                    'proof_of_work_score' => $powScore,
                    'proof_of_work_level' => $powLevel,
                    'proof_signals'      => array_values(array_unique($powSignals)),
                    'evidence'           => [
                        'self_declared'    => $hasSelf,
                        'resume_evidence'  => $hasResume,
                        'project_evidence' => $hasProject,
                        'assessment'       => $hasAssessment,
                        'assessment_score' => $assessmentScore,
                        'github_evidence'  => $hasGithub,
                    ],
                    'assessment_details' => $assessmentMap[$skillId] ?? null,
                    'audit_details'      => $audit
                ];
            }
            $allResults[$sId] = $studentResults;
        }

        return $allResults;
    }

    // -----------------------------------------------------------------------
    // SKILL TRUST SCORE (SkillBridge 3.0 — explainability metric)
    // This is SEPARATE from WEIGHTS above (which power the matching engine).
    // Trust Score is a human-readable evidence confidence indicator only.
    // -----------------------------------------------------------------------

    /**
     * Trust Score weights — additive explainability metric.
     * These are NOT used in any hiring decision or matching formula.
     */
    public const TRUST_WEIGHTS = [
        'skill_verification' => 30,   // 4-stage Bloom's assessment
        'assessment'         => 20,   // Quick assessment
        'proof_of_work'      => 15,   // GitHub Proof-of-Work
        'project_evidence'   => 10,   // Student projects
        'ai_interview'       => 10,   // Adaptive AI interview
        'resume_evidence'    => 10,   // Resume extraction
        'github_evidence'    =>  3,   // Raw GitHub language detection
        'self_declared'      =>  2,   // Self-declaration baseline
    ];

    /**
     * Compute Trust Score for a specific skill of a student.
     * Every source is real DB data — no invention.
     */
    public static function getTrustScore(string $studentId, string $skillId): array {
        $db = Database::getConnection();

        $breakdown = [];
        $totalWeight = 0;
        $weightedSum = 0;

        // 1. Skill Verification (30%)
        $vStmt = $db->prepare('
            SELECT score, verified_level, confidence, passed
            FROM skill_verification_attempts
            WHERE student_id = ? AND skill_id = ? AND status = \'completed\'
            ORDER BY score DESC LIMIT 1
        ');
        $vStmt->execute([$studentId, $skillId]);
        $verification = $vStmt->fetch();
        $vScore = $verification ? (int)round((float)$verification['confidence']) : 0;
        $breakdown['skill_verification'] = [
            'weight'      => self::TRUST_WEIGHTS['skill_verification'],
            'score'       => $vScore,
            'contribution'=> (int)round($vScore * self::TRUST_WEIGHTS['skill_verification'] / 100),
            'present'     => $verification !== false,
            'detail'      => $verification
                ? "Verified: {$verification['verified_level']} (score {$verification['score']}%)"
                : 'No completed verification attempt',
        ];
        $totalWeight += self::TRUST_WEIGHTS['skill_verification'];
        $weightedSum += $vScore * self::TRUST_WEIGHTS['skill_verification'];

        // 2. Quick Assessment (20%)
        $aStmt = $db->prepare('
            SELECT score, level FROM skill_assessments
            WHERE student_id = ? AND skill_id = ?
            ORDER BY score DESC LIMIT 1
        ');
        $aStmt->execute([$studentId, $skillId]);
        $assessment = $aStmt->fetch();
        $aScore = $assessment ? (int)$assessment['score'] : 0;
        $breakdown['assessment'] = [
            'weight'      => self::TRUST_WEIGHTS['assessment'],
            'score'       => $aScore,
            'contribution'=> (int)round($aScore * self::TRUST_WEIGHTS['assessment'] / 100),
            'present'     => $assessment !== false,
            'detail'      => $assessment
                ? "Assessment: {$assessment['score']}% ({$assessment['level']})"
                : 'No assessment recorded',
        ];
        $totalWeight += self::TRUST_WEIGHTS['assessment'];
        $weightedSum += $aScore * self::TRUST_WEIGHTS['assessment'];

        // 3. Proof-of-Work (15%)
        $skillNameRow = $db->prepare('SELECT normalized_name FROM skills WHERE id = ?');
        $skillNameRow->execute([$skillId]);
        $norm = strtolower((string)($skillNameRow->fetchColumn() ?: ''));
        $powStmt = $db->prepare('
            SELECT repo_name, overall_evidence_score, technologies, primary_language
            FROM proof_of_work_repositories
            WHERE student_id = ?
            ORDER BY overall_evidence_score DESC
        ');
        $powStmt->execute([$studentId]);
        $repos = $powStmt->fetchAll();
        $powScore = 0;
        $powDetail = 'No relevant repositories found';
        $matchedRepos = 0;
        foreach ($repos as $repo) {
            $techs = is_string($repo['technologies']) ? json_decode($repo['technologies'], true) ?? [] : ($repo['technologies'] ?? []);
            $pl = strtolower($repo['primary_language'] ?? '');
            $isMatch = ($pl && (str_contains($norm, $pl) || str_contains($pl, $norm)));
            if (!$isMatch) {
                foreach ($techs as $t) {
                    $tName = strtolower(is_array($t) ? ($t['name'] ?? (string)$t) : (string)$t);
                    if ($tName && (str_contains($norm, $tName) || str_contains($tName, $norm))) {
                        $isMatch = true;
                        break;
                    }
                }
            }
            if ($isMatch) {
                $matchedRepos++;
                $powScore = max($powScore, min(100, (int)$repo['overall_evidence_score']));
            }
        }
        if ($matchedRepos > 0) {
            $powDetail = "{$matchedRepos} relevant repositor" . ($matchedRepos > 1 ? 'ies' : 'y') . " (evidence score: {$powScore}%)";
        }
        $breakdown['proof_of_work'] = [
            'weight'      => self::TRUST_WEIGHTS['proof_of_work'],
            'score'       => $powScore,
            'contribution'=> (int)round($powScore * self::TRUST_WEIGHTS['proof_of_work'] / 100),
            'present'     => $matchedRepos > 0,
            'detail'      => $powDetail,
        ];
        $totalWeight += self::TRUST_WEIGHTS['proof_of_work'];
        $weightedSum += $powScore * self::TRUST_WEIGHTS['proof_of_work'];

        // 4. Project Evidence (10%)
        $peStmt = $db->prepare('
            SELECT confidence FROM skill_evidence
            WHERE student_id = ? AND skill_id = ? AND source = \'project_evidence\'
            LIMIT 1
        ');
        $peStmt->execute([$studentId, $skillId]);
        $pe = $peStmt->fetch();
        $peScore = $pe ? (int)$pe['confidence'] : 0;
        $breakdown['project_evidence'] = [
            'weight'      => self::TRUST_WEIGHTS['project_evidence'],
            'score'       => $peScore,
            'contribution'=> (int)round($peScore * self::TRUST_WEIGHTS['project_evidence'] / 100),
            'present'     => $pe !== false,
            'detail'      => $pe ? "Project evidence confidence: {$peScore}%" : 'No project evidence recorded',
        ];
        $totalWeight += self::TRUST_WEIGHTS['project_evidence'];
        $weightedSum += $peScore * self::TRUST_WEIGHTS['project_evidence'];

        // 5. AI Interview (10%)
        $aiStmt = $db->prepare('
            SELECT overall_score, target_role
            FROM ai_interview_sessions_v2
            WHERE student_id = ? AND status = \'completed\' AND overall_score IS NOT NULL
            ORDER BY overall_score DESC LIMIT 1
        ');
        $aiStmt->execute([$studentId]);
        $interview = $aiStmt->fetch();
        $aiScore = $interview ? (int)round((float)$interview['overall_score']) : 0;
        $breakdown['ai_interview'] = [
            'weight'      => self::TRUST_WEIGHTS['ai_interview'],
            'score'       => $aiScore,
            'contribution'=> (int)round($aiScore * self::TRUST_WEIGHTS['ai_interview'] / 100),
            'present'     => $interview !== false,
            'detail'      => $interview
                ? "AI Interview for '{$interview['target_role']}': {$aiScore}%"
                : 'No completed AI interview',
        ];
        $totalWeight += self::TRUST_WEIGHTS['ai_interview'];
        $weightedSum += $aiScore * self::TRUST_WEIGHTS['ai_interview'];

        // 6. Resume Evidence (10%)
        $reStmt = $db->prepare('
            SELECT confidence FROM skill_evidence
            WHERE student_id = ? AND skill_id = ? AND source = \'resume_evidence\'
            LIMIT 1
        ');
        $reStmt->execute([$studentId, $skillId]);
        $re = $reStmt->fetch();
        $reScore = $re ? (int)$re['confidence'] : 0;
        $breakdown['resume_evidence'] = [
            'weight'      => self::TRUST_WEIGHTS['resume_evidence'],
            'score'       => $reScore,
            'contribution'=> (int)round($reScore * self::TRUST_WEIGHTS['resume_evidence'] / 100),
            'present'     => $re !== false,
            'detail'      => $re ? "Resume evidence confidence: {$reScore}%" : 'Not detected in resume',
        ];
        $totalWeight += self::TRUST_WEIGHTS['resume_evidence'];
        $weightedSum += $reScore * self::TRUST_WEIGHTS['resume_evidence'];

        // 7. GitHub language detection (3%)
        $ghStmt = $db->prepare('SELECT languages, detected_skills FROM student_github_profiles WHERE student_id = ? LIMIT 1');
        $ghStmt->execute([$studentId]);
        $gh = $ghStmt->fetch();
        $ghScore = 0;
        $ghDetail = 'No GitHub profile connected';
        if ($gh) {
            $langs = is_string($gh['languages']) ? json_decode($gh['languages'], true) ?? [] : ($gh['languages'] ?? []);
            $det   = is_string($gh['detected_skills']) ? json_decode($gh['detected_skills'], true) ?? [] : ($gh['detected_skills'] ?? []);
            foreach (array_merge($langs, $det) as $item) {
                $name = strtolower(is_array($item) ? ($item['name'] ?? (string)$item) : (string)$item);
                if ($name && (str_contains($norm, $name) || str_contains($name, $norm))) {
                    $ghScore = 70;
                    $ghDetail = "Language/skill '{$name}' detected in GitHub profile";
                    break;
                }
            }
            if ($ghScore === 0) {
                $ghDetail = 'GitHub connected but skill not detected in languages';
            }
        }
        $breakdown['github_evidence'] = [
            'weight'      => self::TRUST_WEIGHTS['github_evidence'],
            'score'       => $ghScore,
            'contribution'=> (int)round($ghScore * self::TRUST_WEIGHTS['github_evidence'] / 100),
            'present'     => $ghScore > 0,
            'detail'      => $ghDetail,
        ];
        $totalWeight += self::TRUST_WEIGHTS['github_evidence'];
        $weightedSum += $ghScore * self::TRUST_WEIGHTS['github_evidence'];

        // 8. Self-declaration (2%)
        $sdStmt = $db->prepare('SELECT proficiency FROM student_skills WHERE student_id = ? AND skill_id = ?');
        $sdStmt->execute([$studentId, $skillId]);
        $sdRow = $sdStmt->fetch();
        $sdScore = $sdRow ? 50 : 0; // Base presence score for self-declaration
        $breakdown['self_declared'] = [
            'weight'      => self::TRUST_WEIGHTS['self_declared'],
            'score'       => $sdScore,
            'contribution'=> (int)round($sdScore * self::TRUST_WEIGHTS['self_declared'] / 100),
            'present'     => $sdRow !== false,
            'detail'      => $sdRow ? "Self-declared as {$sdRow['proficiency']}" : 'Not in profile',
        ];
        $totalWeight += self::TRUST_WEIGHTS['self_declared'];
        $weightedSum += $sdScore * self::TRUST_WEIGHTS['self_declared'];

        // Final trust score
        $trustScore = $totalWeight > 0 ? (int)round($weightedSum / $totalWeight) : 0;
        $confidence = match(true) {
            $trustScore >= 80 => 'very_high',
            $trustScore >= 60 => 'high',
            $trustScore >= 40 => 'medium',
            default           => 'low',
        };

        return [
            'trust_score' => $trustScore,
            'confidence'  => $confidence,
            'breakdown'   => array_values(
                array_map(fn($key, $val) => array_merge(['factor' => $key], $val), array_keys($breakdown), $breakdown)
            ),
        ];
    }

    /**
     * Get Trust Scores for ALL skills of a student at once.
     * Persists results to skill_trust_scores for fast re-reads.
     */
    public static function getStudentTrustScores(string $studentId): array {
        $db = Database::getConnection();

        // Fetch all student skills
        $skillStmt = $db->prepare('
            SELECT s.id AS skill_id, s.name AS skill_name
            FROM student_skills sk
            JOIN skills s ON sk.skill_id = s.id
            WHERE sk.student_id = ?
            ORDER BY s.name ASC
        ');
        $skillStmt->execute([$studentId]);
        $skills = $skillStmt->fetchAll();

        $results = [];
        foreach ($skills as $skill) {
            $ts = self::getTrustScore($studentId, $skill['skill_id']);
            $results[] = array_merge(
                ['skill_id' => $skill['skill_id'], 'skill_name' => $skill['skill_name']],
                $ts
            );

            // Persist to skill_trust_scores (upsert)
            try {
                $upsert = $db->prepare('
                    INSERT INTO skill_trust_scores (student_id, skill_id, trust_score, confidence, breakdown, computed_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT (student_id, skill_id) DO UPDATE
                        SET trust_score  = EXCLUDED.trust_score,
                            confidence   = EXCLUDED.confidence,
                            breakdown    = EXCLUDED.breakdown,
                            computed_at  = CURRENT_TIMESTAMP
                ');
                $upsert->execute([
                    $studentId,
                    $skill['skill_id'],
                    $ts['trust_score'],
                    $ts['confidence'],
                    json_encode($ts['breakdown']),
                ]);
            } catch (\Throwable) {
                // Non-fatal: table may not exist yet in older deployments
            }
        }

        return $results;
    }
}

