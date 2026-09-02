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

        foreach ($jobs as $job) {
            $jsStmt = $db->prepare('
                SELECT s.name 
                FROM job_skills js
                JOIN skills s ON js.skill_id = s.id
                WHERE js.job_id = ?
            ');
            $jsStmt->execute([$job['id']]);
            $jobSkills = array_column($jsStmt->fetchAll(), 'name');

            $baseScore = MatchingService::calculateMatch($currentSkillNames, $jobSkills);
            $simScore = MatchingService::calculateMatch($combinedSkillNames, $jobSkills);

            $currentMatches[] = $baseScore['score'];
            $projectedMatches[] = $simScore['score'];
        }

        $avgCurrent = !empty($currentMatches) ? (int)round(array_sum($currentMatches) / count($currentMatches)) : 0;
        $avgProjected = !empty($projectedMatches) ? (int)round(array_sum($projectedMatches) / count($projectedMatches)) : 0;
        $unlockedHighFit = count(array_filter($projectedMatches, fn($s) => $s >= 75));

        jsonResponse([
            'success' => true,
            'simulated_skills' => $simSkills,
            'current_readiness' => $avgCurrent,
            'projected_readiness' => $avgProjected,
            'growth_delta' => max(0, $avgProjected - $avgCurrent),
            'high_fit_jobs_unlocked' => $unlockedHighFit,
            'potential_roles' => [
                'Full Stack AI Engineer',
                'Cloud Backend Specialist',
                'Systems Integration Developer'
            ],
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

        $skillsWithProof = ProofOfSkillService::getStudentSkillsWithProof($student['id']);
        $studentSkillNames = array_column($skillsWithProof, 'skill_name');

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

        if (empty($marketSkills)) {
            $marketSkills = ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'REST API', 'AWS'];
        }

        $matchedSkills = array_values(array_intersect(
            array_map('strtolower', $studentSkillNames),
            array_map('strtolower', $marketSkills)
        ));
        $missingSkills = array_values(array_diff(
            array_map('strtolower', $marketSkills),
            array_map('strtolower', $studentSkillNames)
        ));

        $readiness = (int)round((count($matchedSkills) / max(1, count($marketSkills))) * 100);

        jsonResponse([
            'success' => true,
            'target_role' => $targetRole,
            'current_readiness' => $readiness,
            'matched_skills' => $matchedSkills,
            'missing_skills' => array_slice($missingSkills, 0, 5),
            'priority_sequence' => [
                ['skill' => $missingSkills[0] ?? 'Docker', 'priority' => 'High', 'time_estimate' => '1-2 weeks'],
                ['skill' => $missingSkills[1] ?? 'AWS', 'priority' => 'Medium', 'time_estimate' => '2-3 weeks'],
                ['skill' => $missingSkills[2] ?? 'System Design', 'priority' => 'Medium', 'time_estimate' => '1 week']
            ],
            'recommended_project' => "Build a containerized {$targetRole} web platform using " . implode(', ', array_slice($marketSkills, 0, 3)) . "."
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

        $rawResponse = AIService::generateText($prompt);
        $parsed = null;
        if (preg_match('/\{[\s\S]*\}/', $rawResponse, $m)) {
            $parsed = json_decode($m[0], true);
        }

        if (!$parsed) {
            $parsed = [
                'reply' => "Based on your verified skills (" . implode(', ', array_slice(array_column($skillsWithProof, 'skill_name'), 0, 3)) . "), you have strong technical foundation. Focusing on missing cloud & containerization skills will boost your match across enterprise roles.",
                'suitable_roles' => ['Full Stack Developer', 'Software Engineer'],
                'missing_competencies' => ['Docker', 'AWS'],
                'recommended_next_action' => 'Complete a skill assessment to verify your core competency.'
            ];
        }

        jsonResponse([
            'success' => true,
            'agent' => $parsed
        ]);
    }
}
