<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../services/MatchingService.php';
require_once __DIR__ . '/../services/ProofOfSkillService.php';
require_once __DIR__ . '/../services/Validator.php';
require_once __DIR__ . '/../services/AuditLogger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class JobController {
    /**
     * List active jobs with filtering, search, and dynamic skill matching
     */
    public static function list(): void {
        $db = Database::getConnection();
        $authUser = AuthMiddleware::optionalAuth();

        $search = trim($_GET['search'] ?? '');
        $skillFilter = trim($_GET['skill'] ?? 'All');
        $typeFilter = trim($_GET['type'] ?? 'All Types');
        $location = trim($_GET['location'] ?? '');

        // 1. Fetch current student skills if authenticated as student
        $studentSkills = [];
        $studentSkillConfidence = [];
        if ($authUser && ($authUser['role'] ?? '') === 'student') {
            $skStmt = $db->prepare('
                SELECT s.name 
                FROM student_skills sk
                JOIN skills s ON sk.skill_id = s.id
                JOIN students st ON sk.student_id = st.id
                WHERE st.user_id = ?
            ');
            $skStmt->execute([$authUser['user_id']]);
            $studentSkills = $skStmt->fetchAll(PDO::FETCH_COLUMN);
            $studentStmt = $db->prepare('SELECT id FROM students WHERE user_id = ? LIMIT 1');
            $studentStmt->execute([$authUser['user_id']]);
            $student = $studentStmt->fetch();
            if ($student) {
                $studentSkillConfidence = ProofOfSkillService::getStudentSkillConfidence($student['id']);
            }
        }

        // 2. Query active jobs
        $sql = "
            SELECT j.id, j.title, j.summary, j.location, j.type, j.salary_range, j.posted_at,
                   c.id as company_id, c.name as company_name, c.logo_url as company_logo, c.verified as company_verified
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            WHERE j.status = 'active'
        ";
        $params = [];

        if (!empty($search)) {
            $sql .= ' AND (j.title LIKE ? OR c.name LIKE ? OR j.summary LIKE ?)';
            $searchTerm = '%' . $search . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if ($typeFilter !== 'All Types' && !empty($typeFilter)) {
            $sql .= ' AND j.type = ?';
            $params[] = $typeFilter;
        }

        if (!empty($location)) {
            $sql .= ' AND j.location LIKE ?';
            $params[] = '%' . $location . '%';
        }

        $sql .= ' ORDER BY j.posted_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rawJobs = $stmt->fetchAll();

        // 3. Process normalized skills and match scores
        $jobs = [];
        foreach ($rawJobs as $row) {
            $skStmt = $db->prepare('
                SELECT s.name 
                FROM job_skills js
                JOIN skills s ON js.skill_id = s.id
                WHERE js.job_id = ?
            ');
            $skStmt->execute([$row['id']]);
            $skills = $skStmt->fetchAll(PDO::FETCH_COLUMN);

            if ($skillFilter !== 'All' && !empty($skillFilter)) {
                $hasSkill = false;
                foreach ($skills as $s) {
                    if (strcasecmp($s, $skillFilter) === 0) {
                        $hasSkill = true;
                        break;
                    }
                }
                if (!$hasSkill) {
                    continue;
                }
            }

            // Deterministic skill matching calculation
            $match = null;
            if ($authUser && ($authUser['role'] ?? '') === 'student') {
                $match = MatchingService::calculateMatch($studentSkills, $skills, [
                    'skill_confidence' => $studentSkillConfidence,
                ]);
            }

            $diff = time() - strtotime($row['posted_at'] ?? 'now');
            $postedAtStr = 'Just now';
            if ($diff >= 86400) {
                $postedAtStr = (int)floor($diff / 86400) . 'd ago';
            } else if ($diff >= 3600) {
                $postedAtStr = (int)floor($diff / 3600) . 'h ago';
            } else if ($diff >= 60) {
                $postedAtStr = (int)floor($diff / 60) . 'm ago';
            }

            $jobs[] = [
                'id'          => $row['id'],
                'title'       => $row['title'],
                'summary'     => $row['summary'],
                'location'    => $row['location'],
                'type'        => $row['type'],
                'salaryRange' => $row['salary_range'],
                'skills'      => $skills,
                'postedAt'    => $postedAtStr,
                'company'     => [
                    'id'       => $row['company_id'],
                    'name'     => $row['company_name'],
                    'logoUrl'  => $row['company_logo'],
                    'verified' => (bool)$row['company_verified']
                ],
                'match'       => $match
            ];
        }

        jsonResponse([
            'success' => true,
            'count'   => count($jobs),
            'jobs'    => $jobs
        ]);
    }

    /**
     * Get single job opportunity detail
     */
    public static function get(string $id): void {
        $db = Database::getConnection();
        $authUser = AuthMiddleware::optionalAuth();

        $stmt = $db->prepare('
            SELECT j.id, j.title, j.summary, j.description, j.location, j.type, j.salary_range, j.posted_at,
                   c.id as company_id, c.name as company_name, c.logo_url as company_logo, c.verified as company_verified,
                   c.about as company_about, c.website as company_website, c.city as company_city
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            WHERE j.id = ?
            LIMIT 1
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            errorResponse('Job opportunity not found.', 404);
        }

        $skStmt = $db->prepare('
            SELECT s.name 
            FROM job_skills js
            JOIN skills s ON js.skill_id = s.id
            WHERE js.job_id = ?
        ');
        $skStmt->execute([$id]);
        $skills = $skStmt->fetchAll(PDO::FETCH_COLUMN);

        $studentSkills = [];
        $studentSkillConfidence = [];
        if ($authUser && ($authUser['role'] ?? '') === 'student') {
            $sStmt = $db->prepare('
                SELECT s.name 
                FROM student_skills sk
                JOIN skills s ON sk.skill_id = s.id
                JOIN students st ON sk.student_id = st.id
                WHERE st.user_id = ?
            ');
            $sStmt->execute([$authUser['user_id']]);
            $studentSkills = $sStmt->fetchAll(PDO::FETCH_COLUMN);
            $studentStmt = $db->prepare('SELECT id FROM students WHERE user_id = ? LIMIT 1');
            $studentStmt->execute([$authUser['user_id']]);
            $student = $studentStmt->fetch();
            if ($student) {
                $studentSkillConfidence = ProofOfSkillService::getStudentSkillConfidence($student['id']);
            }
        }

        $match = null;
        if (!empty($studentSkills)) {
            $match = MatchingService::calculateMatch($studentSkills, $skills, [
                'skill_confidence' => $studentSkillConfidence,
            ]);
        }

        jsonResponse([
            'success' => true,
            'job' => [
                'id'          => $row['id'],
                'title'       => $row['title'],
                'summary'     => $row['summary'],
                'description' => $row['description'],
                'location'    => $row['location'],
                'type'        => $row['type'],
                'salaryRange' => $row['salary_range'],
                'skills'      => $skills,
                'postedAt'    => $row['posted_at'],
                'company'     => [
                    'id'       => $row['company_id'],
                    'name'     => $row['company_name'],
                    'logoUrl'  => $row['company_logo'],
                    'verified' => (bool)$row['company_verified'],
                    'about'    => $row['company_about'],
                    'website'  => $row['company_website'],
                    'city'     => $row['company_city']
                ],
                'match'       => $match
            ]
        ]);
    }

    /**
     * Recruiter creates job posting with master skills lookup & ownership validation
     */
    public static function create(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();

        // 1. Recruiter ownership verification
        $cStmt = $db->prepare('SELECT id FROM companies WHERE user_id = ? LIMIT 1');
        $cStmt->execute([$currentUser['user_id']]);
        $company = $cStmt->fetch();

        if (!$company) {
            errorResponse('Company profile required before posting jobs.', 400);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = new Validator($input);
        $v->required('title', 'Job Title')
          ->minLength('title', 3, 'Job Title')
          ->maxLength('title', 255, 'Job Title')
          ->optional('summary', '')
          ->optional('description', '')
          ->optional('location', 'Remote')
          ->in('type', ['Full Time', 'Internship', 'Part Time', 'Contract'], 'Job Type')
          ->optional('salary_range', '');
        $v->failOrProceed();

        $title       = $v->get('title');
        $summary     = $v->get('summary') ?: $title;
        $description = $v->get('description', '');
        $location    = $v->get('location', 'Remote');
        $type        = $v->get('type', 'Full Time');
        $salaryRange = $v->get('salary_range', '');
        $skills      = (array)($input['skills'] ?? []);

        $jobId = 'job_' . bin2hex(random_bytes(8));

        $db->beginTransaction();
        try {
            $stmt = $db->prepare('
                INSERT INTO jobs (id, company_id, title, summary, description, location, type, salary_range) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([$jobId, $company['id'], $title, $summary, $description, $location, $type, $salaryRange]);

            // Resolve or insert skills in master dictionary
            foreach ($skills as $skillName) {
                $cleanName = trim((string)$skillName);
                if (empty($cleanName)) continue;

                $normName = strtolower($cleanName);
                $mStmt = $db->prepare('SELECT id FROM skills WHERE normalized_name = ? LIMIT 1');
                $mStmt->execute([$normName]);
                $masterSkill = $mStmt->fetch();

                if (!$masterSkill) {
                    $newSkillId = 'sk_' . bin2hex(random_bytes(6));
                    $insStmt = $db->prepare('INSERT INTO skills (id, name, normalized_name) VALUES (?, ?, ?)');
                    $insStmt->execute([$newSkillId, $cleanName, $normName]);
                    $skillId = $newSkillId;
                } else {
                    $skillId = $masterSkill['id'];
                }

                $skStmt = $db->prepare('INSERT INTO job_skills (job_id, skill_id) VALUES (?, ?)');
                $skStmt->execute([$jobId, $skillId]);
            }

            $db->commit();

            AuditLogger::job('job.create', $currentUser['user_id'], $jobId, [
                'title'    => $title,
                'type'     => $type,
                'location' => $location,
                'skills'   => $skills,
            ]);

            jsonResponse([
                'success' => true,
                'message' => 'Job posted successfully.',
                'jobId'   => $jobId
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Failed to create job posting: ' . $e->getMessage(), 500);
        }
    }
}
