<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/GeminiService.php';
require_once __DIR__ . '/SkillIntegrityService.php';

class SkillVerificationService {

    public const CATEGORY_CONCEPTUAL = 'Conceptual Foundations';
    public const CATEGORY_PRACTICAL  = 'Practical Implementation';
    public const CATEGORY_DEBUGGING  = 'Debugging & Optimization';
    public const CATEGORY_SCENARIO   = 'Production Scenario';

    public const WEIGHTS = [
        self::CATEGORY_CONCEPTUAL => 0.20,
        self::CATEGORY_PRACTICAL  => 0.30,
        self::CATEGORY_DEBUGGING  => 0.25,
        self::CATEGORY_SCENARIO   => 0.25,
    ];

    /**
     * Standard Curated Question Banks for Core Industry Skills.
     */
    private const CURATED_BANKS = [
        'python' => [
            [
                'category' => self::CATEGORY_CONCEPTUAL,
                'type' => 'MCQ',
                'question' => 'How does Python handle memory management and avoid memory leaks for circular references?',
                'code_snippet' => null,
                'options' => [
                    'A' => 'Python relies solely on reference counting; circular references always cause memory leaks.',
                    'B' => 'Python combines reference counting with a generational cyclic garbage collector (gc module).',
                    'C' => 'Memory is allocated strictly on the stack and freed upon exiting function scopes.',
                    'D' => 'The Global Interpreter Lock (GIL) automatically purges cycles at the end of each bytecode epoch.'
                ],
                'expected' => 'B',
                'points' => 20
            ],
            [
                'category' => self::CATEGORY_PRACTICAL,
                'type' => 'PRACTICAL',
                'question' => 'Given a large stream of items, what is the most memory-efficient way to yield batches of size N?',
                'code_snippet' => "def batch_stream(iterable, n):\n    # Which implementation uses O(1) auxiliary memory?\n    pass",
                'options' => [
                    'A' => 'Convert iterable to a complete list and slice with [i:i+n].',
                    'B' => 'Use itertools.islice with an iterator in a while-loop generator.',
                    'C' => 'Recursively call the function appending to a global list.',
                    'D' => 'Serialize the items to a temporary JSON file and read line by line.'
                ],
                'expected' => 'B',
                'points' => 30
            ],
            [
                'category' => self::CATEGORY_DEBUGGING,
                'type' => 'DEBUGGING',
                'question' => 'Why does calling append_to() multiple times without arguments produce unexpected accumulating lists?',
                'code_snippet' => "def append_to(element, target_list=[]):\n    target_list.append(element)\n    return target_list",
                'options' => [
                    'A' => 'Python functions are executed in a single persistent thread by default.',
                    'B' => 'Default parameter values are evaluated once when the function definition is executed, not at each call.',
                    'C' => 'The target_list variable is automatically promoted to a global variable.',
                    'D' => 'Lists in Python are immutable unless explicitly cast with list().'
                ],
                'expected' => 'B',
                'points' => 25
            ],
            [
                'category' => self::CATEGORY_SCENARIO,
                'type' => 'SCENARIO',
                'question' => 'Your FastAPI application handles heavy CPU-bound image transformations along with high-concurrency I/O requests. How should you structure the architecture to prevent blocking the async event loop?',
                'code_snippet' => null,
                'options' => [
                    'A' => 'Run CPU-intensive tasks directly in async def endpoints without await.',
                    'B' => 'Offload CPU-heavy processing to a background Celery/Redis worker pool or ProcessPoolExecutor, keeping endpoint handlers lightweight.',
                    'C' => 'Disable the Python GIL using threading.Lock() across all endpoints.',
                    'D' => 'Increase the uvicorn worker count to 500 on a 2-core VM.'
                ],
                'expected' => 'B',
                'points' => 25
            ]
        ],
        'react' => [
            [
                'category' => self::CATEGORY_CONCEPTUAL,
                'type' => 'MCQ',
                'question' => 'How does React 19 / Fiber reconcile updates and prioritize concurrent renders?',
                'code_snippet' => null,
                'options' => [
                    'A' => 'Fiber splits rendering into interruptible units of work with lane-based priority scheduling.',
                    'B' => 'React directly mutates the browser DOM synchronously on every setState call.',
                    'C' => 'All re-renders wait for window.requestIdleCallback before evaluating JSX.',
                    'D' => 'Reconciliation is handled by a Web Worker that replaces the main UI thread.'
                ],
                'expected' => 'A',
                'points' => 20
            ],
            [
                'category' => self::CATEGORY_PRACTICAL,
                'type' => 'PRACTICAL',
                'question' => 'Which pattern correctly avoids unnecessary child re-renders when passing a callback prop?',
                'code_snippet' => "function Parent({ id }) {\n  const [count, setCount] = useState(0);\n  // Which definition prevents Child re-renders if Child is wrapped in React.memo?\n}",
                'options' => [
                    'A' => 'const handleClick = () => console.log(id);',
                    'B' => 'const handleClick = useCallback(() => console.log(id), [id]);',
                    'C' => 'const handleClick = useMemo(() => () => console.log(id), []);',
                    'D' => 'window.handleClick = () => console.log(id);'
                ],
                'expected' => 'B',
                'points' => 30
            ],
            [
                'category' => self::CATEGORY_DEBUGGING,
                'type' => 'DEBUGGING',
                'question' => 'Identify the defect in this custom fetch hook that causes an infinite network loop.',
                'code_snippet' => "function useUserData(options) {\n  const [data, setData] = useState(null);\n  useEffect(() => {\n    fetchUser(options).then(setData);\n  }, [options]);\n  return data;\n}",
                'options' => [
                    'A' => 'setData cannot accept a promise resolution callback.',
                    'B' => 'Passing an inline object literal as `options` changes reference identity every render, triggering useEffect endlessly.',
                    'C' => 'useEffect must always return a boolean.',
                    'D' => 'fetchUser cannot be called inside a functional React component.'
                ],
                'expected' => 'B',
                'points' => 25
            ],
            [
                'category' => self::CATEGORY_SCENARIO,
                'type' => 'SCENARIO',
                'question' => 'A financial dashboard renders 10,000 real-time transaction updates per minute. The user interface experiences severe frame-rate drops and input lag. What is the optimal architecture?',
                'code_snippet' => null,
                'options' => [
                    'A' => 'Store all 10,000 items in a single global useState and render standard <table> rows.',
                    'B' => 'Implement list virtualization (e.g., TanStack Virtual / react-window) with throttled state updates or WebSockets running in a Web Worker.',
                    'C' => 'Wrap every cell in React.useTransition and disable CSS animations.',
                    'D' => 'Switch to synchronous XMLHttpRequest to force the UI to wait for each batch.'
                ],
                'expected' => 'B',
                'points' => 25
            ]
        ],
        'typescript' => [
            [
                'category' => self::CATEGORY_CONCEPTUAL,
                'type' => 'MCQ',
                'question' => 'What is the key difference between the `unknown` and `any` types in TypeScript?',
                'code_snippet' => null,
                'options' => [
                    'A' => '`unknown` and `any` are identical aliases introduced in TypeScript 3.0.',
                    'B' => '`unknown` is type-safe: you cannot perform arbitrary operations on it without narrowing or casting first.',
                    'C' => '`any` enforces runtime type verification whereas `unknown` disables it.',
                    'D' => '`unknown` can only hold primitive values like string and number.'
                ],
                'expected' => 'B',
                'points' => 20
            ],
            [
                'category' => self::CATEGORY_PRACTICAL,
                'type' => 'PRACTICAL',
                'question' => 'Which utility type construction produces a type containing only the string-valued keys of interface `T`?',
                'code_snippet' => "type StringKeys<T> = ...",
                'options' => [
                    'A' => 'keyof T extends string ? string : never',
                    'B' => '{ [K in keyof T]: T[K] extends string ? K : never }[keyof T]',
                    'C' => 'Pick<T, string>',
                    'D' => 'Exclude<keyof T, number>'
                ],
                'expected' => 'B',
                'points' => 30
            ],
            [
                'category' => self::CATEGORY_DEBUGGING,
                'type' => 'DEBUGGING',
                'question' => 'Why does TypeScript produce an error on `user.permissions.includes("admin")` below?',
                'code_snippet' => "type Role = 'admin' | 'editor' | 'viewer';\ninterface User { permissions?: Role[]; }\nfunction check(user: User) {\n  return user.permissions.includes('admin');\n}",
                'options' => [
                    'A' => '`user.permissions` is possibly `undefined` and requires optional chaining `user.permissions?.includes`.',
                    'B' => 'Array.prototype.includes is not supported in TypeScript.',
                    'C' => 'Role union members cannot be compared to string literals.',
                    'D' => 'Interfaces cannot declare optional array properties.'
                ],
                'expected' => 'A',
                'points' => 25
            ],
            [
                'category' => self::CATEGORY_SCENARIO,
                'type' => 'SCENARIO',
                'question' => 'You are building a shared enterprise SDK that communicates with an evolving REST API. How should you design the typing layer to guarantee forward-compatible runtime parsing without crashes?',
                'code_snippet' => null,
                'options' => [
                    'A' => 'Use `as any` type assertions across all API response payloads.',
                    'B' => 'Validate response payloads at boundary layers using schemas (e.g. Zod or TypeBox) and derive static types with `z.infer`.',
                    'C' => 'Write custom `@ts-ignore` comments above every fetch call.',
                    'D' => 'Disallow adding any optional fields in future backend releases.'
                ],
                'expected' => 'B',
                'points' => 25
            ]
        ],
        'sql' => [
            [
                'category' => self::CATEGORY_CONCEPTUAL,
                'type' => 'MCQ',
                'question' => 'What is the ACID isolation phenomenon known as a "Phantom Read"?',
                'code_snippet' => null,
                'options' => [
                    'A' => 'A transaction reads uncommitted changes written by a concurrent transaction.',
                    'B' => 'A transaction re-reads data it previously read and finds that another committed transaction has modified that data.',
                    'C' => 'A transaction re-executes a query returning rows that satisfy a search condition and finds that another committed transaction has inserted new rows.',
                    'D' => 'A query fails because the index has been corrupted on disk.'
                ],
                'expected' => 'C',
                'points' => 20
            ],
            [
                'category' => self::CATEGORY_PRACTICAL,
                'type' => 'PRACTICAL',
                'question' => 'Which query efficiently calculates the 30-day running total of revenue per department using window functions?',
                'code_snippet' => null,
                'options' => [
                    'A' => 'SELECT dept_id, SUM(revenue) OVER (PARTITION BY dept_id ORDER BY trans_date RANGE BETWEEN INTERVAL \'29 days\' PRECEDING AND CURRENT ROW) FROM sales;',
                    'B' => 'SELECT dept_id, SUM(revenue) FROM sales GROUP BY dept_id HAVING trans_date > CURRENT_DATE - 30;',
                    'C' => 'SELECT dept_id, revenue + LAG(revenue, 30) FROM sales;',
                    'D' => 'SELECT dept_id, SUM(revenue) OVER () FROM sales WHERE trans_date >= CURRENT_DATE - 30;'
                ],
                'expected' => 'A',
                'points' => 30
            ],
            [
                'category' => self::CATEGORY_DEBUGGING,
                'type' => 'DEBUGGING',
                'question' => 'The following query suddenly performs a full table scan on a table with 20 million rows despite an index on `created_at`. Why?',
                'code_snippet' => "SELECT * FROM orders WHERE DATE(created_at) = '2025-01-01';",
                'options' => [
                    'A' => 'The DATE string format is invalid in SQL standards.',
                    'B' => 'Wrapping the indexed column in a function `DATE(created_at)` prevents the query planner from utilizing a standard B-tree index.',
                    'C' => 'B-tree indexes only work with numerical primary keys.',
                    'D' => 'PostgreSQL automatically disables indexes on dates older than 30 days.'
                ],
                'expected' => 'B',
                'points' => 25
            ],
            [
                'category' => self::CATEGORY_SCENARIO,
                'type' => 'SCENARIO',
                'question' => 'During flash sales, concurrent checkouts cause negative stock counts for limited products. How do you prevent overselling with PostgreSQL?',
                'code_snippet' => null,
                'options' => [
                    'A' => 'Run `SELECT quantity FROM inventory` followed by `UPDATE inventory SET quantity = quantity - 1` in separate non-transactional queries.',
                    'B' => 'Use `SELECT quantity FROM inventory WHERE id = ? FOR UPDATE` within a transaction, or `UPDATE inventory SET quantity = quantity - 1 WHERE id = ? AND quantity >= 1` checking affected rows.',
                    'C' => 'Increase database connection timeout to 120 seconds.',
                    'D' => 'Drop the foreign key constraints on the order items table.'
                ],
                'expected' => 'B',
                'points' => 25
            ]
        ]
    ];

    /**
     * Start a new skill verification session for a student.
     * Enforces 1 active attempt at a time and creates structured assessment questions.
     */
    public static function startVerification(string $studentId, string $skillName, string $requestedLevel = 'intermediate'): array {
        $db = Database::getConnection();
        $normSkill = strtolower(trim($skillName));
        $requestedLevel = strtolower(trim($requestedLevel));

        if (!in_array($requestedLevel, ['beginner', 'intermediate', 'advanced', 'expert'], true)) {
            throw new \InvalidArgumentException('Requested level must be beginner, intermediate, advanced, or expert.');
        }

        // Find or create normalized skill
        $skStmt = $db->prepare('SELECT id, name FROM skills WHERE normalized_name = ? LIMIT 1');
        $skStmt->execute([$normSkill]);
        $skill = $skStmt->fetch();

        if (!$skill) {
            $skillId = 'sk_' . bin2hex(random_bytes(6));
            $insSk = $db->prepare('INSERT INTO skills (id, name, normalized_name) VALUES (?, ?, ?)');
            $insSk->execute([$skillId, trim($skillName), $normSkill]);
            $skill = ['id' => $skillId, 'name' => trim($skillName)];
        }

        // Check for existing active in-progress attempt
        $checkStmt = $db->prepare('
            SELECT id, current_question_index, total_questions, started_at
            FROM skill_verification_attempts
            WHERE student_id = ? AND skill_id = ? AND status = \'in_progress\'
            ORDER BY created_at DESC LIMIT 1
        ');
        $checkStmt->execute([$studentId, $skill['id']]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            return [
                'success' => true,
                'is_resumed' => true,
                'attempt_id' => $existing['id'],
                'skill_name' => $skill['name'],
                'current_question_index' => (int)$existing['current_question_index'],
                'total_questions' => (int)$existing['total_questions'],
                'message' => 'Resuming existing active verification session.'
            ];
        }

        // Calculate attempt number
        $cntStmt = $db->prepare('SELECT COUNT(*) FROM skill_verification_attempts WHERE student_id = ? AND skill_id = ?');
        $cntStmt->execute([$studentId, $skill['id']]);
        $attemptNumber = (int)$cntStmt->fetchColumn() + 1;

        // Generate questions (curated bank or Gemini-assisted generation)
        $questions = self::generateQuestionsForSkill($normSkill, $skill['name'], $requestedLevel);

        $attemptId = 'sva_' . bin2hex(random_bytes(8));
        $db->beginTransaction();
        try {
            $insAtt = $db->prepare('
                INSERT INTO skill_verification_attempts (
                    id, student_id, skill_id, requested_level, difficulty,
                    status, current_question_index, total_questions, attempt_number
                ) VALUES (?, ?, ?, ?, ?, \'in_progress\', 0, ?, ?)
            ');
            $insAtt->execute([
                $attemptId,
                $studentId,
                $skill['id'],
                $requestedLevel,
                $requestedLevel,
                count($questions),
                $attemptNumber
            ]);

            $insQ = $db->prepare('
                INSERT INTO skill_verification_questions (
                    id, attempt_id, question_index, question_type, category,
                    question_text, code_snippet, options, expected_answer, points, is_objective
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');

            foreach ($questions as $idx => $q) {
                $qId = 'svq_' . bin2hex(random_bytes(8));
                $insQ->execute([
                    $qId,
                    $attemptId,
                    $idx,
                    $q['type'],
                    $q['category'],
                    $q['question'],
                    $q['code_snippet'] ?? null,
                    isset($q['options']) ? json_encode($q['options']) : null,
                    $q['expected'],
                    $q['points'] ?? 25,
                    true
                ]);
            }

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }

        return [
            'success' => true,
            'is_resumed' => false,
            'attempt_id' => $attemptId,
            'skill_name' => $skill['name'],
            'requested_level' => $requestedLevel,
            'current_question_index' => 0,
            'total_questions' => count($questions),
            'message' => 'Skill verification assessment initialized.'
        ];
    }

    /**
     * Get the active or specific question for an ongoing attempt (hiding expected_answer).
     */
    public static function getQuestion(string $studentId, string $attemptId, ?int $questionIndex = null): array {
        $db = Database::getConnection();
        $attStmt = $db->prepare('
            SELECT a.*, s.name as skill_name
            FROM skill_verification_attempts a
            JOIN skills s ON a.skill_id = s.id
            WHERE a.id = ? AND a.student_id = ?
        ');
        $attStmt->execute([$attemptId, $studentId]);
        $attempt = $attStmt->fetch();

        if (!$attempt) {
            throw new \RuntimeException('Verification attempt not found or unauthorized.');
        }

        self::assertActiveAttempt($db, $attempt);

        $idx = $questionIndex !== null ? $questionIndex : (int)$attempt['current_question_index'];
        if ($idx !== (int)$attempt['current_question_index']) {
            throw new \RuntimeException('Questions must be answered in sequence.');
        }

        $qStmt = $db->prepare('
            SELECT q.id, q.question_index, q.question_type, q.category, q.question_text,
                   q.code_snippet, q.options, q.points, ans.answer_text, ans.submitted_at
            FROM skill_verification_questions q
            LEFT JOIN skill_verification_answers ans ON ans.attempt_id = q.attempt_id AND ans.question_id = q.id
            WHERE q.attempt_id = ? AND q.question_index = ?
        ');
        $qStmt->execute([$attemptId, $idx]);
        $row = $qStmt->fetch();

        if (!$row) {
            return [
                'success' => false,
                'attempt_status' => $attempt['status'],
                'message' => 'No further questions in this verification attempt.'
            ];
        }

        return [
            'success' => true,
            'attempt_id' => $attemptId,
            'skill_name' => $attempt['skill_name'],
            'status' => $attempt['status'],
            'current_index' => $idx,
            'total_questions' => (int)$attempt['total_questions'],
            'question' => [
                'id' => $row['id'],
                'index' => (int)$row['question_index'],
                'type' => $row['question_type'],
                'category' => $row['category'],
                'question' => $row['question_text'],
                'code_snippet' => $row['code_snippet'],
                'options' => $row['options'] ? json_decode($row['options'], true) : null,
                'points' => (int)$row['points'],
                'answered' => !empty($row['answer_text']),
                'previous_answer' => $row['answer_text'] ?? null
            ]
        ];
    }

    /**
     * Submit an answer for a specific question deterministically.
     */
    public static function submitAnswer(string $studentId, string $attemptId, string $questionId, string $answer): array {
        $db = Database::getConnection();
        $attStmt = $db->prepare('SELECT * FROM skill_verification_attempts WHERE id = ? AND student_id = ?');
        $attStmt->execute([$attemptId, $studentId]);
        $attempt = $attStmt->fetch();

        if (!$attempt) {
            throw new \RuntimeException('Verification session not found or unauthorized.');
        }

        if ($attempt['status'] !== 'in_progress') {
            throw new \RuntimeException('Verification attempt is already ' . $attempt['status'] . '.');
        }

        self::assertActiveAttempt($db, $attempt);

        $qStmt = $db->prepare('SELECT * FROM skill_verification_questions WHERE id = ? AND attempt_id = ?');
        $qStmt->execute([$questionId, $attemptId]);
        $question = $qStmt->fetch();

        if (!$question) {
            throw new \RuntimeException('Invalid question for this assessment session.');
        }

        if ((int)$question['question_index'] !== (int)$attempt['current_question_index']) {
            throw new \RuntimeException('Only the current question can be answered.');
        }

        $existingAnswer = $db->prepare('SELECT 1 FROM skill_verification_answers WHERE attempt_id = ? AND question_id = ?');
        $existingAnswer->execute([$attemptId, $questionId]);
        if ($existingAnswer->fetchColumn()) {
            throw new \RuntimeException('This question has already been answered.');
        }

        $cleanAnswer = strtoupper(trim($answer));
        $expected = strtoupper(trim($question['expected_answer']));
        $isCorrect = ($cleanAnswer === $expected);
        $scoreAwarded = $isCorrect ? (float)$question['points'] : 0.0;

        $ansId = 'ans_' . bin2hex(random_bytes(8));
        $insAns = $db->prepare('
            INSERT INTO skill_verification_answers (
                id, attempt_id, question_id, student_id, answer_text, is_correct, score_awarded
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (attempt_id, question_id)
            DO UPDATE SET answer_text = EXCLUDED.answer_text,
                          is_correct = EXCLUDED.is_correct,
                          score_awarded = EXCLUDED.score_awarded,
                          submitted_at = CURRENT_TIMESTAMP
        ');
        $insAns->execute([
            $ansId,
            $attemptId,
            $questionId,
            $studentId,
            $cleanAnswer,
            $isCorrect ? 'true' : 'false',
            $scoreAwarded
        ]);

        // Advance current question index if answering current
        $nextIndex = (int)$question['question_index'] + 1;
        $upAtt = $db->prepare('
            UPDATE skill_verification_attempts
            SET current_question_index = GREATEST(current_question_index, ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ');
        $upAtt->execute([$nextIndex, $attemptId]);

        return [
            'success' => true,
            'question_id' => $questionId,
            'is_correct' => $isCorrect,
            'next_index' => $nextIndex,
            'is_last_question' => ($nextIndex >= (int)$attempt['total_questions'])
        ];
    }

    /**
     * Finalize the verification attempt:
     * Calculates deterministic scores, updates skill evidence, student proficiency, and triggers integrity audit.
     */
    public static function completeVerification(string $studentId, string $attemptId): array {
        $db = Database::getConnection();
        $attStmt = $db->prepare('
            SELECT a.*, s.name as skill_name, s.normalized_name
            FROM skill_verification_attempts a
            JOIN skills s ON a.skill_id = s.id
            WHERE a.id = ? AND a.student_id = ?
        ');
        $attStmt->execute([$attemptId, $studentId]);
        $attempt = $attStmt->fetch();

        if (!$attempt) {
            throw new \RuntimeException('Verification attempt not found.');
        }

        // Anti-Replay: If already completed, return cached verified result idempotently
        if ($attempt['status'] === 'completed') {
            return [
                'success' => true,
                'already_completed' => true,
                'attempt_id' => $attemptId,
                'skill_name' => $attempt['skill_name'],
                'score' => (float)$attempt['score'],
                'verified_level' => $attempt['verified_level'],
                'confidence' => (float)$attempt['confidence'],
                'passed' => (bool)$attempt['passed'],
                'breakdown' => json_decode($attempt['breakdown'] ?? '{}', true) ?: [],
                'integrity_status' => $attempt['verified_level'] === 'Not Verified' ? 'NOT_VERIFIED' : 'VERIFIED'
            ];
        }

        if ($attempt['status'] !== 'in_progress') {
            throw new \RuntimeException('Verification attempt is already ' . $attempt['status'] . '.');
        }

        self::assertActiveAttempt($db, $attempt);

        // Fetch all questions and student answers
        $qStmt = $db->prepare('
            SELECT q.id, q.category, q.points, q.expected_answer, ans.answer_text, ans.is_correct, ans.score_awarded
            FROM skill_verification_questions q
            LEFT JOIN skill_verification_answers ans ON ans.attempt_id = q.attempt_id AND ans.question_id = q.id
            WHERE q.attempt_id = ?
            ORDER BY q.question_index ASC
        ');
        $qStmt->execute([$attemptId]);
        $items = $qStmt->fetchAll();

        $answeredCount = 0;
        foreach ($items as $item) {
            if ($item['answer_text'] !== null) {
                $answeredCount++;
            }
        }
        if ($answeredCount !== count($items) || $answeredCount !== (int)$attempt['total_questions']) {
            throw new \RuntimeException('All verification questions must be answered before finalization.');
        }

        $categoryScores = [
            self::CATEGORY_CONCEPTUAL => ['total' => 0, 'earned' => 0],
            self::CATEGORY_PRACTICAL  => ['total' => 0, 'earned' => 0],
            self::CATEGORY_DEBUGGING  => ['total' => 0, 'earned' => 0],
            self::CATEGORY_SCENARIO   => ['total' => 0, 'earned' => 0]
        ];

        $totalPointsEarned = 0;
        $totalMaxPoints = 0;

        foreach ($items as $item) {
            $cat = $item['category'];
            $maxPt = (float)$item['points'];
            $earnedPt = (bool)($item['is_correct'] ?? false) ? $maxPt : 0;

            if (!isset($categoryScores[$cat])) {
                $categoryScores[$cat] = ['total' => 0, 'earned' => 0];
            }
            $categoryScores[$cat]['total'] += $maxPt;
            $categoryScores[$cat]['earned'] += $earnedPt;

            $totalPointsEarned += $earnedPt;
            $totalMaxPoints += $maxPt;
        }

        // Weighted category percentage calculation
        $finalScore = 0.0;
        $breakdown = [];

        foreach (self::WEIGHTS as $cat => $weight) {
            $earned = $categoryScores[$cat]['earned'] ?? 0;
            $total = $categoryScores[$cat]['total'] ?? 1;
            $pct = $total > 0 ? ($earned / $total) * 100 : 0;
            $breakdown[$cat] = round($pct, 1);
            $finalScore += ($pct * $weight);
        }

        $finalScore = round($finalScore, 1);

        // Standardized threshold mapping
        $verifiedLevel = self::mapScoreToLevel($finalScore);
        $passed = ($finalScore >= 60.0);
        $confidence = round($finalScore, 1);

        $db->beginTransaction();
        try {
            // Update attempt record
            $upAtt = $db->prepare('
                UPDATE skill_verification_attempts
                SET status = \'completed\',
                    score = ?,
                    verified_level = ?,
                    confidence = ?,
                    passed = ?,
                    breakdown = ?,
                    completed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ');
            $upAtt->execute([
                $finalScore,
                $verifiedLevel,
                $confidence,
                $passed ? 'true' : 'false',
                json_encode($breakdown),
                $attemptId
            ]);

            // Synchronize with skill_evidence (source = assessment)
            $evId = 'ev_' . bin2hex(random_bytes(8));
            $meta = json_encode([
                'verification_attempt_id' => $attemptId,
                'score' => $finalScore,
                'verified_level' => $verifiedLevel,
                'breakdown' => $breakdown,
                'verified_at' => date('c')
            ]);

            $insEv = $db->prepare('
                INSERT INTO skill_evidence (id, student_id, skill_id, source, confidence, metadata, verified_at)
                VALUES (?, ?, ?, \'assessment\', ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (student_id, skill_id, source)
                DO UPDATE SET confidence = EXCLUDED.confidence,
                              metadata = EXCLUDED.metadata,
                              verified_at = CURRENT_TIMESTAMP
            ');
            $insEv->execute([$evId, $studentId, $attempt['skill_id'], $finalScore, $meta]);

            // Synchronize also with legacy skill_assessments for full backward compatibility
            $legId = 'asm_' . bin2hex(random_bytes(8));
            $insLeg = $db->prepare('
                INSERT INTO skill_assessments (
                    id, student_id, skill_id, score, level,
                    knowledge_score, problem_solving_score, practical_score, evaluation_summary, questions_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $insLeg->execute([
                $legId,
                $studentId,
                $attempt['skill_id'],
                $finalScore,
                strtolower($verifiedLevel),
                $breakdown[self::CATEGORY_CONCEPTUAL] ?? 0,
                $breakdown[self::CATEGORY_DEBUGGING] ?? 0,
                $breakdown[self::CATEGORY_PRACTICAL] ?? 0,
                "Verified at {$verifiedLevel} competency ({$finalScore}%) via SkillBridge 2.0 multi-discipline evaluation.",
                json_encode(['attempt_id' => $attemptId, 'breakdown' => $breakdown])
            ]);

            // Update student_skills normalized proficiency if passed or higher
            $dbProf = strtolower($verifiedLevel);
            if (in_array($dbProf, ['beginner', 'intermediate', 'advanced', 'expert'], true)) {
                $upSk = $db->prepare('
                    UPDATE student_skills
                    SET proficiency = ?
                    WHERE student_id = ? AND skill_id = ?
                ');
                $upSk->execute([$dbProf, $studentId, $attempt['skill_id']]);
            }

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }

        // Fresh multi-source integrity audit
        $audit = SkillIntegrityService::auditStudentSkill($studentId, $attempt['skill_id']);

        return [
            'success' => true,
            'attempt_id' => $attemptId,
            'skill_name' => $attempt['skill_name'],
            'score' => $finalScore,
            'verified_level' => $verifiedLevel,
            'confidence' => $confidence,
            'passed' => $passed,
            'breakdown' => $breakdown,
            'integrity' => $audit,
            'message' => $passed
                ? "Skill verification successful! Verified level: {$verifiedLevel} ({$finalScore}%)."
                : "Assessment completed with score: {$finalScore}%. Review the recommendations below to retake."
        ];
    }

    /**
     * Map numerical score (0-100) to standardized proficiency level.
     */
    public static function mapScoreToLevel(float $score): string {
        if ($score >= 90.0) return 'Expert';
        if ($score >= 75.0) return 'Advanced';
        if ($score >= 60.0) return 'Proficient';
        if ($score >= 40.0) return 'Developing';
        return 'Not Verified';
    }

    /**
     * Reject inactive or expired attempts before exposing or mutating them.
     */
    private static function assertActiveAttempt(PDO $db, array $attempt): void {
        if ($attempt['status'] !== 'in_progress') {
            throw new \RuntimeException('Verification attempt is already ' . $attempt['status'] . '.');
        }

        if (!empty($attempt['started_at']) && !empty($attempt['time_limit_seconds'])) {
            $elapsed = time() - strtotime((string)$attempt['started_at']);
            if ($elapsed > ((int)$attempt['time_limit_seconds'] + 60)) {
                $expire = $db->prepare("UPDATE skill_verification_attempts SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'in_progress'");
                $expire->execute([$attempt['id']]);
                throw new \RuntimeException('Verification session has expired.');
            }
        }
    }

    /**
     * Helper to assemble questions for a given skill.
     */
    private static function generateQuestionsForSkill(string $normSkill, string $displayName, string $difficulty): array {
        if (isset(self::CURATED_BANKS[$normSkill])) {
            return self::CURATED_BANKS[$normSkill];
        }

        // Look for partial key match in curated banks
        foreach (self::CURATED_BANKS as $k => $bank) {
            if (str_contains($normSkill, $k) || str_contains($k, $normSkill)) {
                return $bank;
            }
        }

        // Try AI generation with Gemini 3.7 Flash if configured
        try {
            $aiQuestions = self::generateAIQuestions($displayName, $difficulty);
            if (!empty($aiQuestions) && count($aiQuestions) === 4) {
                return $aiQuestions;
            }
        } catch (\Throwable $e) {
            error_log('Gemini question generation fallback: ' . $e->getMessage());
        }

        // Robust deterministic structured fallback
        return [
            [
                'category' => self::CATEGORY_CONCEPTUAL,
                'type' => 'MCQ',
                'question' => "Which of the following describes the core foundational architecture of {$displayName}?",
                'code_snippet' => null,
                'options' => [
                    'A' => "Direct memory address manipulation with manual thread locking.",
                    'B' => "Standard runtime idioms and structured modular encapsulation.",
                    'C' => "Pure interpreted bytecode without runtime boundary checks.",
                    'D' => "Monolithic global scope variables shared across all invocation contexts."
                ],
                'expected' => 'B',
                'points' => 20
            ],
            [
                'category' => self::CATEGORY_PRACTICAL,
                'type' => 'PRACTICAL',
                'question' => "In {$displayName}, what is the best practice pattern to handle error propagation and resource cleanup?",
                'code_snippet' => null,
                'options' => [
                    'A' => "Ignore runtime exceptions and restart the host operating system.",
                    'B' => "Utilize structured exception blocks (try/catch/finally or defer/context managers) ensuring resources are closed.",
                    'C' => "Store all errors in a global string buffer and continue execution without handling.",
                    'D' => "Disable stack trace generation in production environments."
                ],
                'expected' => 'B',
                'points' => 30
            ],
            [
                'category' => self::CATEGORY_DEBUGGING,
                'type' => 'DEBUGGING',
                'question' => "When profiling a {$displayName} service under high load, what is the most common cause of sudden throughput degradation?",
                'code_snippet' => null,
                'options' => [
                    'A' => "CPU frequency scaling down during idle network moments.",
                    'B' => "Unbounded memory accumulation or blocking synchronous calls on an asynchronous worker thread.",
                    'C' => "Running clean automated unit test suites before deployment.",
                    'D' => "Compiling with strict static typing turned on."
                ],
                'expected' => 'B',
                'points' => 25
            ],
            [
                'category' => self::CATEGORY_SCENARIO,
                'type' => 'SCENARIO',
                'question' => "How should an enterprise production system employing {$displayName} be designed to guarantee high availability and fault isolation?",
                'code_snippet' => null,
                'options' => [
                    'A' => "Deploy all services on a single unmonitored bare-metal machine.",
                    'B' => "Implement horizontal scaling behind a load balancer with health checks, circuit breakers, and centralized telemetry.",
                    'C' => "Store all transactional state exclusively in in-memory local variables.",
                    'D' => "Bypass API authentication to reduce network packet overhead."
                ],
                'expected' => 'B',
                'points' => 25
            ]
        ];
    }

    /**
     * Use Gemini 3.7 Flash to dynamically construct strict 4-category questions for novel skills.
     */
    private static function generateAIQuestions(string $skillName, string $difficulty): array {
        if (!GeminiService::isConfigured()) {
            return [];
        }

        $prompt = <<<PROMPT
You are a principal technical interviewer at SkillBridge 2.0.
Create 4 rigorous assessment questions for the technical skill: "{$skillName}" at "{$difficulty}" level.
The 4 questions must strictly cover these 4 categories in order:
1. "Conceptual Foundations" (Type: "MCQ")
2. "Practical Implementation" (Type: "PRACTICAL")
3. "Debugging & Optimization" (Type: "DEBUGGING")
4. "Production Scenario" (Type: "SCENARIO")

Each question must have 4 clear options (A, B, C, D) and exactly ONE unambiguously correct answer.
Return ONLY valid JSON matching this exact structure:
[
  {
    "category": "Conceptual Foundations",
    "type": "MCQ",
    "question": "Clear question text",
    "code_snippet": null,
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "expected": "B",
    "points": 20
  },
  {
    "category": "Practical Implementation",
    "type": "PRACTICAL",
    "question": "Clear practical question",
    "code_snippet": "optional snippet or null",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "expected": "A",
    "points": 30
  },
  {
    "category": "Debugging & Optimization",
    "type": "DEBUGGING",
    "question": "Debugging question",
    "code_snippet": "optional snippet or null",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "expected": "C",
    "points": 25
  },
  {
    "category": "Production Scenario",
    "type": "SCENARIO",
    "question": "Production architectural scenario",
    "code_snippet": null,
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "expected": "B",
    "points": 25
  }
]
PROMPT;

        $raw = GeminiService::generateText($prompt);
        if (!$raw) return [];

        // Extract JSON block
        if (preg_match('/\[\s*\{.*\}\s*\]/s', $raw, $matches)) {
            $decoded = json_decode($matches[0], true);
            if (is_array($decoded) && count($decoded) === 4) {
                return $decoded;
            }
        }

        return [];
    }
}
