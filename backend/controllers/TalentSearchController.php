<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/PrecisionMatchService.php';
require_once __DIR__ . '/../services/ProofOfSkillService.php';
require_once __DIR__ . '/../services/ProofOfWorkService.php';
require_once __DIR__ . '/../services/PassportCryptoService.php';

/**
 * TalentSearchController
 * Recruiter Talent Discovery and Precision Search API (Role & RBAC protected).
 */
class TalentSearchController {

    /**
     * Search and rank candidates by verified skills, Proof-of-Work, and precision score.
     * GET /recruiter/talent-search
     */
    public static function searchTalent(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');

        $skillsParam = trim((string)($_GET['skills'] ?? ''));
        $skills = !empty($skillsParam) ? array_map('trim', explode(',', $skillsParam)) : [];

        $filters = [
            'role' => trim((string)($_GET['role'] ?? '')),
            'skills' => $skills,
            'verification_level' => trim((string)($_GET['verification_level'] ?? 'All')),
            'min_assessment' => isset($_GET['min_assessment']) ? (int)$_GET['min_assessment'] : 0,
            'proof_of_work' => trim((string)($_GET['proof_of_work'] ?? 'Any')),
            'location' => trim((string)($_GET['location'] ?? '')),
            'experience' => trim((string)($_GET['experience'] ?? '')),
            'sort_by' => trim((string)($_GET['sort_by'] ?? 'best_match'))
        ];

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $result = PrecisionMatchService::searchCandidates($filters, $limit, $offset);

        jsonResponse([
            'success' => true,
            'total' => $result['total'],
            'limit' => $result['limit'],
            'offset' => $result['offset'],
            'candidates' => $result['candidates']
        ]);
    }

    /**
     * Detailed empirical proof breakdown of a candidate for recruiters (Strict PII stripped).
     * GET /recruiter/talent-search/{studentId}/proof
     */
    public static function getCandidateProof(array $currentUser, string $studentId): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();

        $sStmt = $db->prepare('
            SELECT s.id, s.name, s.college, s.program, s.experience, s.location, s.avatar_url,
                   sp.public_token as passport_token
            FROM students s
            LEFT JOIN student_passports sp ON s.id = sp.student_id
            WHERE s.id = ?
        ');
        $sStmt->execute([$studentId]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Candidate not found.', 404);
        }

        $skills = ProofOfSkillService::getStudentSkillsWithProof($studentId);
        $pow = ProofOfWorkService::getStudentProofOfWorkSummary($studentId);

        // Projects
        $prStmt = $db->prepare('SELECT title, description, tech_stack, project_url, github_url FROM student_projects WHERE student_id = ?');
        $prStmt->execute([$studentId]);
        $projects = $prStmt->fetchAll();

        // Cryptographic passport verification if exists
        $passportVerification = null;
        if (!empty($student['passport_token'])) {
            $passportVerification = PassportCryptoService::verifyCredentialByToken($student['passport_token']);
        }

        jsonResponse([
            'success' => true,
            'candidate' => [
                'student_id' => $student['id'],
                'name' => $student['name'],
                'institution' => $student['college'],
                'program' => $student['program'],
                'experience' => $student['experience'],
                'location' => $student['location'] ?? 'Not specified',
                'avatar_url' => $student['avatar_url'],
                'passport_token' => $student['passport_token'],
                'skills' => $skills,
                'proof_of_work' => $pow,
                'projects' => $projects,
                'cryptographic_verification' => $passportVerification
            ]
        ]);
    }

    /**
     * Recruiter shortlists candidate to company workspace.
     * POST /recruiter/shortlist
     * Body: { "student_id": "...", "stage": "shortlisted", "notes": "..." }
     */
    public static function shortlistCandidate(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $studentId = trim((string)($input['student_id'] ?? ''));
        $stage = trim((string)($input['stage'] ?? 'shortlisted'));
        $notes = trim((string)($input['notes'] ?? ''));

        if (empty($studentId)) {
            errorResponse('Student ID is required.');
        }

        // Get recruiter company
        $cStmt = $db->prepare('SELECT id FROM companies WHERE user_id = ?');
        $cStmt->execute([$currentUser['user_id']]);
        $company = $cStmt->fetch();

        if (!$company) {
            errorResponse('Recruiter company profile not found.', 404);
        }

        // Verify student exists
        $sStmt = $db->prepare('SELECT id, name FROM students WHERE id = ?');
        $sStmt->execute([$studentId]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Candidate not found.', 404);
        }

        $shortlistId = 'sl_' . bin2hex(random_bytes(8));
        $stmt = $db->prepare('
            INSERT INTO recruiter_shortlists
            (id, company_id, student_id, stage, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (company_id, student_id) DO UPDATE SET
                stage = EXCLUDED.stage,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
        ');
        $stmt->execute([$shortlistId, $company['id'], $studentId, $stage, $notes]);

        jsonResponse([
            'success' => true,
            'message' => "{$student['name']} added to company shortlist ({$stage}).",
            'shortlist' => [
                'company_id' => $company['id'],
                'student_id' => $studentId,
                'stage' => $stage,
                'notes' => $notes
            ]
        ]);
    }

    /**
     * Get company's shortlisted candidates.
     * GET /recruiter/shortlists
     */
    public static function getShortlists(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();

        $cStmt = $db->prepare('SELECT id FROM companies WHERE user_id = ?');
        $cStmt->execute([$currentUser['user_id']]);
        $company = $cStmt->fetch();

        if (!$company) {
            errorResponse('Recruiter company profile not found.', 404);
        }

        $stmt = $db->prepare('
            SELECT sl.*, s.name, s.college, s.program, s.experience, s.location, s.avatar_url,
                   sp.public_token as passport_token
            FROM recruiter_shortlists sl
            JOIN students s ON sl.student_id = s.id
            LEFT JOIN student_passports sp ON s.id = sp.student_id
            WHERE sl.company_id = ?
            ORDER BY sl.updated_at DESC
        ');
        $stmt->execute([$company['id']]);
        $shortlists = $stmt->fetchAll();

        jsonResponse([
            'success' => true,
            'shortlists' => $shortlists
        ]);
    }
}
