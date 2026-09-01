<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../services/GeocodingService.php';
require_once __DIR__ . '/../services/FileUploadService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class CompanyController {
    /**
     * Get single company profile by ID with geocoded coordinates & active jobs
     */
    public static function getProfile(string $id): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT id, name, logo_url, industry, website, verified, about, 
                   address, city, state, pincode, country, latitude, longitude, geocoding_status, created_at 
            FROM companies 
            WHERE id = ? 
            LIMIT 1
        ');
        $stmt->execute([$id]);
        $company = $stmt->fetch();

        if (!$company) {
            errorResponse('Company not found.', 404);
        }

        $company['verified'] = (bool)$company['verified'];
        $company['latitude'] = $company['latitude'] !== null ? (float)$company['latitude'] : null;
        $company['longitude'] = $company['longitude'] !== null ? (float)$company['longitude'] : null;

        // Active jobs by this company
        $jobStmt = $db->prepare("
            SELECT id, title, summary, location, type, salary_range, posted_at 
            FROM jobs 
            WHERE company_id = ? AND status = 'active' 
            ORDER BY posted_at DESC
        ");
        $jobStmt->execute([$id]);
        $jobs = $jobStmt->fetchAll();

        foreach ($jobs as &$job) {
            $skStmt = $db->prepare('
                SELECT s.name 
                FROM job_skills js
                JOIN skills s ON js.skill_id = s.id
                WHERE js.job_id = ?
            ');
            $skStmt->execute([$job['id']]);
            $job['skills'] = $skStmt->fetchAll(PDO::FETCH_COLUMN);
            $job['company'] = [
                'id' => $company['id'],
                'name' => $company['name'],
                'logoUrl' => $company['logo_url'],
                'verified' => $company['verified']
            ];
        }

        jsonResponse([
            'success' => true,
            'company' => $company,
            'jobs'    => $jobs
        ]);
    }

    /**
     * Update company details with change-detected geocoding & non-blocking fallback
     */
    public static function updateProfile(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        // 1. Verify Recruiter Ownership
        $stmt = $db->prepare('SELECT * FROM companies WHERE user_id = ? LIMIT 1');
        $stmt->execute([$currentUser['user_id']]);
        $company = $stmt->fetch();

        if (!$company) {
            errorResponse('Company profile not found for this recruiter account.', 404);
        }

        $name = trim($input['name'] ?? $company['name']);
        $industry = trim($input['industry'] ?? $company['industry']);
        $website = trim($input['website'] ?? $company['website'] ?? '');
        $about = trim($input['about'] ?? $company['about'] ?? '');
        $address = trim($input['address'] ?? $company['address'] ?? '');
        $city = trim($input['city'] ?? $company['city'] ?? '');
        $state = trim($input['state'] ?? $company['state'] ?? '');
        $pincode = trim($input['pincode'] ?? $company['pincode'] ?? '');
        $country = trim($input['country'] ?? $company['country'] ?? 'India');

        // 2. Change Detection for Geocoding: Only call Nominatim if address has changed
        $existingAddress = trim(implode(', ', array_filter([$company['address'], $company['city'], $company['state'], $company['pincode']])));
        $newAddress = trim(implode(', ', array_filter([$address, $city, $state, $pincode])));

        $latitude = $company['latitude'] !== null ? (float)$company['latitude'] : null;
        $longitude = $company['longitude'] !== null ? (float)$company['longitude'] : null;
        $geocodingStatus = $company['geocoding_status'] ?? 'pending';

        if (!empty($newAddress) && ($existingAddress !== $newAddress || $latitude === null)) {
            $geoResult = GeocodingService::geocodeAddress($address, $city, $state, $pincode, $country);
            if ($geoResult !== null) {
                $latitude = $geoResult['latitude'];
                $longitude = $geoResult['longitude'];
                $geocodingStatus = 'success';
            } else {
                // Non-blocking failure: profile update continues, status marked 'failed'
                $geocodingStatus = 'failed';
            }
        }

        $updateStmt = $db->prepare('
            UPDATE companies 
            SET name = ?,
                industry = ?,
                website = ?,
                about = ?,
                address = ?,
                city = ?,
                state = ?,
                pincode = ?,
                country = ?,
                latitude = ?,
                longitude = ?,
                geocoding_status = ?
            WHERE id = ?
        ');

        $updateStmt->execute([
            $name,
            $industry,
            $website,
            $about,
            $address,
            $city,
            $state,
            $pincode,
            $country,
            $latitude,
            $longitude,
            $geocodingStatus,
            $company['id']
        ]);

        jsonResponse([
            'success' => true,
            'message' => 'Company profile updated successfully.',
            'geocoding' => [
                'status' => $geocodingStatus,
                'latitude' => $latitude,
                'longitude' => $longitude
            ]
        ]);
    }

    /**
     * Upload company logo
     */
    public static function uploadLogo(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'recruiter', 'admin');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM companies WHERE user_id = ?');
        $stmt->execute([$currentUser['user_id']]);
        $company = $stmt->fetch();

        if (!$company) {
            errorResponse('Company profile not found.', 404);
        }

        if (!isset($_FILES['logo'])) {
            errorResponse('No logo file provided.');
        }

        $upload = FileUploadService::uploadLogo($_FILES['logo']);
        if (!$upload['success']) {
            errorResponse($upload['error']);
        }

        $upStmt = $db->prepare('UPDATE companies SET logo_url = ? WHERE id = ?');
        $upStmt->execute([$upload['url'], $company['id']]);

        jsonResponse([
            'success' => true,
            'message' => 'Logo uploaded successfully.',
            'logoUrl' => $upload['url']
        ]);
    }

    /**
     * List companies
     */
    public static function list(): void {
        $db = Database::getConnection();
        $stmt = $db->query('
            SELECT id, name, logo_url, industry, website, verified, city, latitude, longitude, geocoding_status 
            FROM companies 
            ORDER BY verified DESC, name ASC
        ');
        $companies = $stmt->fetchAll();

        foreach ($companies as &$comp) {
            $comp['verified'] = (bool)$comp['verified'];
            $comp['latitude'] = $comp['latitude'] !== null ? (float)$comp['latitude'] : null;
            $comp['longitude'] = $comp['longitude'] !== null ? (float)$comp['longitude'] : null;
        }

        jsonResponse([
            'success' => true,
            'companies' => $companies
        ]);
    }
}
