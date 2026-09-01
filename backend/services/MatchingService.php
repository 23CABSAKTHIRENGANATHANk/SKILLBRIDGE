<?php
declare(strict_types=1);

/**
 * Skill Matching Engine
 * Computes deterministic match scores and identifies matched & missing skill gaps.
 */
class MatchingService {
    /**
     * Compare a candidate's skills against job required skills
     *
     * @param string[] $studentSkills List of student skills (e.g. ['React', 'TypeScript', 'PHP'])
     * @param string[] $jobSkills     List of job required skills (e.g. ['React', 'TypeScript', 'AWS'])
     * @return array{score: int, matched: string[], missing: string[]}
     */
    public static function calculateMatch(array $studentSkills, array $jobSkills): array {
        if (empty($jobSkills)) {
            return [
                'score' => 100,
                'matched' => $studentSkills,
                'missing' => []
            ];
        }

        // Normalize skills for case-insensitive matching
        $studentMap = [];
        foreach ($studentSkills as $skill) {
            $studentMap[strtolower(trim($skill))] = trim($skill);
        }

        $matched = [];
        $missing = [];

        foreach ($jobSkills as $jobSkill) {
            $cleanJobSkill = trim($jobSkill);
            $normalized = strtolower($cleanJobSkill);

            if (isset($studentMap[$normalized])) {
                $matched[] = $studentMap[$normalized];
            } else {
                $missing[] = $cleanJobSkill;
            }
        }

        $totalRequired = count($jobSkills);
        $totalMatched = count($matched);

        $score = (int)round(($totalMatched / $totalRequired) * 100);

        return [
            'score' => $score,
            'matched' => array_values($matched),
            'missing' => array_values($missing)
        ];
    }
}
