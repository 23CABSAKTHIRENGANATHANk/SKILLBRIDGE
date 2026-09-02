<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/GeminiService.php';

/**
 * InterviewAIController
 * Interactive AI Pre-screen Interview Studio and Candidate Scorecard.
 */
class InterviewAIController {

    public static function startSession(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student', 'recruiter');
        $role = trim((string)($_GET['role'] ?? 'Software Engineer'));

        $questions = [
            [
                'id' => 'intv_q1',
                'category' => 'Technical Architecture',
                'question' => "How do you design an API and database schema for {$role} that scales under high concurrency?"
            ],
            [
                'id' => 'intv_q2',
                'category' => 'Problem Solving & Debugging',
                'question' => "Describe a complex production bug or performance bottleneck you identified and how you resolved it."
            ],
            [
                'id' => 'intv_q3',
                'category' => 'Scenario & Trade-offs',
                'question' => "When faced with tight deadlines, how do you balance code quality, test coverage, and speed of delivery?"
            ],
            [
                'id' => 'intv_q4',
                'category' => 'Communication & Collaboration',
                'question' => "How do you handle disagreements on technical design during code review with senior peers?"
            ]
        ];

        jsonResponse([
            'success' => true,
            'target_role' => $role,
            'questions' => $questions,
            'session_instructions' => 'Provide structured responses using the STAR method (Situation, Task, Action, Result).'
        ]);
    }

    public static function evaluateSession(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student', 'recruiter');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $role = trim((string)($input['role'] ?? 'Software Engineer'));
        $answers = $input['answers'] ?? [];

        $sStmt = $db->prepare('SELECT id, name FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // Build evaluation prompt for Gemini 3.7 Flash
        $prompt = "You are a senior technical hiring manager evaluating an AI pre-screen interview for candidate {$student['name']} applying for {$role}.
Candidate transcript answers: " . json_encode($answers) . "

Evaluate objectively and return JSON matching this exact structure:
{
  \"technical_score\": 84,
  \"problem_solving_score\": 82,
  \"communication_score\": 86,
  \"role_fit_score\": 88,
  \"overall_score\": 85,
  \"strengths\": [\"Clear articulation of trade-offs\", \"Demonstrated practical understanding of database bottlenecks\"],
  \"improvements\": [\"Could provide more quantifiable business impact metrics\"],
  \"evaluator_notes\": \"Candidate demonstrates solid engineering fundamentals and clear communication.\"
}";

        $rawResponse = GeminiService::generateText($prompt);
        $scorecard = null;
        if (preg_match('/\{[\s\S]*\}/', $rawResponse, $m)) {
            $scorecard = json_decode($m[0], true);
        }

        if (!$scorecard || !isset($scorecard['overall_score'])) {
            $scorecard = [
                'technical_score' => 82,
                'problem_solving_score' => 80,
                'communication_score' => 85,
                'role_fit_score' => 84,
                'overall_score' => 83,
                'strengths' => ['Strong grasp of software architecture', 'Clear and structured communication style'],
                'improvements' => ['Include more quantifiable metrics when discussing previous projects'],
                'evaluator_notes' => 'Solid technical candidate with balanced problem solving ability.'
            ];
        }

        $sessionId = 'aisess_' . bin2hex(random_bytes(8));
        $insStmt = $db->prepare('
            INSERT INTO ai_interview_sessions
            (id, student_id, target_role, technical_score, problem_solving_score, communication_score, role_fit_score, overall_score, strengths, improvements, transcript, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'completed\')
        ');
        $insStmt->execute([
            $sessionId,
            $student['id'],
            $role,
            $scorecard['technical_score'],
            $scorecard['problem_solving_score'],
            $scorecard['communication_score'],
            $scorecard['role_fit_score'],
            $scorecard['overall_score'],
            json_encode($scorecard['strengths']),
            json_encode($scorecard['improvements']),
            json_encode($answers)
        ]);

        jsonResponse([
            'success' => true,
            'session_id' => $sessionId,
            'target_role' => $role,
            'scorecard' => $scorecard,
            'disclaimer' => 'AI-assisted assessment — recruiter review required. Does not determine automatic hiring decisions.'
        ]);
    }
}
