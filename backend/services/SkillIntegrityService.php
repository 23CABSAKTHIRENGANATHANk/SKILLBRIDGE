<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

class SkillIntegrityService {

    public const STATUS_VERIFIED          = 'VERIFIED';
    public const STATUS_DEVELOPING        = 'DEVELOPING';
    public const STATUS_EVIDENCE_MISMATCH = 'EVIDENCE_MISMATCH';
    public const STATUS_NOT_VERIFIED      = 'NOT_VERIFIED';

    /**
     * Audit a single skill for a student across all available evidence sources.
     */
    public static function auditStudentSkill(string $studentId, string $skillId): array {
        $db = Database::getConnection();

        // 1. Fetch skill metadata
        $skStmt = $db->prepare('SELECT id, name, normalized_name FROM skills WHERE id = ?');
        $skStmt->execute([$skillId]);
        $skill = $skStmt->fetch();
        if (!$skill) {
            throw new \RuntimeException('Skill not found.');
        }

        $skillName = $skill['name'];
        $normSkill = strtolower($skill['normalized_name']);

        // 2. Claimed proficiency from student_skills
        $ssStmt = $db->prepare('SELECT proficiency FROM student_skills WHERE student_id = ? AND skill_id = ?');
        $ssStmt->execute([$studentId, $skillId]);
        $rawClaimed = $ssStmt->fetchColumn() ?: 'intermediate';
        $claimedLevel = ucfirst(strtolower((string)$rawClaimed));

        // 3. Evidence 1: Latest verified assessment attempt
        $attStmt = $db->prepare('
            SELECT id, score, verified_level, passed, completed_at
            FROM skill_verification_attempts
            WHERE student_id = ? AND skill_id = ? AND status = \'completed\'
            ORDER BY score DESC, completed_at DESC LIMIT 1
        ');
        $attStmt->execute([$studentId, $skillId]);
        $assessment = $attStmt->fetch();

        // 4. Evidence 2: Project evidence
        $pStmt = $db->prepare('SELECT title, tech_stack, description, github_url FROM student_projects WHERE student_id = ?');
        $pStmt->execute([$studentId]);
        $projects = $pStmt->fetchAll();
        $matchingProjects = [];
        foreach ($projects as $p) {
            $stack = strtolower(($p['tech_stack'] ?? '') . ' ' . ($p['title'] ?? '') . ' ' . ($p['description'] ?? ''));
            if (str_contains($stack, $normSkill)) {
                $matchingProjects[] = $p['title'];
            }
        }

        // 5. Evidence 3: GitHub proof-of-work
        $ghStmt = $db->prepare('SELECT languages, detected_skills FROM student_github_profiles WHERE student_id = ? LIMIT 1');
        $ghStmt->execute([$studentId]);
        $gh = $ghStmt->fetch();
        $hasGithubProof = false;
        if ($gh) {
            $langs = array_map('strtolower', json_decode($gh['languages'] ?? '[]', true) ?: []);
            $detected = array_map('strtolower', json_decode($gh['detected_skills'] ?? '[]', true) ?: []);
            if (in_array($normSkill, $langs, true) || in_array($normSkill, $detected, true)) {
                $hasGithubProof = true;
            }
        }

        // 6. Evidence 4: Resume evidence from skill_evidence
        $evStmt = $db->prepare('SELECT confidence FROM skill_evidence WHERE student_id = ? AND skill_id = ? AND source = \'resume_evidence\'');
        $evStmt->execute([$studentId, $skillId]);
        $resumeConfidence = (float)($evStmt->fetchColumn() ?: 0.0);
        $hasResumeEvidence = $resumeConfidence > 0;

        // 7. Evidence 5: Certificates
        $certStmt = $db->prepare('SELECT title, issuer FROM student_certificates WHERE student_id = ?');
        $certStmt->execute([$studentId]);
        $certs = $certStmt->fetchAll();
        $matchingCerts = [];
        foreach ($certs as $c) {
            $cTitle = strtolower($c['title'] . ' ' . ($c['issuer'] ?? ''));
            if (str_contains($cTitle, $normSkill)) {
                $matchingCerts[] = $c['title'];
            }
        }

        // 8. Synthesize Evidence List & Determine Evidence Supported Level
        $evidenceSources = [];
        $evidenceScore = 0.0;

        if ($assessment) {
            $asmScore = (float)$assessment['score'];
            $evidenceSources[] = "Verified Assessment: {$assessment['verified_level']} ({$asmScore}%)";
            $evidenceScore += ($asmScore * 0.70);
        } else {
            $evidenceSources[] = "Assessment: Not yet attempted";
        }

        if (!empty($matchingProjects)) {
            $evidenceSources[] = "Portfolio Projects: " . count($matchingProjects) . " related project(s) (" . implode(', ', array_slice($matchingProjects, 0, 2)) . ")";
            $evidenceScore += 25.0;
        }

        if ($hasGithubProof) {
            $evidenceSources[] = "GitHub Proof-of-Work: Verified public code repository activity";
            $evidenceScore += 15.0;
        }

        if ($hasResumeEvidence) {
            $evidenceSources[] = "Resume Evidence: Verified skill match (" . round($resumeConfidence, 0) . "%) from parsed candidate resume";
            $evidenceScore += 10.0;
        }

        if (!empty($matchingCerts)) {
            $evidenceSources[] = "Certifications: " . count($matchingCerts) . " verified credential(s)";
            $evidenceScore += 10.0;
        }

        // A passed verified assessment guarantees baseline confidence
        if ($assessment && (bool)$assessment['passed']) {
            $evidenceScore = max($evidenceScore, (float)$assessment['score']);
        }

        $confidenceScore = min(100.0, round($evidenceScore, 1));

        // Derive supported level
        if ($confidenceScore >= 85.0) {
            $supportedLevel = 'Expert';
        } elseif ($confidenceScore >= 70.0) {
            $supportedLevel = 'Advanced';
        } elseif ($confidenceScore >= 50.0) {
            $supportedLevel = 'Proficient';
        } elseif ($confidenceScore >= 25.0) {
            $supportedLevel = 'Developing';
        } else {
            $supportedLevel = 'Not Verified';
        }

        $tierValues = ['Beginner' => 1, 'Intermediate' => 2, 'Proficient' => 3, 'Advanced' => 4, 'Expert' => 5];
        if ($assessment && (bool)$assessment['passed'] && !empty($assessment['verified_level'])) {
            $asmTier = $tierValues[$assessment['verified_level']] ?? 3;
            $currentSupTier = $tierValues[$supportedLevel] ?? 1;
            if ($asmTier > $currentSupTier) {
                $supportedLevel = $assessment['verified_level'];
            }
        }

        // 9. Deterministic Inconsistency & Status Rules (Constructive, never punitive)
        $recommendations = [];
        $status = self::STATUS_NOT_VERIFIED;

        $claimedTier = $tierValues[$claimedLevel] ?? 2;
        $supportedTier = $tierValues[$supportedLevel] ?? 1;

        if ($assessment && (bool)$assessment['passed']) {
            if ($supportedTier >= $claimedTier - 1) {
                $status = self::STATUS_VERIFIED;
                $recommendations[] = "Maintain your verified standing by completing occasional advanced technical scenarios.";
            } else {
                $status = self::STATUS_EVIDENCE_MISMATCH;
                $recommendations[] = "Your assessment score ({$assessment['score']}%) indicates a {$assessment['verified_level']} level. Retake the assessment or build an advanced project to match your claimed {$claimedLevel} level.";
            }
        } elseif ($assessment && !(bool)$assessment['passed']) {
            $status = self::STATUS_EVIDENCE_MISMATCH;
            $recommendations[] = "Assessment scored below passing threshold ({$assessment['score']}%). Review foundational concepts and retake to verify your {$skillName} proficiency.";
            if (empty($matchingProjects)) {
                $recommendations[] = "Build and link a project utilizing {$skillName} to strengthen your empirical profile.";
            }
        } else {
            // No assessment taken yet
            if (!empty($matchingProjects) || $hasGithubProof) {
                $status = self::STATUS_DEVELOPING;
                $recommendations[] = "You have project or code evidence! Take the official 4-stage Skill Assessment to earn a Verified badge.";
            } else {
                $status = self::STATUS_NOT_VERIFIED;
                $recommendations[] = "Take the technical skill assessment to verify your self-declared {$claimedLevel} proficiency.";
                $recommendations[] = "Link a GitHub repository or add a portfolio project featuring {$skillName}.";
            }
        }

        // 10. Persist audit to skill_integrity_audits table
        $auditId = 'sia_' . bin2hex(random_bytes(8));
        $insAudit = $db->prepare('
            INSERT INTO skill_integrity_audits (
                id, student_id, skill_id, claimed_level, supported_level,
                status, confidence_score, evidence_sources, recommendations, last_audited_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, skill_id)
            DO UPDATE SET claimed_level = EXCLUDED.claimed_level,
                          supported_level = EXCLUDED.supported_level,
                          status = EXCLUDED.status,
                          confidence_score = EXCLUDED.confidence_score,
                          evidence_sources = EXCLUDED.evidence_sources,
                          recommendations = EXCLUDED.recommendations,
                          last_audited_at = CURRENT_TIMESTAMP
        ');
        $insAudit->execute([
            $auditId,
            $studentId,
            $skillId,
            $claimedLevel,
            $supportedLevel,
            $status,
            $confidenceScore,
            json_encode($evidenceSources),
            json_encode($recommendations)
        ]);

        return [
            'skill_id' => $skillId,
            'skill_name' => $skillName,
            'claimed_level' => $claimedLevel,
            'supported_level' => $supportedLevel,
            'status' => $status,
            'confidence_score' => $confidenceScore,
            'evidence_sources' => $evidenceSources,
            'recommendations' => $recommendations,
            'assessment_details' => $assessment ? [
                'attempt_id' => $assessment['id'],
                'score' => (float)$assessment['score'],
                'level' => $assessment['verified_level'],
                'passed' => (bool)$assessment['passed'],
                'completed_at' => $assessment['completed_at']
            ] : null
        ];
    }

    /**
     * Audit all skills for a student and return summary breakdown.
     */
    public static function auditAllStudentSkills(string $studentId): array {
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT s.id as skill_id
            FROM student_skills ss
            JOIN skills s ON ss.skill_id = s.id
            WHERE ss.student_id = ?
        ');
        $stmt->execute([$studentId]);
        $skillIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $audits = [];
        $summary = [
            'total' => count($skillIds),
            'verified' => 0,
            'developing' => 0,
            'mismatch' => 0,
            'not_verified' => 0
        ];

        foreach ($skillIds as $skId) {
            $audit = self::auditStudentSkill($studentId, $skId);
            $audits[] = $audit;

            switch ($audit['status']) {
                case self::STATUS_VERIFIED:
                    $summary['verified']++;
                    break;
                case self::STATUS_DEVELOPING:
                    $summary['developing']++;
                    break;
                case self::STATUS_EVIDENCE_MISMATCH:
                    $summary['mismatch']++;
                    break;
                case self::STATUS_NOT_VERIFIED:
                default:
                    $summary['not_verified']++;
                    break;
            }
        }

        return [
            'success' => true,
            'summary' => $summary,
            'skills' => $audits
        ];
    }
}
