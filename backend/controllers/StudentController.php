<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../services/MatchingService.php';
require_once __DIR__ . '/../services/FileUploadService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class StudentController {
    /**
     * Get student profile
     */
    public static function getProfile(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student', 'admin');
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM students WHERE user_id = ? LIMIT 1');
        $stmt->execute([$currentUser['user_id']]);
        $student = $stmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $skStmt = $db->prepare('
            SELECT s.id as skill_id, s.name as skill_name, sk.proficiency 
            FROM student_skills sk
            JOIN skills s ON sk.skill_id = s.id
            WHERE sk.student_id = ?
        ');
        $skStmt->execute([$student['id']]);
        $skills = $skStmt->fetchAll();

        // Calculate profile completion
        $steps = [
            ['id' => 'profile', 'label' => 'Profile', 'complete' => !empty($student['name']) && !empty($student['college'])],
            ['id' => 'skills', 'label' => 'Skills', 'complete' => count($skills) >= 3],
            ['id' => 'resume', 'label' => 'Resume', 'complete' => !empty($student['resume_storage_key'])],
            ['id' => 'projects', 'label' => 'Projects', 'complete' => !empty($student['experience'])],
            ['id' => 'certificates', 'label' => 'Certificates', 'complete' => false]
        ];

        $completedCount = count(array_filter($steps, fn($s) => $s['complete']));
        $percent = (int)round(($completedCount / count($steps)) * 100);

        jsonResponse([
            'success' => true,
            'student' => [
                'id' => $student['id'],
                'name' => $student['name'],
                'avatarUrl' => $student['avatar_url'],
                'college' => $student['college'],
                'program' => $student['program'],
                'experience' => $student['experience'],
                'hasResume' => !empty($student['resume_storage_key'])
            ],
            'skills'  => $skills,
            'progress' => [
                'percent' => $percent,
                'steps'   => $steps
            ]
        ]);
    }

    /**
     * Get student dashboard metrics
     */
    public static function getDashboard(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student', 'admin');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id, name, college, program, resume_storage_key, experience FROM students WHERE user_id = ? LIMIT 1');
        $stmt->execute([$currentUser['user_id']]);
        $student = $stmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // 1. Pipeline counts
        $pipelineStmt = $db->prepare('
            SELECT stage, COUNT(*) as count 
            FROM applications 
            WHERE student_id = ? 
            GROUP BY stage
        ');
        $pipelineStmt->execute([$student['id']]);
        $stageRows = $pipelineStmt->fetchAll();

        $pipeline = [
            'applied' => 0,
            'shortlisted' => 0,
            'interview' => 0,
            'hired' => 0
        ];
        foreach ($stageRows as $row) {
            $stage = $row['stage'];
            if (isset($pipeline[$stage])) {
                $pipeline[$stage] = (int)$row['count'];
            }
        }

        // 2. Recent applications
        $appStmt = $db->prepare('
            SELECT a.id, a.stage, a.updated_at,
                   j.id as job_id, j.title as job_title, c.name as company_name
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.student_id = ?
            ORDER BY a.updated_at DESC
            LIMIT 5
        ');
        $appStmt->execute([$student['id']]);
        $rawApps = $appStmt->fetchAll();

        $applications = [];
        foreach ($rawApps as $app) {
            $diff = time() - strtotime($app['updated_at']);
            $timeStr = $diff < 86400 ? 'Today' : (int)floor($diff / 86400) . ' days ago';
            $applications[] = [
                'id' => $app['id'],
                'stage' => $app['stage'],
                'updatedAt' => $timeStr,
                'job' => [
                    'id' => $app['job_id'],
                    'title' => $app['job_title'],
                    'companyName' => $app['company_name']
                ]
            ];
        }

        // 3. Student skills count
        $skStmt = $db->prepare('SELECT COUNT(*) FROM student_skills WHERE student_id = ?');
        $skStmt->execute([$student['id']]);
        $skillsCount = (int)$skStmt->fetchColumn();

        // 4. Progress calculation
        $steps = [
            ['id' => 'profile', 'label' => 'Profile', 'complete' => !empty($student['name'])],
            ['id' => 'skills', 'label' => 'Skills', 'complete' => $skillsCount >= 3],
            ['id' => 'resume', 'label' => 'Resume', 'complete' => !empty($student['resume_storage_key'])],
            ['id' => 'projects', 'label' => 'Projects', 'complete' => !empty($student['experience'])],
            ['id' => 'certificates', 'label' => 'Certificates', 'complete' => false]
        ];
        $completedCount = count(array_filter($steps, fn($s) => $s['complete']));
        $percent = (int)round(($completedCount / count($steps)) * 100);

        jsonResponse([
            'success' => true,
            'pipeline' => $pipeline,
            'progress' => [
                'percent' => $percent,
                'steps' => $steps
            ],
            'applications' => $applications
        ]);
    }

    /**
     * Add normalized skill to student profile
     */
    public static function addSkill(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $skillName = trim($input['skill_name'] ?? '');
        $proficiency = $input['proficiency'] ?? 'intermediate';

        if (empty($skillName)) {
            errorResponse('Skill name is required.');
        }

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // Ensure skill exists in master dictionary
        $normName = strtolower($skillName);
        $mStmt = $db->prepare('SELECT id FROM skills WHERE normalized_name = ? LIMIT 1');
        $mStmt->execute([$normName]);
        $masterSkill = $mStmt->fetch();

        if (!$masterSkill) {
            $newSkillId = 'sk_' . bin2hex(random_bytes(6));
            $insStmt = $db->prepare('INSERT INTO skills (id, name, normalized_name) VALUES (?, ?, ?)');
            $insStmt->execute([$newSkillId, $skillName, $normName]);
            $skillId = $newSkillId;
        } else {
            $skillId = $masterSkill['id'];
        }

        $stmt = $db->prepare('
            INSERT INTO student_skills (student_id, skill_id, proficiency) 
            VALUES (?, ?, ?) 
            ON CONFLICT (student_id, skill_id) DO UPDATE SET proficiency = EXCLUDED.proficiency
        ');
        $stmt->execute([$student['id'], $skillId, $proficiency]);

        jsonResponse([
            'success' => true,
            'message' => 'Skill saved to profile.'
        ]);
    }

    /**
     * Upload resume to private protected storage
     */
    public static function uploadResume(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student not found.', 404);
        }

        if (!isset($_FILES['resume'])) {
            errorResponse('No resume file provided.');
        }

        $upload = FileUploadService::uploadResume($_FILES['resume']);
        if (!$upload['success']) {
            errorResponse($upload['error']);
        }

        $upStmt = $db->prepare('UPDATE students SET resume_storage_key = ? WHERE id = ?');
        $upStmt->execute([$upload['storageKey'], $student['id']]);

        jsonResponse([
            'success' => true,
            'message' => 'Resume uploaded to secure storage.',
            'hasResume' => true
        ]);
    }

    /**
     * Protected Resume Streaming Download
     * Enforces strict authorization: Student themselves, Admin, or Recruiter reviewing candidate's application
     */
    public static function streamResume(array $currentUser, string $studentId): void {
        $db = Database::getConnection();

        // 1. Fetch student resume key
        $sStmt = $db->prepare('SELECT id, user_id, name, resume_storage_key FROM students WHERE id = ?');
        $sStmt->execute([$studentId]);
        $student = $sStmt->fetch();

        if (!$student || empty($student['resume_storage_key'])) {
            errorResponse('Resume not found.', 404);
        }

        // 2. Authorization Check
        $isOwner = ($currentUser['user_id'] === $student['user_id']);
        $isAdmin = (($currentUser['role'] ?? '') === 'admin');
        $isAuthorizedRecruiter = false;

        if ($currentUser['role'] === 'recruiter') {
            // Check if student applied to any job posted by this recruiter's company
            $authCheckStmt = $db->prepare('
                SELECT a.id 
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                JOIN companies c ON j.company_id = c.id
                WHERE a.student_id = ? AND c.user_id = ?
                LIMIT 1
            ');
            $authCheckStmt->execute([$student['id'], $currentUser['user_id']]);
            $isAuthorizedRecruiter = (bool)$authCheckStmt->fetch();
        }

        if (!$isOwner && !$isAdmin && !$isAuthorizedRecruiter) {
            errorResponse('Access Denied: You do not have permission to view this candidate resume.', 403);
        }

        $filename = preg_replace('/[^a-zA-Z0-9_-]/', '_', $student['name']) . '_Resume.pdf';
        FileUploadService::streamProtectedFile($student['resume_storage_key'], $filename);
    }
}
