<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/ProofOfSkillService.php';

/**
 * PassportController
 * Generates and serves public-safe, verifiable Skill Passports (Zero PII leak).
 */
class PassportController {

    /**
     * Get or create a shareable passport token for the authenticated student
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

        jsonResponse([
            'success' => true,
            'passport_token' => $passport['public_token'],
            'share_url' => "/passport/{$passport['public_token']}",
            'is_public' => (bool)$passport['is_public'],
            'view_count' => (int)$passport['view_count']
        ]);
    }

    /**
     * Public-safe view of a Student Skill Passport (No Auth required, Strict PII stripping)
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

        $skillsProof = ProofOfSkillService::getStudentSkillsWithProof($passport['student_id']);

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
                'verified_badge' => $verifiedCount > 0,
                'public_token' => $passport['public_token'],
                'verified_at' => $passport['updated_at'] ?? null
            ]
        ]);
    }
}
