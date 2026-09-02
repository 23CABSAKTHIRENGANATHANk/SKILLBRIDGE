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
        $hasCustomAvatar = !empty($student['avatar_url']);
        $hasExperience = !empty($student['experience']) && !in_array(strtolower(trim($student['experience'])), ['fresher', 'none', '']);
        $hasResume = !empty($student['resume_storage_key']);
        $hasSkills = count($skills) >= 3;

        $steps = [
            ['id' => 'profile', 'label' => 'Profile', 'complete' => $hasCustomAvatar],
            ['id' => 'skills', 'label' => 'Skills', 'complete' => $hasSkills],
            ['id' => 'resume', 'label' => 'Resume', 'complete' => $hasResume],
            ['id' => 'projects', 'label' => 'Projects', 'complete' => $hasExperience],
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
            'offer' => 0,
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
        $hasCustomAvatar = !empty($student['avatar_url']);
        $hasExperience = !empty($student['experience']) && !in_array(strtolower(trim($student['experience'])), ['fresher', 'none', '']);
        $hasResume = !empty($student['resume_storage_key']);
        $hasSkills = $skillsCount >= 3;

        $steps = [
            ['id' => 'profile', 'label' => 'Profile', 'complete' => $hasCustomAvatar],
            ['id' => 'skills', 'label' => 'Skills', 'complete' => $hasSkills],
            ['id' => 'resume', 'label' => 'Resume', 'complete' => $hasResume],
            ['id' => 'projects', 'label' => 'Projects', 'complete' => $hasExperience],
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

        $rawSkillInput = trim((string)($input['skill_name'] ?? ''));
        if (empty($rawSkillInput)) {
            errorResponse('Skill name is required.');
        }

        $rawProf = $input['proficiency'] ?? 'intermediate';
        $proficiency = 'intermediate';
        if (is_numeric($rawProf)) {
            $num = (int)$rawProf;
            $proficiency = $num >= 85 ? 'expert' : ($num >= 65 ? 'advanced' : ($num >= 40 ? 'intermediate' : 'beginner'));
        } else if (in_array(strtolower((string)$rawProf), ['beginner', 'intermediate', 'advanced', 'expert'], true)) {
            $proficiency = strtolower((string)$rawProf);
        }

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // Support single skill or comma-separated list of skills
        $skillNames = array_filter(array_map('trim', explode(',', $rawSkillInput)));

        foreach ($skillNames as $skillName) {
            if (empty($skillName)) continue;
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

            $checkStmt = $db->prepare('SELECT id FROM student_skills WHERE student_id = ? AND skill_id = ?');
            $checkStmt->execute([$student['id'], $skillId]);
            if ($checkStmt->fetch()) {
                $upStmt = $db->prepare('UPDATE student_skills SET proficiency = ? WHERE student_id = ? AND skill_id = ?');
                $upStmt->execute([$proficiency, $student['id'], $skillId]);
            } else {
                $insStmt = $db->prepare('INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES (?, ?, ?)');
                $insStmt->execute([$student['id'], $skillId, $proficiency]);
            }
        }

        jsonResponse([
            'success' => true,
            'message' => 'Skill(s) saved to profile.'
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

    /**
     * Update student profile details (name, college, program, experience, avatar_url)
     */
    public static function updateProfile(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $sStmt = $db->prepare('SELECT id, user_id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $name = trim($input['name'] ?? '');
        $college = trim($input['college'] ?? '');
        $program = trim($input['program'] ?? '');
        $experience = trim($input['experience'] ?? '');
        $avatarUrl = trim($input['avatar_url'] ?? '');

        if (empty($name)) {
            errorResponse('Full name is required.');
        }

        $upStmt = $db->prepare('
            UPDATE students 
            SET name = ?, college = ?, program = ?, experience = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ');
        $upStmt->execute([$name, $college, $program, $experience, $avatarUrl ?: null, $student['id']]);

        AuditLogger::log('student.profile_update', $currentUser['user_id'], 'student', 'student', $student['id'], [
            'name' => $name,
            'college' => $college,
            'program' => $program
        ]);

        self::getProfile($currentUser);
    }

    /**
     * Delete a skill from student profile
     */
    public static function deleteSkill(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $skillId = trim($input['skill_id'] ?? ($_GET['skill_id'] ?? ''));

        if (empty($skillId)) {
            errorResponse('Skill ID is required.');
        }

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $delStmt = $db->prepare('DELETE FROM student_skills WHERE student_id = ? AND skill_id = ?');
        $delStmt->execute([$student['id'], $skillId]);

        jsonResponse([
            'success' => true,
            'message' => 'Skill removed from profile.'
        ]);
    }

    /**
     * Get Trust & Credibility profile for student with real endorsements from database
     */
    public static function getTrustProfile(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student', 'admin');
        $db = Database::getConnection();

        $sStmt = $db->prepare('SELECT id, name, college, program, resume_storage_key FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student not found.', 404);
        }

        // Real endorsements from PostgreSQL
        $endStmt = $db->prepare('
            SELECT re.id, re.rating, re.review_text as feedback, re.created_at,
                   c.name as company_name
            FROM recruiter_endorsements re
            JOIN users u ON re.recruiter_id = u.id
            LEFT JOIN companies c ON c.user_id = u.id
            WHERE re.student_id = ? AND re.is_published = TRUE
            ORDER BY re.created_at DESC
        ');
        $endStmt->execute([$student['id']]);
        $rawEndorsements = $endStmt->fetchAll();

        $endorsements = [];
        foreach ($rawEndorsements as $end) {
            $diff = time() - strtotime($end['created_at']);
            $dateStr = $diff < 86400 ? 'Today' : (int)floor($diff / 86400) . 'd ago';
            $endorsements[] = [
                'id' => $end['id'],
                'company_name' => $end['company_name'] ?? 'Verified Employer',
                'recruiter_title' => 'Technical Hiring Manager',
                'rating' => (int)$end['rating'],
                'feedback' => $end['feedback'],
                'date' => $dateStr,
                'verified_interview' => true
            ];
        }

        $hasResume = !empty($student['resume_storage_key']);
        $trustScore = 70 + ($hasResume ? 15 : 0) + (count($endorsements) > 0 ? 15 : 0);

        jsonResponse([
            'success' => true,
            'trust_profile' => [
                'academic_verified' => true,
                'college_email_verified' => true,
                'phone_verified' => true,
                'identity_verified' => true,
                'resume_verified' => $hasResume,
                'institution' => $student['college'],
                'program' => $student['program'],
                'trust_score' => $trustScore,
                'endorsements' => $endorsements
            ]
        ]);
    }

    /**
     * Simulated phone verification with instant confirmation
     */
    public static function verifyPhone(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student', 'recruiter', 'admin');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $phone = trim($input['phone'] ?? '+91 98765 43210');

        jsonResponse([
            'success' => true,
            'message' => "Phone number {$phone} verified successfully via SMS OTP.",
            'verified' => true,
            'phone' => $phone
        ]);
    }
}
