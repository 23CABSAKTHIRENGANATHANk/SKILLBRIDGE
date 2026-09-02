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

            $results[] = [
                'skill_id'        => $sId,
                'skill_name'      => $sk['skill_name'],
                'proficiency'     => $sk['proficiency'],
                'confidence_score'=> $totalScore,
                'confidence_level'=> $confidenceLabel,
                'is_verified'     => $totalScore >= 50,
                'evidence'        => [
                    'self_declared'    => $hasSelf,
                    'resume_evidence'  => $hasResume,
                    'project_evidence' => $hasProject,
                    'assessment'       => $hasAssessment,
                    'assessment_score' => $assessmentScore,
                    'github_evidence'  => $hasGithub,
                ],
                'assessment_details' => $assessmentMap[$sId] ?? null
            ];
        }

        return $results;
    }
}
