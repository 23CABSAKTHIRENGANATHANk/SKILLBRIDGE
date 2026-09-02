<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../services/Validator.php';
require_once __DIR__ . '/../services/AuditLogger.php';
require_once __DIR__ . '/../services/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class InterviewController {
    /**
     * Schedule a new interview (Recruiter / Admin only)
     */
    public static function schedule(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = new Validator($input);
        $v->required('application_id', 'Application ID')
          ->required('scheduled_at', 'Scheduled Date/Time')
          ->optional('meeting_link', '')
          ->optional('notes', '');
        $v->failOrProceed();

        $appId = $v->get('application_id');
        $scheduledAtStr = $v->get('scheduled_at');
        $meetingLink = trim((string)$v->get('meeting_link', ''));
        $notes = trim((string)$v->get('notes', ''));

        // Validate scheduled_at timestamp
        $timestamp = strtotime($scheduledAtStr);
        if ($timestamp === false || $timestamp < (time() - 300)) {
            errorResponse('Please provide a valid future date and time for the interview.', 422);
        }
        $scheduledAt = date('Y-m-d H:i:s', $timestamp);

        // Verify application and recruiter ownership
        $stmt = $db->prepare('
            SELECT a.id, a.stage, a.student_id, s.user_id as student_user_id, s.name as student_name,
                   j.id as job_id, j.title as job_title, c.id as company_id, c.name as company_name, c.user_id as company_user_id
            FROM applications a
            JOIN students s ON a.student_id = s.id
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.id = ?
            LIMIT 1
        ');
        $stmt->execute([$appId]);
        $app = $stmt->fetch();

        if (!$app) {
            errorResponse('Application not found.', 404);
        }

        if ($currentUser['role'] === 'recruiter' && $app['company_user_id'] !== $currentUser['user_id']) {
            errorResponse('Access Denied: You can only schedule interviews for your own job openings.', 403);
        }

        if (!in_array($app['stage'], ['shortlisted', 'interview'], true)) {
            errorResponse('The application must be shortlisted before an interview can be scheduled.', 409);
        }

        $activeInterview = $db->prepare(
            "SELECT id FROM interviews WHERE application_id = ? AND status IN ('scheduled', 'rescheduled') LIMIT 1"
        );
        $activeInterview->execute([$appId]);
        if ($activeInterview->fetch()) {
            errorResponse('An active interview already exists for this application.', 409);
        }

        $interviewId = 'int_' . bin2hex(random_bytes(8));

        $db->beginTransaction();
        try {
            // Insert interview record
            $insStmt = $db->prepare('
                INSERT INTO interviews (id, application_id, scheduled_at, meeting_link, notes, status)
                VALUES (?, ?, ?, ?, ?, \'scheduled\')
            ');
            $insStmt->execute([$interviewId, $appId, $scheduledAt, $meetingLink ?: null, $notes ?: null]);

            // Automatically update application stage to 'interview' if needed
            if ($app['stage'] !== 'interview' && $app['stage'] !== 'offer' && $app['stage'] !== 'hired') {
                $updStmt = $db->prepare('UPDATE applications SET stage = \'interview\' WHERE id = ?');
                $updStmt->execute([$appId]);
            }

            // Create high-priority notification for student
            $notifDate = date('M j, Y \a\t g:i A', $timestamp);
            $notifMsg = "Interview scheduled with {$app['company_name']} for {$app['job_title']} on {$notifDate}.";
            if (!empty($meetingLink)) {
                $notifMsg .= " Meeting Link: {$meetingLink}";
            }

            $notifStmt = $db->prepare('INSERT INTO notifications (id, user_id, title, message, link) VALUES (?, ?, ?, ?, ?)');
            $notifStmt->execute([
                'n_' . bin2hex(random_bytes(8)),
                $app['student_user_id'],
                '🗓️ Interview Scheduled: ' . $app['job_title'],
                $notifMsg,
                '/dashboard'
            ]);

            $db->commit();

            // Audit
            AuditLogger::log(
                'interview.schedule',
                $currentUser['user_id'],
                $currentUser['role'],
                'interview',
                $interviewId,
                [
                    'application_id' => $appId,
                    'student_name'   => $app['student_name'],
                    'job_title'      => $app['job_title'],
                    'scheduled_at'   => $scheduledAt,
                ]
            );

            jsonResponse([
                'success' => true,
                'message' => "Interview successfully scheduled for {$notifDate}.",
                'interview' => [
                    'id'           => $interviewId,
                    'applicationId'=> $appId,
                    'scheduledAt'  => $scheduledAt,
                    'meetingLink'  => $meetingLink,
                    'notes'        => $notes,
                    'status'       => 'scheduled',
                ]
            ], 201);
        } catch (\Throwable $e) {
            $db->rollBack();
            errorResponse('Failed to schedule interview: ' . $e->getMessage(), 500);
        }
    }

    /**
     * List interviews for current student or recruiter
     */
    public static function list(array $currentUser): void {
        $db = Database::getConnection();

        if ($currentUser['role'] === 'student') {
            $stmt = $db->prepare('
                SELECT i.id, i.scheduled_at, i.meeting_link, i.notes, i.status, i.created_at,
                       a.id as application_id, a.stage as application_stage,
                       j.id as job_id, j.title as job_title, j.location as job_location, j.type as job_type,
                       c.id as company_id, c.name as company_name, c.logo_url as company_logo, c.verified as company_verified
                FROM interviews i
                JOIN applications a ON i.application_id = a.id
                JOIN students s ON a.student_id = s.id
                JOIN jobs j ON a.job_id = j.id
                JOIN companies c ON j.company_id = c.id
                WHERE s.user_id = ?
                ORDER BY i.scheduled_at ASC
            ');
            $stmt->execute([$currentUser['user_id']]);
            $interviews = $stmt->fetchAll();
        } else {
            // Recruiter or Admin
            $sql = '
                SELECT i.id, i.scheduled_at, i.meeting_link, i.notes, i.status, i.created_at,
                       a.id as application_id, a.stage as application_stage,
                       s.id as student_id, s.name as student_name, s.avatar_url as student_avatar, s.college as student_college,
                       j.id as job_id, j.title as job_title,
                       c.id as company_id, c.name as company_name
                FROM interviews i
                JOIN applications a ON i.application_id = a.id
                JOIN students s ON a.student_id = s.id
                JOIN jobs j ON a.job_id = j.id
                JOIN companies c ON j.company_id = c.id
            ';
            $params = [];
            if ($currentUser['role'] === 'recruiter') {
                $sql .= ' WHERE c.user_id = ?';
                $params[] = $currentUser['user_id'];
            }
            $sql .= ' ORDER BY i.scheduled_at ASC';

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $interviews = $stmt->fetchAll();
        }

        // Format and clean dates
        $formatted = array_map(function($row) {
            $timestamp = strtotime($row['scheduled_at']);
            return array_merge($row, [
                'company_verified' => isset($row['company_verified']) ? (bool)$row['company_verified'] : false,
                'is_upcoming'      => $timestamp > time() && ($row['status'] === 'scheduled' || $row['status'] === 'rescheduled'),
                'scheduled_date'   => date('Y-m-d', $timestamp),
                'scheduled_time'   => date('h:i A', $timestamp),
            ]);
        }, $interviews);

        jsonResponse([
            'success'    => true,
            'count'      => count($formatted),
            'interviews' => $formatted,
        ]);
    }

    /**
     * Update interview status (e.g. completed, cancelled, rescheduled)
     */
    public static function updateStatus(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = new Validator($input);
        $v->required('interview_id', 'Interview ID')
          ->required('status', 'Status')
          ->in('status', ['scheduled', 'completed', 'cancelled', 'rescheduled'], 'Status');
        $v->failOrProceed();

        $interviewId = $v->get('interview_id');
        $status = $v->get('status');

        $stmt = $db->prepare('
            SELECT i.id, i.application_id, c.user_id as company_user_id, s.user_id as student_user_id, j.title as job_title
            FROM interviews i
            JOIN applications a ON i.application_id = a.id
            JOIN students s ON a.student_id = s.id
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE i.id = ?
            LIMIT 1
        ');
        $stmt->execute([$interviewId]);
        $row = $stmt->fetch();

        if (!$row) {
            errorResponse('Interview not found.', 404);
        }

        if ($currentUser['role'] === 'recruiter' && $row['company_user_id'] !== $currentUser['user_id']) {
            errorResponse('Access Denied.', 403);
        }

        $upd = $db->prepare('UPDATE interviews SET status = ? WHERE id = ?');
        $upd->execute([$status, $interviewId]);

        // Notify student if cancelled or completed
        $notifStmt = $db->prepare('INSERT INTO notifications (id, user_id, title, message, link) VALUES (?, ?, ?, ?, ?)');
        $notifStmt->execute([
            'n_' . bin2hex(random_bytes(8)),
            $row['student_user_id'],
            "Interview Status Update: " . ucfirst($status),
            "Your interview for {$row['job_title']} has been marked as {$status}.",
            '/dashboard'
        ]);

        jsonResponse([
            'success' => true,
            'message' => "Interview status updated to {$status}."
        ]);
    }
}
