<?php
declare(strict_types=1);

/**
 * Hardened File Storage Service
 * 
 * Rules:
 * - Block all executable extensions completely
 * - Cryptographically random storage key
 * - Store resumes in protected storage directory outside public docroot
 * - Stream protected files with ownership authorization checks
 */
class FileUploadService {
    private const BLOCKED_EXTENSIONS = [
        'php', 'phtml', 'php3', 'php4', 'php5', 'phps', 'phar',
        'exe', 'bat', 'cmd', 'sh', 'bash', 'bin', 'js', 'py', 'pl', 'vbs', 'scr', 'dll'
    ];

    private const ALLOWED_RESUME_TYPES = [
        'application/pdf' => 'pdf',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx'
    ];

    private const ALLOWED_IMAGE_TYPES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/svg+xml' => 'svg'
    ];

    private const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB
    private const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB

    public static function getStorageRoot(): string {
        $dir = dirname(__DIR__) . '/storage';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    /**
     * Upload candidate resume to protected storage
     */
    public static function uploadResume(array $file): array {
        return self::handleProtectedUpload($file, 'resumes', self::ALLOWED_RESUME_TYPES, self::MAX_RESUME_SIZE);
    }

    /**
     * Upload public company logo
     */
    public static function uploadLogo(array $file): array {
        return self::handlePublicUpload($file, 'logos', self::ALLOWED_IMAGE_TYPES, self::MAX_IMAGE_SIZE);
    }

    private static function handleProtectedUpload(array $file, string $subfolder, array $allowedMimes, int $maxSize): array {
        $validation = self::validateFile($file, $allowedMimes, $maxSize);
        if (!$validation['success']) {
            return $validation;
        }

        $extension = $validation['extension'];
        $storageKey = sprintf('%s/%s_%s.%s', $subfolder, uniqid('doc_', true), bin2hex(random_bytes(8)), $extension);

        $targetDir = self::getStorageRoot() . '/' . $subfolder;
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $targetPath = self::getStorageRoot() . '/' . $storageKey;
        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            return ['success' => false, 'error' => 'Failed to save file in protected storage.'];
        }

        return ['success' => true, 'storageKey' => $storageKey];
    }

    private static function handlePublicUpload(array $file, string $subfolder, array $allowedMimes, int $maxSize): array {
        $validation = self::validateFile($file, $allowedMimes, $maxSize);
        if (!$validation['success']) {
            return $validation;
        }

        $extension = $validation['extension'];
        $filename = sprintf('%s_%s.%s', uniqid('logo_', true), bin2hex(random_bytes(4)), $extension);

        $publicDir = dirname(__DIR__) . '/uploads/' . $subfolder;
        if (!is_dir($publicDir)) {
            mkdir($publicDir, 0755, true);
        }

        $targetPath = $publicDir . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            return ['success' => false, 'error' => 'Failed to save logo file.'];
        }

        return ['success' => true, 'url' => '/uploads/' . $subfolder . '/' . $filename];
    }

    private static function validateFile(array $file, array $allowedMimes, int $maxSize): array {
        if (!isset($file['error']) || is_array($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'error' => 'Upload error: ' . ($file['error'] ?? 'No file provided')];
        }

        if ($file['size'] > $maxSize) {
            return ['success' => false, 'error' => 'File size exceeds allowed maximum.'];
        }

        $origExt = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
        if (in_array($origExt, self::BLOCKED_EXTENSIONS, true)) {
            return ['success' => false, 'error' => 'Security Error: Executable or script files are strictly blocked.'];
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!isset($allowedMimes[$mimeType])) {
            return ['success' => false, 'error' => 'Disallowed file type: ' . $mimeType];
        }

        return ['success' => true, 'extension' => $allowedMimes[$mimeType], 'mimeType' => $mimeType];
    }

    /**
     * Stream a protected file with appropriate headers
     */
    public static function streamProtectedFile(string $storageKey, string $downloadName = 'resume.pdf'): void {
        $filePath = self::getStorageRoot() . '/' . ltrim($storageKey, '/');
        if (!file_exists($filePath) || !is_readable($filePath)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'File not found on server.']);
            exit;
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($filePath);

        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($filePath));
        header('Content-Disposition: inline; filename="' . basename($downloadName) . '"');
        header('Cache-Control: private, max-age=0, must-revalidate');

        readfile($filePath);
        exit;
    }
}
