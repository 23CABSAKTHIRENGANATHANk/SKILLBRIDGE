<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../services/Validator.php';
require_once __DIR__ . '/../services/AuditLogger.php';
require_once __DIR__ . '/../services/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AdminController {
    public static function getPublicStats(): void {
        $db = Database::getConnection();

        $students = (int)$db->query('SELECT COUNT(*) FROM students')->fetchColumn();
        $jobs = (int)$db->query("SELECT COUNT(*) FROM jobs WHERE status = 'active'")->fetchColumn();
        $companies = (int)$db->query('SELECT COUNT(*) FROM companies WHERE verified = TRUE')->fetchColumn();
        $matches = (int)$db->query('SELECT COUNT(*) FROM applications')->fetchColumn();

        jsonResponse([
            'success' => true,
            'stats' => [
                'students' => $students,
                'opportunities' => $jobs,
                'companies' => $companies,
                'matches' => $matches,
            ],
        ]);
    }

    /**
     * Get real-time platform statistics (public)
     */
    public static function getStats(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'admin');
        $db = Database::getConnection();

        $students  = (int)$db->query('SELECT COUNT(*) FROM students')->fetchColumn();
        $jobs      = (int)$db->query("SELECT COUNT(*) FROM jobs WHERE status = 'active'")->fetchColumn();
        $companies = (int)$db->query('SELECT COUNT(*) FROM companies')->fetchColumn();
        $matches   = (int)$db->query('SELECT COUNT(*) FROM applications')->fetchColumn();

        jsonResponse([
            'success' => true,
            'stats' => [
                'students'      => $students,
                'opportunities' => $jobs,
                'companies'     => $companies,
                'matches'       => $matches
            ]
        ]);
    }

    /**
     * Admin verifies or revokes a company trust badge
     * Writes to audit log on every change.
     */
    public static function verifyCompany(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'admin');
        $db    = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        // Validate
        $v = new Validator($input);
        $v->required('company_id', 'Company ID');
        $v->failOrProceed();

        $companyId = $v->get('company_id');
        $verified  = isset($input['verified']) ? (bool)$input['verified'] : true;

        // Fetch company to ensure it exists
        $stmt = $db->prepare('SELECT id, name FROM companies WHERE id = ?');
        $stmt->execute([$companyId]);
        $company = $stmt->fetch();

        if (!$company) {
            errorResponse('Company not found.', 404);
        }

        // Apply change
        $upd = $db->prepare('UPDATE companies SET verified = ? WHERE id = ?');
        $upd->execute([$verified ? 1 : 0, $companyId]);

        // Audit
        AuditLogger::admin(
            $verified ? 'company.verify' : 'company.revoke',
            $currentUser['user_id'],
            'company',
            $companyId,
            ['company_name' => $company['name'], 'verified_by' => $currentUser['email'] ?? 'admin']
        );

        Logger::info("Admin verification: {$company['name']} → " . ($verified ? 'VERIFIED' : 'REVOKED'), [
            'admin_id'   => $currentUser['user_id'],
            'company_id' => $companyId,
        ]);

        jsonResponse([
            'success'      => true,
            'message'      => $verified ? "Company '{$company['name']}' verified and trust badge granted." : "Trust badge revoked from '{$company['name']}'.",
            'verified'     => $verified,
            'company_name' => $company['name'],
        ]);
    }
}
