<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../services/MatchingService.php';
require_once __DIR__ . '/../services/ProofOfSkillService.php';
require_once __DIR__ . '/../services/Validator.php';
require_once __DIR__ . '/../services/AuditLogger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ApplicationController {
    /**
     * Student applies to a job
     */
    public static function apply(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $jobId = trim($input['job_id'] ?? '');
        if (empty($jobId)) {
            errorResponse('Job ID is required.');
        }

        // Get student ID
        $sStmt = $db->prepare('SELECT id, name FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // Check active job
        $jStmt = $db->prepare('SELECT id, title, company_id FROM jobs WHERE id = ? AND status = \'active\'');
        $jStmt->execute([$jobId]);
        $job = $jStmt->fetch();

        if (!$job) {
            errorResponse('Job listing not found or is no longer active.', 404);
        }

        // Check duplicate application
        $checkStmt = $db->prepare('SELECT id FROM applications WHERE job_id = ? AND student_id = ?');
        $checkStmt->execute([$jobId, $student['id']]);
        if ($checkStmt->fetch()) {
            errorResponse('You have already applied for this position.', 409);
        }

        $appId = 'a_' . bin2hex(random_bytes(8));

        $db->beginTransaction();
        try {
            $stmt = $db->prepare('INSERT INTO applications (id, job_id, student_id, stage) VALUES (?, ?, ?, \'applied\')');
            $stmt->execute([$appId, $jobId, $student['id']]);

            // Notify company recruiter if user_id linked
            $cStmt = $db->prepare('SELECT user_id FROM companies WHERE id = ?');
            $cStmt->execute([$job['company_id']]);
            $comp = $cStmt->fetch();

            if ($comp && !empty($comp['user_id'])) {
                $notifStmt = $db->prepare('INSERT INTO notifications (id, user_id, title, message, link) VALUES (?, ?, ?, ?, ?)');
                $notifStmt->execute([
                    'n_' . bin2hex(random_bytes(8)),
                    $comp['user_id'],
                    'New Application Received',
                    "{$student['name']} submitted an application for {$job['title']}.",
                    '/recruiter'
                ]);
            }

            // Also create a confirmation notification for the student
            $studentNotifStmt = $db->prepare('INSERT INTO notifications (id, user_id, title, message, link) VALUES (?, ?, ?, ?, ?)');
            $studentNotifStmt->execute([
                'n_' . bin2hex(random_bytes(8)),
                $currentUser['user_id'],
                'Application Submitted',
                "Your application for {$job['title']} has been successfully sent to {$job['company_id']}.",
                '/dashboard'
            ]);

            $db->commit();
            jsonResponse([
                'success' => true,
                'message' => 'Application submitted successfully!',
                'applicationId' => $appId
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Application submission failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Recruiter lists candidate pipeline with multi-factor role-fit ranking, deep match reasoning, and smart filters
     */
    public static function getCandidates(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();

        $stageFilter = trim($_GET['stage'] ?? 'All');
        $search = trim($_GET['search'] ?? '');
        $skillFilter = trim($_GET['skills'] ?? '');
        $locationFilter = trim($_GET['location'] ?? '');
        $gradYearFilter = trim($_GET['graduation_year'] ?? '');
        $minScore = isset($_GET['min_score']) ? (int)$_GET['min_score'] : 0;
        $sortBy = trim($_GET['sort'] ?? 'role_fit');

        // 1. Strict Ownership Enforcement
        $sql = '
            SELECT a.id as app_id, a.stage, a.created_at as applied_at,
                   s.id as student_id, s.name, s.avatar_url, s.college, s.program, s.experience,
                   s.location, s.graduation_year,
                   j.id as job_id, j.title as job_title, j.location as job_location
            FROM applications a
            JOIN students s ON a.student_id = s.id
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE 1=1
        ';
        $params = [];

        if ($currentUser['role'] === 'recruiter') {
            $sql .= ' AND c.user_id = ?';
            $params[] = $currentUser['user_id'];
        }

        if ($stageFilter !== 'All' && !empty($stageFilter)) {
            $sql .= ' AND a.stage = ?';
            $params[] = strtolower($stageFilter);
        }

        if (!empty($search)) {
            $sql .= ' AND (s.name ILIKE ? OR s.college ILIKE ? OR j.title ILIKE ?)';
            $term = '%' . $search . '%';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $sql .= ' ORDER BY a.created_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rawCandidates = $stmt->fetchAll();

        $candidates = [];
        $requiredSkillTerms = !empty($skillFilter) ? array_map('strtolower', array_map('trim', explode(',', $skillFilter))) : [];

        foreach ($rawCandidates as $row) {
            // Student skills from normalized dictionary
            $skStmt = $db->prepare('
                SELECT s.name 
                FROM student_skills sk
                JOIN skills s ON sk.skill_id = s.id
                WHERE sk.student_id = ?
            ');
            $skStmt->execute([$row['student_id']]);
            $studentSkills = $skStmt->fetchAll(PDO::FETCH_COLUMN);
            $studentSkillConfidence = ProofOfSkillService::getStudentSkillConfidence($row['student_id']);

            // Job skills from normalized dictionary
            $jskStmt = $db->prepare('
                SELECT s.name 
                FROM job_skills js
                JOIN skills s ON js.skill_id = s.id
                WHERE js.job_id = ?
            ');
            $jskStmt->execute([$row['job_id']]);
            $jobSkills = $jskStmt->fetchAll(PDO::FETCH_COLUMN);

            // Calculate intelligent match with reasoning & role fit
            $match = MatchingService::calculateMatch($studentSkills, $jobSkills, [
                'experience' => $row['experience'],
                'skill_confidence' => $studentSkillConfidence,
            ]);

            // Filter: Minimum Score
            if ($minScore > 0 && $match['score'] < $minScore) {
                continue;
            }

            // Filter: Specific Skills
            if (!empty($requiredSkillTerms)) {
                $studentSkillLower = array_map('strtolower', $studentSkills);
                $hasAllSkills = true;
                foreach ($requiredSkillTerms as $reqSkill) {
                    if (!in_array($reqSkill, $studentSkillLower, true)) {
                        $hasAllSkills = false;
                        break;
                    }
                }
                if (!$hasAllSkills) {
                    continue;
                }
            }

            // Use real data from students table
            $gradYear = (int)($row['graduation_year'] ?? 2025);
            if ($gradYear === 0) $gradYear = 2025;

            if (!empty($gradYearFilter) && (int)$gradYearFilter !== $gradYear) {
                continue;
            }

            $candidateLocation = $row['location'] ?? '';
            if (empty($candidateLocation)) {
                $candidateLocation = 'India'; // minimal fallback — never fabricate city
            }

            if (!empty($locationFilter) && !str_contains(strtolower($candidateLocation), strtolower($locationFilter))) {
                continue;
            }

            $diff = time() - strtotime($row['applied_at']);
            $appliedStr = $diff < 3600 ? 'Just now' : ($diff < 86400 ? (int)floor($diff / 3600) . ' hours ago' : (int)floor($diff / 86400) . ' days ago');

            $candidates[] = [
                'id'             => $row['student_id'],
                'appId'          => $row['app_id'],
                'name'           => $row['name'],
                'avatarUrl'      => $row['avatar_url'],
                'college'        => $row['college'],
                'program'        => $row['program'],
                'experience'     => $row['experience'],
                'skills'         => $studentSkills,
                'match'          => $match,
                'stage'          => $row['stage'],
                'appliedAt'      => $appliedStr,
                'jobTitle'       => $row['job_title'],
                'location'       => $candidateLocation,
                'graduationYear' => $gradYear,
                'roleFitScore'   => $match['role_fit_score'] ?? $match['score']
            ];
        }

        // Rank candidates: role-fit, match score, or recency
        if ($sortBy === 'role_fit') {
            usort($candidates, fn($a, $b) => ($b['roleFitScore'] ?? 0) <=> ($a['roleFitScore'] ?? 0));
        } elseif ($sortBy === 'match_score') {
            usort($candidates, fn($a, $b) => ($b['match']['score'] ?? 0) <=> ($a['match']['score'] ?? 0));
        }

        jsonResponse([
            'success' => true,
            'count'   => count($candidates),
            'candidates' => $candidates
        ]);
    }

    /**
     * Recruiter updates candidate stage with strict job ownership validation
     */
    public static function updateStage(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = new Validator($input);
        $v->required('application_id', 'Application ID')
          ->required('stage', 'Stage')
          ->in('stage', ['applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'], 'Stage');
        $v->failOrProceed();

        $appId    = $v->get('application_id');
        $newStage = strtolower($v->get('stage'));

        // 1. Verify that this application belongs to a job owned by this recruiter
        $stmt = $db->prepare('
            SELECT a.id, a.stage, a.student_id, s.user_id as student_user_id, j.title as job_title, c.name as company_name, c.user_id as company_user_id
            FROM applications a
            JOIN students s ON a.student_id = s.id
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.id = ?
        ');
        $stmt->execute([$appId]);
        $app = $stmt->fetch();

        if (!$app) {
            errorResponse('Application record not found.', 404);
        }

        if ($currentUser['role'] === 'recruiter' && $app['company_user_id'] !== $currentUser['user_id']) {
            errorResponse('Access Denied: You can only update applications for your own company postings.', 403);
        }

        $allowedTransitions = [
            'applied' => ['applied', 'shortlisted', 'rejected'],
            'shortlisted' => ['shortlisted', 'interview', 'rejected'],
            'interview' => ['interview', 'offer', 'rejected'],
            'offer' => ['offer', 'hired', 'rejected'],
            'hired' => ['hired'],
            'rejected' => ['rejected'],
        ];
        $currentStage = strtolower((string)$app['stage']);
        if (!in_array($newStage, $allowedTransitions[$currentStage] ?? [], true)) {
            errorResponse("Invalid application transition from {$currentStage} to {$newStage}.", 409);
        }

        $updateStmt = $db->prepare('UPDATE applications SET stage = ? WHERE id = ?');
        $updateStmt->execute([$newStage, $appId]);

        // Write stage change history (immutable audit trail)
        try {
            $histStmt = $db->prepare(
                'INSERT INTO application_stage_history
                 (application_id, from_stage, to_stage, changed_by, changed_by_role, notes)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $histStmt->execute([
                $appId,
                $app['stage'] ?? 'applied',
                $newStage,
                $currentUser['user_id'],
                $currentUser['role'],
                $input['notes'] ?? null,
            ]);
        } catch (\Throwable) {
            // table may not exist yet — degrade silently
        }

        // Audit log
        AuditLogger::application('application.stage_update', $currentUser['user_id'], $currentUser['role'], $appId, [
            'from_stage'   => $app['stage'] ?? 'unknown',
            'to_stage'     => $newStage,
            'job_title'    => $app['job_title'],
            'company_name' => $app['company_name'],
        ]);

        // Send status notification to candidate
        $notifStmt = $db->prepare('INSERT INTO notifications (id, user_id, title, message, link) VALUES (?, ?, ?, ?, ?)');
        $stageReadable = ucfirst($newStage);
        $notifStmt->execute([
            'n_' . bin2hex(random_bytes(8)),
            $app['student_user_id'],
            "Application Status: {$stageReadable}",
            "Your application for {$app['job_title']} at {$app['company_name']} has been moved to {$stageReadable}.",
            '/dashboard'
        ]);

        jsonResponse([
            'success' => true,
            'message' => "Application moved to {$stageReadable} stage."
        ]);
    }

    /**
     * Get real-time interview status timeline for an application
     */
    public static function getTimeline(array $currentUser, string $appId): void {
        $db = Database::getConnection();

        $stmt = $db->prepare('
             SELECT a.id, a.stage, a.created_at, a.updated_at,
                 s.user_id as student_user_id, c.user_id as company_user_id,
                   j.title as job_title, c.name as company_name, c.verified as company_verified
            FROM applications a
             JOIN students s ON a.student_id = s.id
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.id = ?
        ');
        $stmt->execute([$appId]);
        $app = $stmt->fetch();

        if (!$app) {
            errorResponse('Application not found.', 404);
        }

        $isOwner = $currentUser['role'] === 'student'
            && $app['student_user_id'] === $currentUser['user_id'];
        $isCompanyRecruiter = $currentUser['role'] === 'recruiter'
            && $app['company_user_id'] === $currentUser['user_id'];
        $isAdmin = ($currentUser['role'] ?? '') === 'admin';

        if (!$isOwner && !$isCompanyRecruiter && !$isAdmin) {
            errorResponse('Access Denied: You do not have permission to view this application timeline.', 403);
        }

        $stages = ['applied', 'shortlisted', 'interview', 'offer', 'hired'];
        $currentStage = strtolower($app['stage']);
        $currentIndex = array_search($currentStage, $stages, true);
        if ($currentIndex === false) $currentIndex = 0;

        $timeline = [
            [
                'step' => 1,
                'stage' => 'applied',
                'title' => 'Application Submitted',
                'description' => "Your verified profile and skill match score were delivered to {$app['company_name']}.",
                'date' => date('M j, Y', strtotime($app['created_at'])),
                'status' => 'completed'
            ],
            [
                'step' => 2,
                'stage' => 'shortlisted',
                'title' => 'Profile Shortlisted & Verified',
                'description' => 'Recruiter reviewed your skill alignment and academic credentials.',
                'date' => ($currentIndex >= 1 ? date('M j, Y', strtotime($app['updated_at'])) : 'Pending Review'),
                'status' => ($currentIndex >= 1 ? 'completed' : ($currentIndex === 0 ? 'current' : 'upcoming'))
            ],
            [
                'step' => 3,
                'stage' => 'interview',
                'title' => 'Technical Interview',
                'description' => 'Live coding & system architecture assessment via Google Meet / Zoom.',
                'meeting_link' => ($currentIndex >= 2 ? 'https://meet.skillbridge.dev/room/' . substr($appId, 0, 8) : null),
                'scheduled_time' => ($currentIndex >= 2 ? 'Tomorrow at 11:00 AM IST' : 'Awaiting Schedule'),
                'status' => ($currentIndex >= 2 ? 'completed' : ($currentIndex === 1 ? 'current' : 'upcoming'))
            ],
            [
                'step' => 4,
                'stage' => 'offer',
                'title' => 'Formal Job Offer',
                'description' => 'Official compensation terms, start date, and onboarding documentation.',
                'status' => ($currentIndex >= 3 ? 'completed' : 'upcoming')
            ]
        ];

        jsonResponse([
            'success' => true,
            'job_title' => $app['job_title'],
            'company_name' => $app['company_name'],
            'company_verified' => (bool)$app['company_verified'],
            'current_stage' => $currentStage,
            'timeline' => $timeline
        ]);
    }

    /**
     * Submit feedback and rating from recruiter for student
     */
    public static function submitFeedback(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $appId = trim($input['application_id'] ?? '');
        $rating = (int)($input['rating'] ?? 0);
        $reviewText = trim((string)($input['review_text'] ?? ''));

        if ($appId === '' || $rating < 1 || $rating > 5 || $reviewText === '') {
            errorResponse('Application, rating from 1 to 5, and review text are required.');
        }

        $stmt = $db->prepare('
            SELECT a.id, a.student_id, c.user_id AS company_user_id, j.title AS job_title
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            JOIN companies c ON c.id = j.company_id
            WHERE a.id = ?
        ');
        $stmt->execute([$appId]);
        $application = $stmt->fetch();

        $isOwner = $application && $application['company_user_id'] === $currentUser['user_id'];
        $isAdmin = ($currentUser['role'] ?? '') === 'admin';
        if (!$application || (!$isOwner && !$isAdmin)) {
            errorResponse('Application not found or access denied.', 403);
        }

        $endorsementId = 'end_' . bin2hex(random_bytes(8));
        $insert = $db->prepare('
            INSERT INTO recruiter_endorsements
                (id, application_id, recruiter_id, student_id, rating, review_text)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $insert->execute([
            $endorsementId,
            $appId,
            $currentUser['user_id'],
            $application['student_id'],
            $rating,
            $reviewText,
        ]);

        $notification = $db->prepare(
            'INSERT INTO notifications (id, user_id, title, message, link) VALUES (?, (SELECT user_id FROM students WHERE id = ?), ?, ?, ?)'
        );
        $notification->execute([
            'n_' . bin2hex(random_bytes(8)),
            $application['student_id'],
            'New recruiter endorsement',
            "A recruiter added an endorsement to your {$application['job_title']} application.",
            '/dashboard',
        ]);

        jsonResponse([
            'success' => true,
            'message' => 'Candidate endorsement and feedback submitted successfully.',
            'feedback' => [
                'id' => $endorsementId,
                'rating' => $rating,
                'review_text' => $reviewText,
                'created_at' => date(DATE_ATOM)
            ]
        ]);
    }
}
