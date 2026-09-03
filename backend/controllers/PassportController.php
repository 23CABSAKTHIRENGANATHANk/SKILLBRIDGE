<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/ProofOfSkillService.php';
require_once __DIR__ . '/../services/ProofOfWorkService.php';
require_once __DIR__ . '/../services/PassportCryptoService.php';

/**
 * PassportController
 * Generates and serves public-safe, cryptographically verifiable Skill Passports (Zero PII leak).
 */
class PassportController {

    /**
     * Get or create a shareable passport token and issue signed credential for the authenticated student.
     * POST /student/passport
     */
    public static function getOrCreateToken(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $pStmt = $db->prepare('SELECT public_token, is_public, view_count, updated_at FROM student_passports WHERE student_id = ?');
        $pStmt->execute([$student['id']]);
        $passport = $pStmt->fetch();

        if (!$passport) {
            $token = 'sb_pass_' . bin2hex(random_bytes(16));
            $insStmt = $db->prepare('INSERT INTO student_passports (public_token, student_id, is_public) VALUES (?, ?, TRUE)');
            $insStmt->execute([$token, $student['id']]);
            $passport = ['public_token' => $token, 'is_public' => true, 'view_count' => 0];
        }

        // Issue or ensure cryptographic credential exists
        $cred = PassportCryptoService::issueCredential($student['id'], $passport['public_token']);

        jsonResponse([
            'success' => true,
            'passport_token' => $passport['public_token'],
            'share_url' => "/passport/{$passport['public_token']}",
            'is_public' => (bool)$passport['is_public'],
            'view_count' => (int)$passport['view_count'],
            'credential' => [
                'status' => $cred['status'],
                'credential_version' => $cred['credential_version'],
                'algorithm' => $cred['algorithm'],
                'key_id' => $cred['key_id'],
                'issued_at' => $cred['issued_at'],
                'signature' => $cred['signature']
            ]
        ]);
    }

    /**
     * Cryptographically re-sign / reissue credential.
     * POST /student/passport/reissue
     */
    public static function reissueCredential(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $pStmt = $db->prepare('SELECT public_token FROM student_passports WHERE student_id = ?');
        $pStmt->execute([$student['id']]);
        $passport = $pStmt->fetch();

        if (!$passport) {
            errorResponse('Skill Passport not found.', 404);
        }

        $cred = PassportCryptoService::issueCredential($student['id'], $passport['public_token']);

        jsonResponse([
            'success' => true,
            'message' => 'Skill credential successfully reissued and cryptographically signed.',
            'credential' => $cred
        ]);
    }

    /**
     * Revoke a skill credential.
     * POST /student/passport/revoke
     */
    public static function revokeCredential(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $reason = trim((string)($input['reason'] ?? 'Candidate requested credential revocation'));

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $pStmt = $db->prepare('SELECT public_token FROM student_passports WHERE student_id = ?');
        $pStmt->execute([$student['id']]);
        $passport = $pStmt->fetch();

        if (!$passport) {
            errorResponse('Skill Passport not found.', 404);
        }

        $result = PassportCryptoService::revokeCredential($student['id'], $passport['public_token'], $reason, $currentUser['user_id']);

        jsonResponse([
            'success' => true,
            'message' => 'Credential successfully revoked.',
            'revocation' => $result
        ]);
    }

    /**
     * Public-safe view of a Student Skill Passport (No Auth required, Strict PII stripping).
     * GET /passport/{token}
     */
    public static function getPublicPassport(string $token): void {
        $db = Database::getConnection();

        $pStmt = $db->prepare('
            SELECT sp.public_token, sp.view_count, sp.is_public, s.id as student_id, s.name, s.college, s.program, s.experience
            FROM student_passports sp
            JOIN students s ON sp.student_id = s.id
            WHERE sp.public_token = ? AND sp.is_public = TRUE
        ');
        $pStmt->execute([$token]);
        $passport = $pStmt->fetch();

        if (!$passport) {
            errorResponse('Skill Passport not found or set to private.', 404);
        }

        // Increment view count
        $db->prepare('UPDATE student_passports SET view_count = view_count + 1 WHERE public_token = ?')->execute([$token]);

        // Cryptographic verification check
        $verification = PassportCryptoService::verifyCredentialByToken($token);

        $skillsProof = ProofOfSkillService::getStudentSkillsWithProof($passport['student_id']);
        $powSummary = ProofOfWorkService::getStudentProofOfWorkSummary($passport['student_id']);

        // Fetch public-safe projects
        $prStmt = $db->prepare('SELECT title, description, tech_stack, project_url, github_url FROM student_projects WHERE student_id = ?');
        $prStmt->execute([$passport['student_id']]);
        $projects = $prStmt->fetchAll();

        // Fetch public-safe certificates
        $cStmt = $db->prepare('SELECT title, issuer, issue_date, credential_url FROM student_certificates WHERE student_id = ?');
        $cStmt->execute([$passport['student_id']]);
        $certs = $cStmt->fetchAll();

        // Calculate verified readiness
        $verifiedCount = count(array_filter($skillsProof, fn($s) => $s['is_verified']));
        $readiness = !empty($skillsProof) ? (int)round(($verifiedCount / count($skillsProof)) * 100) : 0;

        jsonResponse([
            'success' => true,
            'passport' => [
                'name' => $passport['name'],
                'institution' => $passport['college'],
                'program' => $passport['program'],
                'experience' => $passport['experience'],
                'verified_readiness' => $readiness,
                'verified_skills_count' => $verifiedCount,
                'skills' => $skillsProof,
                'projects' => $projects,
                'certificates' => $certs,
                'proof_of_work' => $powSummary,
                'verified_badge' => $verifiedCount > 0,
                'public_token' => $passport['public_token'],
                'cryptographic_verification' => $verification,
                'verified_at' => $verification['issued_at'] ?? ($passport['updated_at'] ?? null)
            ]
        ]);
    }

    /**
     * Dedicated Cryptographic Verification endpoint.
     * GET /passport/{token}/verify
     */
    public static function verifyCredentialEndpoint(string $token): void {
        $verification = PassportCryptoService::verifyCredentialByToken($token);
        jsonResponse([
            'success' => true,
            'verification' => $verification
        ]);
    }

    /**
     * Public QR Code generation link metadata.
     * GET /passport/{token}/qr
     */
    public static function getPassportQr(string $token): void {
        $db = Database::getConnection();
        $pStmt = $db->prepare('SELECT is_public FROM student_passports WHERE public_token = ?');
        $pStmt->execute([$token]);
        $passport = $pStmt->fetch();

        if (!$passport || !$passport['is_public']) {
            errorResponse('Passport not found or private.', 404);
        }

        $baseUrl = getenv('APP_URL') ?: 'https://skillbridge.dev';
        $publicUrl = rtrim($baseUrl, '/') . "/passport/{$token}";

        jsonResponse([
            'success' => true,
            'passport_token' => $token,
            'verification_url' => $publicUrl,
            'qr_code_svg_url' => "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" . urlencode($publicUrl)
        ]);
    }
}
