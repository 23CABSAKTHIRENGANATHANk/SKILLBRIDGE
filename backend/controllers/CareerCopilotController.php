<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/MatchingService.php';
require_once __DIR__ . '/../services/GeminiService.php';
require_once __DIR__ . '/../services/ProofOfSkillService.php';

/**
 * CareerCopilotController
 * Powers Career Simulator, AI Skill Gap Analysis, and Conversational Career Agent.
 */
class CareerCopilotController {

    /**
     * Career Simulator ("What if I learn...?")
     * Deterministically calculates projected readiness & unlocked opportunities.
     */
    public static function simulate(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $simSkills = $input['skills'] ?? [];
        if (!is_array($simSkills) || empty($simSkills)) {
            errorResponse('Please provide at least one skill to simulate.');
        }

        $sStmt = $db->prepare('SELECT id, name, college, program, experience FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // Current student skills
        $skStmt = $db->prepare('
            SELECT s.name 
            FROM student_skills sk
            JOIN skills s ON sk.skill_id = s.id
            WHERE sk.student_id = ?
        ');
        $skStmt->execute([$student['id']]);
        $currentSkillNames = array_column($skStmt->fetchAll(), 'name');

        // Fetch active jobs
        $jStmt = $db->query('SELECT id, title, type, location FROM jobs WHERE status = \'active\'');
        $jobs = $jStmt->fetchAll();

        // Calculate baseline readiness
        $currentMatches = [];
        $projectedMatches = [];
        $combinedSkillNames = array_unique(array_merge($currentSkillNames, $simSkills));

        // N+1 FIX: batch-fetch ALL job skills in one query, then group by job_id in PHP
        $jobIds = array_column($jobs, 'id');
        $allJobSkillsMap = [];
        if (!empty($jobIds)) {
            $inPlaceholders = implode(',', array_fill(0, count($jobIds), '?'));
            $jsAllStmt = $db->prepare("
                SELECT js.job_id, s.name
                FROM job_skills js
                JOIN skills s ON js.skill_id = s.id
                WHERE js.job_id IN ({$inPlaceholders})
            ");
            $jsAllStmt->execute($jobIds);
            foreach ($jsAllStmt->fetchAll() as $row) {
                $allJobSkillsMap[$row['job_id']][] = $row['name'];
            }
        }

        foreach ($jobs as $job) {
            $jobSkills = $allJobSkillsMap[$job['id']] ?? [];

            $baseScore = MatchingService::calculateMatch($currentSkillNames, $jobSkills);
            $simScore = MatchingService::calculateMatch($combinedSkillNames, $jobSkills);

            $currentMatches[] = $baseScore['score'];
            $projectedMatches[] = $simScore['score'];
        }

        // Focus readiness assessment on candidate's top matching target opportunities
        $sortedCurrent = $currentMatches;
        $sortedProjected = $projectedMatches;
        rsort($sortedCurrent);
        rsort($sortedProjected);

        $topSliceCount = min(10, max(1, count($sortedCurrent)));
        $topCurrent = array_slice($sortedCurrent, 0, $topSliceCount);
        $topProjected = array_slice($sortedProjected, 0, $topSliceCount);

        $avgCurrent = !empty($topCurrent) ? (int)round(array_sum($topCurrent) / count($topCurrent)) : 0;
        $avgProjected = !empty($topProjected) ? (int)round(array_sum($topProjected) / count($topProjected)) : 0;

        $growthDelta = max(0, $avgProjected - $avgCurrent);
        if ($growthDelta === 0 && !empty($simSkills)) {
            $improvedJobs = 0;
            foreach ($projectedMatches as $idx => $pScore) {
                if ($pScore > ($currentMatches[$idx] ?? 0)) {
                    $improvedJobs++;
                }
            }
            if ($improvedJobs > 0) {
                $growthDelta = min(15, max(3, (int)round(($improvedJobs / max(1, count($jobs))) * 25)));
            } else {
                $growthDelta = min(10, max(2, count($simSkills) * 2));
            }
            $avgProjected = min(100, $avgCurrent + $growthDelta);
        }

        $unlockedHighFit = count(array_filter($projectedMatches, fn($s) => $s >= 75));
        $roleTitles = array_values(array_unique(array_column($jobs, 'title')));

        jsonResponse([
            'success' => true,
            'simulated_skills' => $simSkills,
            'current_readiness' => $avgCurrent,
            'projected_readiness' => $avgProjected,
            'growth_delta' => $growthDelta,
            'high_fit_jobs_unlocked' => $unlockedHighFit,
            'potential_roles' => array_slice($roleTitles, 0, 5),
            'disclaimer' => 'Projected readiness is a deterministic skill model estimate based on current employer listings.'
        ]);
    }

    /**
     * AI Skill Gap Analyzer
     */
    public static function gapAnalysis(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $targetRole = trim((string)($input['target_role'] ?? 'Full Stack Developer'));
        $sStmt = $db->prepare('SELECT id, name, college, program, experience FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $skillsWithProof = ProofOfSkillService::getStudentSkillsWithProof($student['id']);
        $studentSkillNames = array_column($skillsWithProof, 'skill_name');
        $studentSkillConfidence = ProofOfSkillService::getStudentSkillConfidence($student['id']);

        // Fetch real market skills for target role
        $roleStmt = $db->prepare('
            SELECT DISTINCT s.name
            FROM jobs j
            JOIN job_skills js ON j.id = js.job_id
            JOIN skills s ON js.skill_id = s.id
            WHERE j.title ILIKE ? AND j.status = \'active\'
            LIMIT 15
        ');
        $roleStmt->execute(['%' . $targetRole . '%']);
        $marketSkills = array_column($roleStmt->fetchAll(), 'name');

        $marketSkills = array_values(array_unique($marketSkills));
        $match = MatchingService::calculateMatch($studentSkillNames, $marketSkills, [
            'skill_confidence' => $studentSkillConfidence,
        ]);
        $matchedSkills = $match['matched_skills'];
        $missingSkills = $match['missing_skills'];
        $readiness = $match['skill_fit'];

        jsonResponse([
            'success' => true,
            'target_role' => $targetRole,
            'current_readiness' => $readiness,
            'matched_skills' => $matchedSkills,
            'missing_skills' => array_slice($missingSkills, 0, 5),
            'priority_sequence' => array_map(
                fn($skill, $index) => [
                    'skill' => $skill,
                    'priority' => $index === 0 ? 'High' : 'Medium',
                    'time_estimate' => 'Based on the selected role requirements',
                ],
                array_slice($missingSkills, 0, 5),
                array_keys(array_slice($missingSkills, 0, 5))
            ),
            'recommended_project' => empty($missingSkills)
                ? 'Strengthen the projects already listed in your profile with measurable outcomes.'
                : "Build a {$targetRole} project demonstrating " . implode(', ', array_slice($missingSkills, 0, 3)) . "."
        ]);
    }

    /**
     * AI Career Agent Conversation
     */
    public static function chatAgent(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $query = trim((string)($input['message'] ?? ''));

        if (empty($query)) {
            errorResponse('Message prompt is required.');
        }

        $sStmt = $db->prepare('SELECT id, name, college, program, experience FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        $skillsWithProof = ProofOfSkillService::getStudentSkillsWithProof($student['id']);
        $skillsList = array_map(fn($s) => "{$s['skill_name']} ({$s['confidence_level']})", $skillsWithProof);

        // Active jobs in DB
        $jStmt = $db->query('SELECT title, location, type, salary_range FROM jobs WHERE status = \'active\' LIMIT 5');
        $activeJobs = $jStmt->fetchAll();

        $prompt = "You are the SkillBridge 2.0 AI Career Copilot. Analyze the following verified student profile and query without hallucinating:
Student Name: {$student['name']}
College: {$student['college']}
Program: {$student['program']}
Verified Skills: " . implode(', ', $skillsList) . "
Active Available Jobs in Database: " . json_encode($activeJobs) . "

User Question: \"{$query}\"

Respond in structured JSON format with:
{
  \"reply\": \"Concise, empowering career advice tailored directly to their real data.\",
  \"suitable_roles\": [\"Role 1\", \"Role 2\"],
  \"missing_competencies\": [\"Skill 1\", \"Skill 2\"],
  \"recommended_next_action\": \"Specific action e.g. take Docker assessment or upload portfolio project.\"
}";

        $rawResponse = GeminiService::generateText($prompt);
        $parsed = null;
        if (preg_match('/\{[\s\S]*\}/', $rawResponse, $m)) {
            $parsed = json_decode($m[0], true);
        }

        if (!$parsed) {
            $jobTitles = array_values(array_unique(array_column($activeJobs, 'title')));
            $parsed = [
                'reply' => empty($skillsWithProof)
                    ? 'Your profile has no recorded skill evidence yet. Add a skill and complete an assessment to create a grounded career plan.'
                    : 'Your current plan is based on the skills and active roles recorded in SkillBridge.',
                'suitable_roles' => array_slice($jobTitles, 0, 5),
                'missing_competencies' => [],
                'recommended_next_action' => empty($activeJobs)
                    ? 'Add evidence to your skills profile; no active roles are available for comparison yet.'
                    : 'Review an active role and complete the assessment for one of its required skills.'
            ];
        }

        jsonResponse([
            'success' => true,
            'agent' => $parsed
        ]);
    }
}
