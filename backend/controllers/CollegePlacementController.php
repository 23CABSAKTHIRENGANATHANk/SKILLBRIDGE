<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/AuditLogger.php';

/**
 * CollegePlacementController
 *
 * Manages the College Placement Mode for SkillBridge 3.0.
 *
 * Roles allowed:
 *  - college_admin  → full dashboard, student list, drive management
 *  - admin          → super-admin cross-college visibility
 *
 * All metrics derive from REAL database data.
 * No mock data is returned.
 */
class CollegePlacementController {

    /**
     * GET /college/dashboard
     * Returns aggregated placement statistics for the authenticated college admin.
     */
    public static function getDashboard(array $currentUser): void {
        self::requireCollegeRole($currentUser);
        $db = Database::getConnection();

        $collegeGroup = self::resolveCollegeGroup($db, $currentUser);

        // Total enrolled students
        $totalStmt = $db->prepare('
            SELECT COUNT(*) FROM placement_students WHERE college_group_id = ?
        ');
        $totalStmt->execute([$collegeGroup['id']]);
        $totalStudents = (int)$totalStmt->fetchColumn();

        // Students with at least one completed verification
        $verifiedStmt = $db->prepare('
            SELECT COUNT(DISTINCT ps.student_id)
            FROM placement_students ps
            JOIN skill_verification_attempts sva ON sva.student_id = ps.student_id
            WHERE ps.college_group_id = ? AND sva.status = \'completed\' AND sva.passed = TRUE
        ');
        $verifiedStmt->execute([$collegeGroup['id']]);
        $verifiedStudents = (int)$verifiedStmt->fetchColumn();

        // Students with valid passport
        $passportStmt = $db->prepare('
            SELECT COUNT(DISTINCT ps.student_id)
            FROM placement_students ps
            JOIN student_passports sp ON sp.student_id = ps.student_id
            JOIN skill_credentials sc ON sc.passport_token = sp.public_token
            WHERE ps.college_group_id = ? AND sc.status = \'VALID\'
        ');
        $passportStmt->execute([$collegeGroup['id']]);
        $passportedStudents = (int)$passportStmt->fetchColumn();

        // Active job drives
        $drivesStmt = $db->prepare('
            SELECT COUNT(*) FROM placement_job_drives
            WHERE college_group_id = ? AND status = \'active\'
        ');
        $drivesStmt->execute([$collegeGroup['id']]);
        $activeDrives = (int)$drivesStmt->fetchColumn();

        // Average trust score
        $avgTrustStmt = $db->prepare('
            SELECT COALESCE(AVG(sts.trust_score), 0) as avg_trust
            FROM placement_students ps
            JOIN skill_trust_scores sts ON sts.student_id = ps.student_id
            WHERE ps.college_group_id = ?
        ');
        $avgTrustStmt->execute([$collegeGroup['id']]);
        $avgTrust = (float)$avgTrustStmt->fetchColumn();

        // Top skills across all placement students (batch join)
        $topSkillsStmt = $db->prepare('
            SELECT sk.name, COUNT(*) AS student_count
            FROM placement_students ps
            JOIN student_skills ss ON ss.student_id = ps.student_id
            JOIN skills sk ON sk.id = ss.skill_id
            WHERE ps.college_group_id = ?
            GROUP BY sk.name
            ORDER BY student_count DESC
            LIMIT 10
        ');
        $topSkillsStmt->execute([$collegeGroup['id']]);
        $topSkills = $topSkillsStmt->fetchAll();

        // Applications (shortlisted/hired) for placement students
        $appStmt = $db->prepare('
            SELECT stage, COUNT(*) AS cnt
            FROM applications a
            JOIN placement_students ps ON ps.student_id = a.student_id
            WHERE ps.college_group_id = ?
            GROUP BY stage
        ');
        $appStmt->execute([$collegeGroup['id']]);
        $appStages = [];
        foreach ($appStmt->fetchAll() as $row) {
            $appStages[$row['stage']] = (int)$row['cnt'];
        }

        jsonResponse([
            'college'            => ['id' => $collegeGroup['id'], 'name' => $collegeGroup['name']],
            'total_students'     => $totalStudents,
            'verified_students'  => $verifiedStudents,
            'passported_students'=> $passportedStudents,
            'verification_rate'  => $totalStudents > 0
                ? round(($verifiedStudents / $totalStudents) * 100, 1)
                : 0,
            'active_drives'      => $activeDrives,
            'avg_trust_score'    => round($avgTrust, 1),
            'top_skills'         => $topSkills,
            'application_stages' => $appStages,
            'placements'         => [
                'shortlisted' => $appStages['shortlisted'] ?? 0,
                'interview'   => $appStages['interview'] ?? 0,
                'offer'       => $appStages['offer'] ?? 0,
                'hired'       => $appStages['hired'] ?? 0,
            ],
        ]);
    }

    /**
     * GET /college/students
     * Paginated list of enrolled students with verification/passport status.
     */
    public static function getStudents(array $currentUser): void {
        self::requireCollegeRole($currentUser);
        $db = Database::getConnection();

        $collegeGroup = self::resolveCollegeGroup($db, $currentUser);
        $page   = max(1, (int)($_GET['page'] ?? 1));
        $limit  = min(50, max(10, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $search = trim((string)($_GET['search'] ?? ''));

        $where  = 'WHERE ps.college_group_id = ?';
        $params = [$collegeGroup['id']];
        if (!empty($search)) {
            $where .= ' AND (LOWER(s.name) LIKE ? OR LOWER(s.college) LIKE ?)';
            $params[] = '%' . strtolower($search) . '%';
            $params[] = '%' . strtolower($search) . '%';
        }

        // Count
        $countStmt = $db->prepare("
            SELECT COUNT(*)
            FROM placement_students ps
            JOIN students s ON s.id = ps.student_id
            {$where}
        ");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Fetch students
        $stmt = $db->prepare("
            SELECT s.id, s.name, s.college, s.program, s.experience, s.avatar_url,
                   ps.department, ps.batch_year, ps.enrolled_at,
                   sp.public_token AS passport_token,
                   sc.status AS credential_status,
                   -- Verification summary
                   (SELECT COUNT(*) FROM skill_verification_attempts sva
                    WHERE sva.student_id = s.id AND sva.status = 'completed' AND sva.passed = TRUE) AS verified_skills,
                   -- Avg trust score
                   (SELECT COALESCE(AVG(sts.trust_score), 0) FROM skill_trust_scores sts
                    WHERE sts.student_id = s.id) AS avg_trust_score,
                   -- Skill count
                   (SELECT COUNT(*) FROM student_skills ss WHERE ss.student_id = s.id) AS total_skills
            FROM placement_students ps
            JOIN students s ON s.id = ps.student_id
            LEFT JOIN student_passports sp ON sp.student_id = s.id
            LEFT JOIN skill_credentials sc ON sc.passport_token = sp.public_token AND sc.status = 'VALID'
            {$where}
            ORDER BY s.name ASC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute(array_merge($params, [$limit, $offset]));
        $students = $stmt->fetchAll();

        jsonResponse([
            'students'   => $students,
            'total'      => $total,
            'page'       => $page,
            'limit'      => $limit,
            'total_pages'=> (int)ceil($total / $limit),
        ]);
    }

    /**
     * POST /college/drives
     * Create a job drive for this college.
     */
    public static function createDrive(array $currentUser): void {
        self::requireCollegeRole($currentUser);
        $db = Database::getConnection();

        $collegeGroup = self::resolveCollegeGroup($db, $currentUser);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $jobId       = trim((string)($input['job_id'] ?? ''));
        $title       = trim((string)($input['title'] ?? ''));
        $description = trim((string)($input['description'] ?? ''));
        $driveDate   = !empty($input['drive_date']) ? $input['drive_date'] : null;
        $minTrust    = max(0, min(100, (int)($input['min_trust_score'] ?? 0)));

        if (empty($title)) {
            errorResponse('Drive title is required.', 422);
        }

        // Validate job if provided
        if (!empty($jobId)) {
            $jStmt = $db->prepare('SELECT id FROM jobs WHERE id = ? AND status = \'active\'');
            $jStmt->execute([$jobId]);
            if (!$jStmt->fetch()) {
                errorResponse('Job not found or not active.', 404);
            }
        }

        $driveId = bin2hex(random_bytes(16));
        $stmt = $db->prepare('
            INSERT INTO placement_job_drives
                (id, college_group_id, job_id, title, description, drive_date, min_trust_score, created_by, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'active\')
        ');
        $stmt->execute([
            $driveId,
            $collegeGroup['id'],
            !empty($jobId) ? $jobId : null,
            $title,
            $description ?: null,
            $driveDate,
            $minTrust,
            $currentUser['user_id'],
        ]);

        AuditLogger::log(
            'college.drive.create',
            $currentUser['user_id'],
            $currentUser['role'],
            'placement_job_drive',
            $driveId
        );

        jsonResponse(['message' => 'Drive created successfully.', 'drive_id' => $driveId], 201);
    }

    /**
     * GET /college/analytics
     * Placement funnel analytics derived from real DB data.
     */
    public static function getAnalytics(array $currentUser): void {
        self::requireCollegeRole($currentUser);
        $db = Database::getConnection();

        $collegeGroup = self::resolveCollegeGroup($db, $currentUser);

        // Skill distribution (top 15)
        $skillDistStmt = $db->prepare('
            SELECT sk.name AS skill, sk.category,
                   COUNT(DISTINCT ps.student_id) AS student_count,
                   COALESCE(AVG(sts.trust_score), 0) AS avg_trust
            FROM placement_students ps
            JOIN student_skills ss ON ss.student_id = ps.student_id
            JOIN skills sk ON sk.id = ss.skill_id
            LEFT JOIN skill_trust_scores sts ON sts.student_id = ps.student_id AND sts.skill_id = ss.skill_id
            WHERE ps.college_group_id = ?
            GROUP BY sk.name, sk.category
            ORDER BY student_count DESC
            LIMIT 15
        ');
        $skillDistStmt->execute([$collegeGroup['id']]);
        $skillDistribution = $skillDistStmt->fetchAll();

        // Verification funnel
        $funnelStmt = $db->prepare('
            SELECT
                COUNT(DISTINCT ps.student_id) AS enrolled,
                COUNT(DISTINCT CASE WHEN sva.status = \'completed\' THEN ps.student_id END) AS attempted_verification,
                COUNT(DISTINCT CASE WHEN sva.passed = TRUE THEN ps.student_id END) AS verified,
                COUNT(DISTINCT CASE WHEN sc.status = \'VALID\' THEN ps.student_id END) AS passported,
                COUNT(DISTINCT CASE WHEN a.stage IN (\'shortlisted\', \'interview\', \'offer\', \'hired\') THEN ps.student_id END) AS in_pipeline,
                COUNT(DISTINCT CASE WHEN a.stage = \'hired\' THEN ps.student_id END) AS placed
            FROM placement_students ps
            LEFT JOIN skill_verification_attempts sva ON sva.student_id = ps.student_id
            LEFT JOIN student_passports sp ON sp.student_id = ps.student_id
            LEFT JOIN skill_credentials sc ON sc.passport_token = sp.public_token AND sc.status = \'VALID\'
            LEFT JOIN applications a ON a.student_id = ps.student_id
            WHERE ps.college_group_id = ?
        ');
        $funnelStmt->execute([$collegeGroup['id']]);
        $funnel = $funnelStmt->fetch();

        // Trust score distribution
        $trustDistStmt = $db->prepare('
            SELECT
                SUM(CASE WHEN avg_trust >= 80 THEN 1 ELSE 0 END) AS very_high,
                SUM(CASE WHEN avg_trust >= 60 AND avg_trust < 80 THEN 1 ELSE 0 END) AS high,
                SUM(CASE WHEN avg_trust >= 40 AND avg_trust < 60 THEN 1 ELSE 0 END) AS medium,
                SUM(CASE WHEN avg_trust < 40 THEN 1 ELSE 0 END) AS low
            FROM (
                SELECT ps.student_id, COALESCE(AVG(sts.trust_score), 0) AS avg_trust
                FROM placement_students ps
                LEFT JOIN skill_trust_scores sts ON sts.student_id = ps.student_id
                WHERE ps.college_group_id = ?
                GROUP BY ps.student_id
            ) trust_summary
        ');
        $trustDistStmt->execute([$collegeGroup['id']]);
        $trustDist = $trustDistStmt->fetch();

        // Job drives summary
        $drivesStmt = $db->prepare('
            SELECT d.id, d.title, d.status, d.drive_date, d.min_trust_score,
                   j.title AS job_title, j.type AS job_type
            FROM placement_job_drives d
            LEFT JOIN jobs j ON j.id = d.job_id
            WHERE d.college_group_id = ?
            ORDER BY d.created_at DESC
            LIMIT 10
        ');
        $drivesStmt->execute([$collegeGroup['id']]);
        $drives = $drivesStmt->fetchAll();

        jsonResponse([
            'college'            => ['id' => $collegeGroup['id'], 'name' => $collegeGroup['name']],
            'placement_funnel'   => $funnel,
            'skill_distribution' => $skillDistribution,
            'trust_distribution' => $trustDist,
            'recent_drives'      => $drives,
        ]);
    }

    /**
     * POST /college/students/enroll
     * Enroll a student into this college group.
     */
    public static function enrollStudent(array $currentUser): void {
        self::requireCollegeRole($currentUser);
        $db = Database::getConnection();

        $collegeGroup = self::resolveCollegeGroup($db, $currentUser);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $studentId  = trim((string)($input['student_id'] ?? ''));
        $batchYear  = !empty($input['batch_year']) ? (int)$input['batch_year'] : null;
        $department = trim((string)($input['department'] ?? ''));

        if (empty($studentId)) {
            errorResponse('student_id is required.', 422);
        }

        // Verify student exists
        $sStmt = $db->prepare('SELECT id FROM students WHERE id = ?');
        $sStmt->execute([$studentId]);
        if (!$sStmt->fetch()) {
            errorResponse('Student not found.', 404);
        }

        try {
            $stmt = $db->prepare('
                INSERT INTO placement_students (college_group_id, student_id, batch_year, department)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (college_group_id, student_id) DO NOTHING
            ');
            $stmt->execute([$collegeGroup['id'], $studentId, $batchYear, $department ?: null]);
        } catch (\Throwable $e) {
            errorResponse('Failed to enroll student: ' . $e->getMessage(), 500);
        }

        jsonResponse(['message' => 'Student enrolled successfully.']);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private static function requireCollegeRole(array $user): void {
        if (!in_array($user['role'], ['college_admin', 'admin'], true)) {
            errorResponse('Forbidden: College Admin access required.', 403);
        }
    }

    private static function resolveCollegeGroup(\PDO $db, array $user): array {
        if ($user['role'] === 'admin') {
            // Super-admin: use query param college_id
            $collegeId = trim((string)($_GET['college_id'] ?? ''));
            if (empty($collegeId)) {
                // Return first group for convenience
                $stmt = $db->query('SELECT * FROM college_groups ORDER BY created_at DESC LIMIT 1');
                $group = $stmt->fetch();
                if (!$group) {
                    errorResponse('No college groups exist. Please create one first.', 404);
                }
                return $group;
            }
            $stmt = $db->prepare('SELECT * FROM college_groups WHERE id = ?');
            $stmt->execute([$collegeId]);
        } else {
            // College admin: bound to their own group
            $stmt = $db->prepare('SELECT * FROM college_groups WHERE admin_user_id = ? AND is_active = TRUE LIMIT 1');
            $stmt->execute([$user['user_id']]);
        }

        $group = $stmt->fetch();
        if (!$group) {
            errorResponse('No college group found for your account. Please contact the system administrator.', 404);
        }
        return $group;
    }
}
