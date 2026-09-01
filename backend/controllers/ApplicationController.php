<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../services/MatchingService.php';
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
     * Recruiter lists candidate pipeline with strict company ownership check & real-time match scores
     */
    public static function getCandidates(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();

        $stageFilter = trim($_GET['stage'] ?? 'All');
        $search = trim($_GET['search'] ?? '');

        // 1. Strict Ownership Enforcement
        $sql = '
            SELECT a.id as app_id, a.stage, a.created_at as applied_at,
                   s.id as student_id, s.name, s.avatar_url, s.college, s.program, s.experience,
                   j.id as job_id, j.title as job_title
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
            $sql .= ' AND (s.name LIKE ? OR s.college LIKE ? OR j.title LIKE ?)';
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

            // Job skills from normalized dictionary
            $jskStmt = $db->prepare('
                SELECT s.name 
                FROM job_skills js
                JOIN skills s ON js.skill_id = s.id
                WHERE js.job_id = ?
            ');
            $jskStmt->execute([$row['job_id']]);
            $jobSkills = $jskStmt->fetchAll(PDO::FETCH_COLUMN);

            // Calculate match score
            $match = MatchingService::calculateMatch($studentSkills, $jobSkills);

            $diff = time() - strtotime($row['applied_at']);
            $appliedStr = $diff < 3600 ? 'Just now' : ($diff < 86400 ? (int)floor($diff / 3600) . ' hours ago' : (int)floor($diff / 86400) . ' days ago');

            $candidates[] = [
                'id'         => $row['student_id'],
                'appId'      => $row['app_id'],
                'name'       => $row['name'],
                'avatarUrl'  => $row['avatar_url'],
                'college'    => $row['college'],
                'program'    => $row['program'],
                'experience' => $row['experience'],
                'skills'     => $studentSkills,
                'match'      => $match,
                'stage'      => $row['stage'],
                'appliedAt'  => $appliedStr,
                'jobTitle'   => $row['job_title']
            ];
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

        $appId = trim($input['application_id'] ?? '');
        $newStage = strtolower(trim($input['stage'] ?? ''));

        $validStages = ['applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'];
        if (!in_array($newStage, $validStages, true)) {
            errorResponse('Invalid stage specified.');
        }

        // 1. Verify that this application belongs to a job owned by this recruiter
        $stmt = $db->prepare('
            SELECT a.id, a.student_id, s.user_id as student_user_id, j.title as job_title, c.name as company_name, c.user_id as company_user_id 
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

        $updateStmt = $db->prepare('UPDATE applications SET stage = ? WHERE id = ?');
        $updateStmt->execute([$newStage, $appId]);

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
}
