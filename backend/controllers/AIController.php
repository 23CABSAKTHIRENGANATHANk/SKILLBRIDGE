<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/Validator.php';
require_once __DIR__ . '/../services/GeminiService.php';
require_once __DIR__ . '/../services/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

/**
 * AI Feature Controller
 * All endpoints are authenticated. Gemini API calls are wrapped with fallbacks.
 */
class AIController {

    // -----------------------------------------------------------------------
    // 1. POST /ai/resume-summary
    // -----------------------------------------------------------------------
    public static function resumeSummary(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db    = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        // Get student profile + skills
        $stmt = $db->prepare('
            SELECT s.name, s.program, s.college, s.experience
            FROM students s WHERE s.user_id = ? LIMIT 1
        ');
        $stmt->execute([$currentUser['user_id']]);
        $student = $stmt->fetch();
        if (!$student) errorResponse('Student profile not found.', 404);

        $skStmt = $db->prepare('
            SELECT sk.name FROM student_skills ss
            JOIN skills sk ON ss.skill_id = sk.id
            JOIN students st ON ss.student_id = st.id
            WHERE st.user_id = ?
        ');
        $skStmt->execute([$currentUser['user_id']]);
        $skills = $skStmt->fetchAll(PDO::FETCH_COLUMN);

        $resumeText = trim($input['resume_text'] ?? '');
        if (empty($resumeText)) {
            // Use profile data as resume proxy
            $resumeText = "Name: {$student['name']}\nProgram: {$student['program']}\nCollege: {$student['college']}\nSkills: " . implode(', ', $skills);
        }

        Logger::info('AI resume-summary requested', ['user' => $currentUser['user_id']]);

        $result = GeminiService::summariseResume(
            $resumeText,
            $student['name'],
            $student['program'],
            $skills
        );

        jsonResponse([
            'success' => true,
            'ai_powered' => !empty(getenv('GEMINI_API_KEY')),
            'resume_analysis' => $result,
        ]);
    }

    // -----------------------------------------------------------------------
    // 2. POST /ai/match-explain
    // -----------------------------------------------------------------------
    public static function matchExplain(array $currentUser): void {
        $db    = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = new Validator($input);
        $v->required('job_id', 'Job ID');
        $v->failOrProceed();

        $jobId = $v->get('job_id');

        // Job details
        $jStmt = $db->prepare('
            SELECT j.id, j.title, c.name as company_name
            FROM jobs j JOIN companies c ON j.company_id = c.id
            WHERE j.id = ? LIMIT 1
        ');
        $jStmt->execute([$jobId]);
        $job = $jStmt->fetch();
        if (!$job) errorResponse('Job not found.', 404);

        // Job skills
        $jskStmt = $db->prepare('
            SELECT sk.name FROM job_skills js JOIN skills sk ON js.skill_id = sk.id WHERE js.job_id = ?
        ');
        $jskStmt->execute([$jobId]);
        $jobSkills = $jskStmt->fetchAll(PDO::FETCH_COLUMN);

        // Student profile
        $student = null;
        $studentSkills = [];
        if ($currentUser['role'] === 'student') {
            $sStmt = $db->prepare('SELECT s.name, s.experience FROM students s WHERE s.user_id = ? LIMIT 1');
            $sStmt->execute([$currentUser['user_id']]);
            $student = $sStmt->fetch();

            $skStmt = $db->prepare('
                SELECT sk.name FROM student_skills ss
                JOIN skills sk ON ss.skill_id = sk.id
                JOIN students st ON ss.student_id = st.id
                WHERE st.user_id = ?
            ');
            $skStmt->execute([$currentUser['user_id']]);
            $studentSkills = $skStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        // Compute basic match score
        $sLower     = array_map('strtolower', $studentSkills);
        $jLower     = array_map('strtolower', $jobSkills);
        $matched    = array_intersect($sLower, $jLower);
        $matchScore = empty($jLower) ? 100 : (int)(count($matched) / count($jLower) * 100);

        $result = GeminiService::explainMatch(
            $student['name']       ?? 'Student',
            $studentSkills,
            $student['experience'] ?? 'Fresher',
            $job['title'],
            $job['company_name'],
            $jobSkills,
            $matchScore
        );

        jsonResponse([
            'success'     => true,
            'ai_powered'  => !empty(getenv('GEMINI_API_KEY')),
            'job_title'   => $job['title'],
            'company'     => $job['company_name'],
            'match_score' => $matchScore,
            'explanation' => $result,
        ]);
    }

    // -----------------------------------------------------------------------
    // 3. GET /ai/recommendations
    // -----------------------------------------------------------------------
    public static function recommendations(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();

        // Student context
        $sStmt = $db->prepare('SELECT s.name, s.program, s.experience FROM students s WHERE s.user_id = ? LIMIT 1');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();
        if (!$student) errorResponse('Student profile not found.', 404);

        $skStmt = $db->prepare('
            SELECT sk.name FROM student_skills ss
            JOIN skills sk ON ss.skill_id = sk.id
            JOIN students st ON ss.student_id = st.id
            WHERE st.user_id = ?
        ');
        $skStmt->execute([$currentUser['user_id']]);
        $studentSkills = $skStmt->fetchAll(PDO::FETCH_COLUMN);

        if (count($studentSkills) === 0) {
            jsonResponse([
                'success' => true,
                'ai_powered' => false,
                'recommendations' => [],
                'student_skills' => [],
            ]);
        }

        // Active jobs (limit 20 for prompt economy)
        $jobStmt = $db->prepare("
            SELECT j.id, j.title, j.type, j.location, c.name as company,
                   j.salary_range, j.posted_at
            FROM jobs j JOIN companies c ON j.company_id = c.id
            WHERE j.status = 'active'
            ORDER BY j.posted_at DESC LIMIT 20
        ");
        $jobStmt->execute();
        $rawJobs = $jobStmt->fetchAll();

        // Attach skills to each job
        foreach ($rawJobs as &$job) {
            $jskStmt = $db->prepare('SELECT sk.name FROM job_skills js JOIN skills sk ON js.skill_id = sk.id WHERE js.job_id = ?');
            $jskStmt->execute([$job['id']]);
            $job['skills'] = $jskStmt->fetchAll(PDO::FETCH_COLUMN);
        }
        unset($job);

        $ranked = GeminiService::recommendJobs(
            $student['name'],
            $student['program'],
            $studentSkills,
            $student['experience'],
            $rawJobs
        );

        // Hydrate with full job data
        $jobMap = array_column($rawJobs, null, 'id');
        $result = [];
        foreach ($ranked as $rec) {
            $jid = $rec['job_id'] ?? '';
            if (!isset($jobMap[$jid])) continue;
            $result[] = array_merge($jobMap[$jid], [
                'ai_reason'     => $rec['reason'],
                'fit_label'     => $rec['fit_label'],
                'missing_count' => $rec['missing_count'] ?? 0,
            ]);
        }

        jsonResponse([
            'success'         => true,
            'ai_powered'      => !empty(getenv('GEMINI_API_KEY')),
            'recommendations' => $result,
            'student_skills'  => $studentSkills,
        ]);
    }

    // -----------------------------------------------------------------------
    // 4. POST /ai/skill-gap
    // -----------------------------------------------------------------------
    public static function skillGap(array $currentUser): void {
        $db    = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = new Validator($input);
        $v->required('job_id', 'Job ID');
        $v->failOrProceed();

        $jobId = $v->get('job_id');

        // Job info
        $jStmt = $db->prepare('SELECT j.title FROM jobs j WHERE j.id = ? LIMIT 1');
        $jStmt->execute([$jobId]);
        $job = $jStmt->fetch();
        if (!$job) errorResponse('Job not found.', 404);

        // Job skills
        $jskStmt = $db->prepare('SELECT sk.name FROM job_skills js JOIN skills sk ON js.skill_id = sk.id WHERE js.job_id = ?');
        $jskStmt->execute([$jobId]);
        $jobSkills = $jskStmt->fetchAll(PDO::FETCH_COLUMN);

        // Student context
        $sStmt = $db->prepare('SELECT s.program FROM students s WHERE s.user_id = ? LIMIT 1');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        $skStmt = $db->prepare('
            SELECT sk.name FROM student_skills ss
            JOIN skills sk ON ss.skill_id = sk.id
            JOIN students st ON ss.student_id = st.id
            WHERE st.user_id = ?
        ');
        $skStmt->execute([$currentUser['user_id']]);
        $studentSkills = $skStmt->fetchAll(PDO::FETCH_COLUMN);

        $result = GeminiService::analyseSkillGap(
            $studentSkills,
            $job['title'],
            $jobSkills,
            $student['program'] ?? 'Computer Science'
        );

        jsonResponse([
            'success'         => true,
            'ai_powered'      => !empty(getenv('GEMINI_API_KEY')),
            'job_title'       => $job['title'],
            'student_skills'  => $studentSkills,
            'job_skills'      => $jobSkills,
            'gap_analysis'    => $result,
        ]);
    }

    // -----------------------------------------------------------------------
    // 5. GET /ai/recruiter-insights
    // -----------------------------------------------------------------------
    public static function recruiterInsights(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();

        // Scope to this recruiter's company
        $cStmt = $db->prepare('SELECT id FROM companies WHERE user_id = ? LIMIT 1');
        $cStmt->execute([$currentUser['user_id']]);
        $company = $cStmt->fetch();
        if (!$company) errorResponse('Company profile not found.', 404);

        $total = (int)$db->prepare('
            SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.company_id = ?
        ')->execute([$company['id']]) ? $db->query("
            SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.company_id = '{$company['id']}'
        ")->fetchColumn() : 0;

        // Simpler direct queries
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM applications a
            JOIN jobs j ON a.job_id = j.id WHERE j.company_id = ?
        ");
        $stmt->execute([$company['id']]);
        $total = (int)$stmt->fetchColumn();

        $stmt->execute([$company['id']]);
        $sStmt = $db->prepare("SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.company_id = ? AND a.stage = 'shortlisted'");
        $sStmt->execute([$company['id']]);
        $shortlisted = (int)$sStmt->fetchColumn();

        $iStmt = $db->prepare("SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.company_id = ? AND a.stage = 'interview'");
        $iStmt->execute([$company['id']]);
        $interview = (int)$iStmt->fetchColumn();

        // Top job title
        $tjStmt = $db->prepare("
            SELECT j.title, COUNT(*) as cnt FROM applications a
            JOIN jobs j ON a.job_id = j.id WHERE j.company_id = ?
            GROUP BY j.title ORDER BY cnt DESC LIMIT 1
        ");
        $tjStmt->execute([$company['id']]);
        $topJob = $tjStmt->fetch();

        // Top skills in candidate pool
        $skStmt = $db->prepare("
            SELECT sk.name, COUNT(*) as cnt
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN students s ON a.student_id = s.id
            JOIN student_skills ss ON ss.student_id = s.id
            JOIN skills sk ON ss.skill_id = sk.id
            WHERE j.company_id = ?
            GROUP BY sk.name ORDER BY cnt DESC LIMIT 8
        ");
        $skStmt->execute([$company['id']]);
        $topSkills = $skStmt->fetchAll(PDO::FETCH_COLUMN);

        // Recent candidate names
        $ncStmt = $db->prepare("
            SELECT s.name FROM applications a
            JOIN students s ON a.student_id = s.id
            JOIN jobs j ON a.job_id = j.id
            WHERE j.company_id = ? ORDER BY a.created_at DESC LIMIT 5
        ");
        $ncStmt->execute([$company['id']]);
        $names = $ncStmt->fetchAll(PDO::FETCH_COLUMN);

        $insights = GeminiService::recruiterInsights(
            $total,
            $shortlisted,
            $interview,
            $topSkills,
            $topJob['title'] ?? 'Software Engineer',
            $names
        );

        jsonResponse([
            'success'         => true,
            'ai_powered'      => !empty(getenv('GEMINI_API_KEY')),
            'pipeline_stats'  => [
                'total'       => $total,
                'shortlisted' => $shortlisted,
                'interview'   => $interview,
            ],
            'insights'        => $insights,
            'top_skills'      => $topSkills,
        ]);
    }
}
