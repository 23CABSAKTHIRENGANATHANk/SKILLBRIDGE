<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/ProofOfSkillService.php';
require_once __DIR__ . '/../services/SkillVerificationService.php';
require_once __DIR__ . '/../services/SkillIntegrityService.php';

/**
 * AssessmentController
 * Generates technical skill assessments and executes deterministic scoring.
 */
class AssessmentController {

    private const QUESTION_BANKS = [
        'react' => [
            [
                'id' => 'q1',
                'category' => 'conceptual',
                'question' => 'How does React Virtual DOM reconciliation determine component re-renders?',
                'options' => [
                    'A' => 'By diffing fiber trees using element types and key props',
                    'B' => 'By reloading the browser window on state changes',
                    'C' => 'By converting JSX directly into jQuery DOM selectors',
                    'D' => 'By storing all state inside the browser localStorage'
                ],
                'correct' => 'A',
                'explanation' => 'React diffs the current and work-in-progress Fiber trees using component types and stable keys.'
            ],
            [
                'id' => 'q2',
                'category' => 'practical',
                'question' => 'When using useEffect to subscribe to an event listener, what must the cleanup function return?',
                'options' => [
                    'A' => 'A callback function that removes the attached event listener',
                    'B' => 'A boolean true value',
                    'C' => 'The JSX representation of the component',
                    'D' => 'A promise resolving to null'
                ],
                'correct' => 'A',
                'explanation' => 'Returning a cleanup function prevents memory leaks by detaching the event listener on unmount.'
            ],
            [
                'id' => 'q3',
                'category' => 'debugging',
                'question' => 'What causes the error: "Cannot update a component while rendering a different component"?',
                'options' => [
                    'A' => 'Calling a parent state setter directly inside a child render body instead of an effect or handler',
                    'B' => 'Using TypeScript strict mode in development',
                    'C' => 'Importing React from the wrong package path',
                    'D' => 'Having more than 3 props passed to a component'
                ],
                'correct' => 'A',
                'explanation' => 'Triggering state transitions synchronously during the render phase causes side-effects during render.'
            ],
            [
                'id' => 'q4',
                'category' => 'scenario',
                'question' => 'For optimizing high-frequency re-rendering of a list with 1,000 items, which pattern is most effective?',
                'options' => [
                    'A' => 'Windowing/virtualization (e.g., TanStack Virtual) with memoized list row items',
                    'B' => 'Storing all 1,000 items in global Redux store without selectors',
                    'C' => 'Using inline anonymous arrow functions for all item onClick handlers',
                    'D' => 'Disabling React Keys on list elements'
                ],
                'correct' => 'A',
                'explanation' => 'Virtualization only renders items currently inside the visible viewport, saving memory and DOM nodes.'
            ]
        ],
        'typescript' => [
            [
                'id' => 'q1',
                'category' => 'conceptual',
                'question' => 'What is the key difference between type and interface in TypeScript?',
                'options' => [
                    'A' => 'Interfaces support declaration merging, while types can represent unions and primitives',
                    'B' => 'Interfaces are only available at runtime in JavaScript',
                    'C' => 'Types cannot be exported or imported across modules',
                    'D' => 'Interfaces cannot declare object properties'
                ],
                'correct' => 'A',
                'explanation' => 'Interfaces can be merged with subsequent declarations; type aliases support union and tuple expressions.'
            ],
            [
                'id' => 'q2',
                'category' => 'practical',
                'question' => 'Which utility type constructs a type with all properties of T set to optional?',
                'options' => [
                    'A' => 'Partial<T>',
                    'B' => 'Required<T>',
                    'C' => 'Pick<T, K>',
                    'D' => 'Omit<T, K>'
                ],
                'correct' => 'A',
                'explanation' => 'Partial<T> wraps every property key of T with the optional modifier (?).'
            ],
            [
                'id' => 'q3',
                'category' => 'debugging',
                'question' => 'Why does TypeScript emit "Property does not exist on type unknown"?',
                'options' => [
                    'A' => 'Because unknown is type-safe and requires type narrowing before property access',
                    'B' => 'Because unknown only accepts null and undefined',
                    'C' => 'Because unknown was deprecated in TypeScript 4',
                    'D' => 'Because the variable was declared as any'
                ],
                'correct' => 'A',
                'explanation' => 'unknown forces the developer to perform typeof, instanceof, or custom type guard checks before accessing members.'
            ],
            [
                'id' => 'q4',
                'category' => 'scenario',
                'question' => 'How can you enforce that an object parameter matches specific keys while preserving exact literal types without widening?',
                'options' => [
                    'A' => 'Using const type parameters or "satisfies" operator',
                    'B' => 'Casting everything as any',
                    'C' => 'Using string indexing without type annotations',
                    'D' => 'Converting all properties to numbers'
                ],
                'correct' => 'A',
                'explanation' => 'The satisfies operator validates that an expression matches a type without mutating the resulting type signature.'
            ]
        ],
        'python' => [
            [
                'id' => 'q1',
                'category' => 'conceptual',
                'question' => 'How does Python\'s Global Interpreter Lock (GIL) affect multithreading in CPython?',
                'options' => [
                    'A' => 'Only one native thread can execute Python bytecode at a time per process',
                    'B' => 'It completely prevents all asynchronous network requests',
                    'C' => 'It automatically speeds up multi-core CPU matrix computations',
                    'D' => 'It converts Python into compiled C++ binary at startup'
                ],
                'correct' => 'A',
                'explanation' => 'The GIL synchronizes thread access to Python objects, preventing multi-threaded CPU parallel execution in standard CPython.'
            ],
            [
                'id' => 'q2',
                'category' => 'practical',
                'question' => 'What is the purpose of Python generators and the "yield" keyword?',
                'options' => [
                    'A' => 'To produce values lazily on demand without allocating the full dataset in memory',
                    'B' => 'To terminate the entire program execution immediately',
                    'C' => 'To encrypt string variables with AES-256',
                    'D' => 'To define static class constructors'
                ],
                'correct' => 'A',
                'explanation' => 'Generators maintain internal execution state and yield items sequentially, optimizing memory consumption.'
            ],
            [
                'id' => 'q3',
                'category' => 'debugging',
                'question' => 'Why is passing a mutable default argument (like def func(items=[])) problematic in Python?',
                'options' => [
                    'A' => 'The list is instantiated once at definition time and shared across subsequent function calls',
                    'B' => 'Python raises a SyntaxError during execution',
                    'C' => 'The list will automatically delete itself after 1 call',
                    'D' => 'Lists cannot be passed into functions'
                ],
                'correct' => 'A',
                'explanation' => 'Default arguments are evaluated once when the function definition is executed, leading to state persistence bugs.'
            ],
            [
                'id' => 'q4',
                'category' => 'scenario',
                'question' => 'When building a high-concurrency I/O bound web scraper, which approach yields optimal performance?',
                'options' => [
                    'A' => 'asyncio with an async HTTP client (like httpx or aiohttp)',
                    'B' => 'Synchronous time.sleep() loops on a single thread',
                    'C' => 'Running multiple infinite while loops without event loops',
                    'D' => 'Using recursive function calls without base cases'
                ],
                'correct' => 'A',
                'explanation' => 'Asynchronous event loops multiplex thousands of concurrent non-blocking socket connections efficiently.'
            ]
        ]
    ];

    /**
     * Generate assessment questions for a skill
     */
    public static function getAssessment(array $currentUser, string $skillName): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $norm = strtolower(trim($skillName));

        // Use custom bank if available, or generate standard curated engineering questions
        $questions = self::QUESTION_BANKS[$norm] ?? [
            [
                'id' => 'q1',
                'category' => 'conceptual',
                'question' => "What core architectural principle defines robust development in {$skillName}?",
                'options' => [
                    'A' => 'Separation of concerns, modularity, and predictable state management',
                    'B' => 'Putting all logic in a single file without abstractions',
                    'C' => 'Hardcoding configuration credentials directly in source files',
                    'D' => 'Disabling compiler errors and runtime validations'
                ],
                'correct' => 'A',
                'explanation' => 'Modular architectures ensure testability, scalability, and long-term maintenance.'
            ],
            [
                'id' => 'q2',
                'category' => 'practical',
                'question' => "When optimizing runtime performance in {$skillName}, which pattern is standard practice?",
                'options' => [
                    'A' => 'Profiling bottlenecks, caching repetitive operations, and minimizing I/O latency',
                    'B' => 'Allocating unbounded memory buffers on every request',
                    'C' => 'Ignoring database indexing and connection pooling',
                    'D' => 'Spawning unmonitored background threads without cleanup'
                ],
                'correct' => 'A',
                'explanation' => 'Performance optimization focuses on profiling, algorithmic complexity, and efficient resource reuse.'
            ],
            [
                'id' => 'q3',
                'category' => 'debugging',
                'question' => "What is the recommended diagnostic step when encountering unhandled exceptions in {$skillName}?",
                'options' => [
                    'A' => 'Inspecting stack traces, checking boundaries, and validating input sanitization',
                    'B' => 'Deleting the database schema completely',
                    'C' => 'Suppressing errors with empty catch blocks without logging',
                    'D' => 'Restarting the computer repeatedly'
                ],
                'correct' => 'A',
                'explanation' => 'Stack traces and structured error logs pinpoints the failure root cause precisely.'
            ],
            [
                'id' => 'q4',
                'category' => 'scenario',
                'question' => "In an enterprise environment using {$skillName}, how do you ensure zero-downtime reliability?",
                'options' => [
                    'A' => 'Automated CI/CD pipelines, health check probes, and blue-green or rolling deployments',
                    'B' => 'Editing live production files directly on the server via FTP',
                    'C' => 'Deploying code on Friday night without regression test verification',
                    'D' => 'Running without backup snapshots'
                ],
                'correct' => 'A',
                'explanation' => 'Continuous integration and health-checked rolling deployments prevent production outages.'
            ]
        ];

        // Strip correct answer before sending to frontend
        $safeQuestions = array_map(function($q) {
            return [
                'id' => $q['id'],
                'category' => $q['category'],
                'question' => $q['question'],
                'options' => $q['options']
            ];
        }, $questions);

        jsonResponse([
            'success' => true,
            'skill_name' => $skillName,
            'total_questions' => count($safeQuestions),
            'questions' => $safeQuestions
        ]);
    }

    /**
     * Submit assessment answers, compute deterministic score, and record evidence
     */
    public static function submitAssessment(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $skillName = trim((string)($input['skill_name'] ?? ''));
        $answers = $input['answers'] ?? [];

        if (empty($skillName)) {
            errorResponse('Skill name is required.');
        }

        if (!is_array($answers)) {
            errorResponse('Answers must be provided as an object.');
        }

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // Skill entity
        $norm = strtolower($skillName);
        $skStmt = $db->prepare('SELECT id, name FROM skills WHERE normalized_name = ? LIMIT 1');
        $skStmt->execute([$norm]);
        $skill = $skStmt->fetch();

        if (!$skill) {
            $skillId = 'sk_' . bin2hex(random_bytes(6));
            $insSk = $db->prepare('INSERT INTO skills (id, name, normalized_name) VALUES (?, ?, ?)');
            $insSk->execute([$skillId, $skillName, $norm]);
        } else {
            $skillId = $skill['id'];
        }

        $bank = self::QUESTION_BANKS[$norm] ?? [
            ['id' => 'q1', 'correct' => 'A', 'category' => 'conceptual'],
            ['id' => 'q2', 'correct' => 'A', 'category' => 'practical'],
            ['id' => 'q3', 'correct' => 'A', 'category' => 'debugging'],
            ['id' => 'q4', 'correct' => 'A', 'category' => 'scenario'],
        ];

        $requiredQuestionIds = array_column($bank, 'id');
        if (count(array_intersect($requiredQuestionIds, array_keys($answers))) !== count($requiredQuestionIds)) {
            errorResponse('All assessment questions must be answered before submission.');
        }

        $correctCount = 0;
        $categoryScores = ['conceptual' => 0, 'practical' => 0, 'debugging' => 0, 'scenario' => 0];

        foreach ($bank as $q) {
            $userAns = $answers[$q['id']] ?? '';
            if (strtoupper((string)$userAns) === $q['correct']) {
                $correctCount++;
                $categoryScores[$q['category']] = 100;
            }
        }

        $totalQuestions = count($bank);
        $overallScore = (int)round(($correctCount / max(1, $totalQuestions)) * 100);
        $level = $overallScore >= 85 ? 'expert' : ($overallScore >= 65 ? 'advanced' : ($overallScore >= 40 ? 'intermediate' : 'beginner'));

        $assessmentId = 'sa_' . bin2hex(random_bytes(8));
        $asIns = $db->prepare('
            INSERT INTO skill_assessments 
            (id, student_id, skill_id, score, level, knowledge_score, problem_solving_score, practical_score, evaluation_summary, questions_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $summary = "Completed verified {$skillName} technical assessment with {$overallScore}% accuracy.";
        $asIns->execute([
            $assessmentId,
            $student['id'],
            $skillId,
            $overallScore,
            $level,
            $categoryScores['conceptual'],
            $categoryScores['problem_solving'] ?? $categoryScores['debugging'],
            $categoryScores['practical'],
            $summary,
            json_encode($answers)
        ]);

        // Record or update skill evidence
        $evIns = $db->prepare('
            INSERT INTO skill_evidence (id, student_id, skill_id, source, confidence, metadata, verified_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, skill_id, source) 
            DO UPDATE SET confidence = EXCLUDED.confidence, verified_at = CURRENT_TIMESTAMP, metadata = EXCLUDED.metadata
        ');
        $evIns->execute([
            'ev_' . bin2hex(random_bytes(8)),
            $student['id'],
            $skillId,
            'assessment',
            $overallScore,
            json_encode(['assessment_id' => $assessmentId, 'level' => $level, 'score' => $overallScore])
        ]);

        // Ensure skill is registered in student_skills
        $ssCheck = $db->prepare('SELECT id FROM student_skills WHERE student_id = ? AND skill_id = ?');
        $ssCheck->execute([$student['id'], $skillId]);
        if ($ssCheck->fetch()) {
            $upSs = $db->prepare('UPDATE student_skills SET proficiency = ? WHERE student_id = ? AND skill_id = ?');
            $upSs->execute([$level, $student['id'], $skillId]);
        } else {
            $insSs = $db->prepare('INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES (?, ?, ?)');
            $insSs->execute([$student['id'], $skillId, $level]);
        }

        // Return recalculated proof of skill
        $skillsProof = ProofOfSkillService::getStudentSkillsWithProof($student['id']);

        jsonResponse([
            'success' => true,
            'message' => "Assessment completed! Score: {$overallScore}% ({$level})",
            'result' => [
                'assessment_id' => $assessmentId,
                'skill_name' => $skillName,
                'score' => $overallScore,
                'level' => $level,
                'knowledge_score' => $categoryScores['conceptual'],
                'problem_solving_score' => $categoryScores['debugging'],
                'practical_score' => $categoryScores['practical'],
                'summary' => $summary
            ],
            'updated_skills' => $skillsProof
        ]);
    }

    // ============================================================
    // SKILLBRIDGE 2.0 PHASE 1: AI SKILL VERIFICATION 2.0 & INTEGRITY
    // ============================================================

    /**
     * Helper to resolve student profile from JWT user.
     */
    private static function resolveStudent(array $currentUser): array {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id FROM students WHERE user_id = ? LIMIT 1');
        $stmt->execute([$currentUser['user_id']]);
        $student = $stmt->fetch();
        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }
        return $student;
    }

    /**
     * Start a new skill verification session.
     * POST /student/skill-verifications/start
     * Body: { "skill_name": "Python", "requested_level": "intermediate" }
     */
    public static function startVerification(array $currentUser): void {
        $student = self::resolveStudent($currentUser);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $skillName = trim((string)($input['skill_name'] ?? ''));
        $requestedLevel = strtolower(trim((string)($input['requested_level'] ?? 'intermediate')));

        if (empty($skillName)) {
            errorResponse('Skill name is required.');
        }

        try {
            $session = SkillVerificationService::startVerification($student['id'], $skillName, $requestedLevel);
            jsonResponse($session);
        } catch (\Throwable $e) {
            errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get active question for an ongoing verification attempt.
     * GET /student/skill-verifications/{id}/question?index=0
     */
    public static function getCurrentQuestion(array $currentUser, string $attemptId): void {
        $student = self::resolveStudent($currentUser);
        $qIndex = isset($_GET['index']) ? (int)$_GET['index'] : null;

        try {
            $question = SkillVerificationService::getQuestion($student['id'], $attemptId, $qIndex);
            jsonResponse($question);
        } catch (\Throwable $e) {
            errorResponse($e->getMessage(), 404);
        }
    }

    /**
     * Submit an answer to a question in a verification attempt.
     * POST /student/skill-verifications/{id}/answer
     * Body: { "question_id": "svq_...", "answer": "B" }
     */
    public static function submitAnswer(array $currentUser, string $attemptId): void {
        $student = self::resolveStudent($currentUser);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $questionId = trim((string)($input['question_id'] ?? ''));
        $answer = trim((string)($input['answer'] ?? ($input['selected_option'] ?? '')));

        if (empty($questionId) || empty($answer)) {
            errorResponse('Both question_id and answer are required.');
        }

        try {
            $result = SkillVerificationService::submitAnswer($student['id'], $attemptId, $questionId, $answer);
            jsonResponse($result);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            $status = str_contains(strtolower($msg), 'unauthorized') ? 403 : (str_contains(strtolower($msg), 'not found') ? 404 : 400);
            errorResponse($msg, $status);
        }
    }

    /**
     * Finalize the verification attempt and calculate deterministic scores.
     * POST /student/skill-verifications/{id}/complete
     */
    public static function completeVerification(array $currentUser, string $attemptId): void {
        $student = self::resolveStudent($currentUser);

        try {
            $result = SkillVerificationService::completeVerification($student['id'], $attemptId);
            jsonResponse($result);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            $status = str_contains(strtolower($msg), 'unauthorized') ? 403 : (str_contains(strtolower($msg), 'not found') ? 404 : 400);
            errorResponse($msg, $status);
        }
    }

    /**
     * Retrieve all verification attempt history for the student.
     * GET /student/skill-verifications
     */
    public static function getVerificationHistory(array $currentUser): void {
        $student = self::resolveStudent($currentUser);
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT a.id, a.requested_level, a.difficulty, a.status, a.score,
                   a.verified_level, a.confidence, a.passed, a.attempt_number,
                   a.breakdown, a.started_at, a.completed_at,
                   s.name as skill_name, s.id as skill_id
            FROM skill_verification_attempts a
            JOIN skills s ON a.skill_id = s.id
            WHERE a.student_id = ?
            ORDER BY a.started_at DESC
        ');
        $stmt->execute([$student['id']]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['breakdown'] = is_string($r['breakdown']) ? json_decode($r['breakdown'], true) : $r['breakdown'];
            $r['passed'] = (bool)$r['passed'];
            $r['score'] = (float)$r['score'];
            $r['confidence'] = (float)$r['confidence'];
        }

        jsonResponse([
            'success' => true,
            'count' => count($rows),
            'attempts' => $rows
        ]);
    }

    /**
     * Retrieve complete multi-source skill integrity audit.
     * GET /student/skill-integrity
     */
    public static function getSkillIntegrity(array $currentUser): void {
        $student = self::resolveStudent($currentUser);

        try {
            $audit = SkillIntegrityService::auditAllStudentSkills($student['id']);
            jsonResponse($audit);
        } catch (\Throwable $e) {
            errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Retrieve or refresh integrity audit for a specific skill.
     * GET /student/skill-integrity/{skillId}
     */
    public static function getSingleSkillIntegrity(array $currentUser, string $skillId): void {
        $student = self::resolveStudent($currentUser);

        try {
            $audit = SkillIntegrityService::auditStudentSkill($student['id'], $skillId);
            jsonResponse([
                'success' => true,
                'skill' => $audit
            ]);
        } catch (\Throwable $e) {
            errorResponse($e->getMessage(), 404);
        }
    }
}
