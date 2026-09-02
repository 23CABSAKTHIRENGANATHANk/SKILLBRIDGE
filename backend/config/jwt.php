<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

/**
 * Enterprise JWT & Refresh Token Manager
 * Uses HS256 algorithm with environment secret enforcement.
 */
class JWT {
    private static function getSecret(): string {
        Database::loadEnv();
        $secret = getenv('JWT_SECRET') ?: ($_ENV['JWT_SECRET'] ?? ($_SERVER['JWT_SECRET'] ?? ''));

        if (empty($secret) || str_starts_with($secret, 'CHANGE_ME')) {
            throw new RuntimeException('JWT_SECRET is required and must be set to a real secret in backend/.env.');
        }

        return $secret;
    }

    /**
     * Generate short-lived Access Token (Default: 2 Hours)
     */
    public static function encode(array $payload, int $expirySeconds = 7200): string {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + $expirySeconds;
        $payloadJson = json_encode($payload);

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode($payloadJson);

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    /**
     * Decode and verify token signature
     */
    public static function decode(string $jwt): ?array {
        $tokenParts = explode('.', $jwt);
        if (count($tokenParts) !== 3) {
            return null;
        }

        [$header64, $payload64, $signature64] = $tokenParts;

        $header = json_decode(self::base64UrlDecode($header64), true);
        if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256' || ($header['typ'] ?? '') !== 'JWT') {
            return null;
        }

        $signature = self::base64UrlDecode($signature64);
        $expectedSignature = hash_hmac('sha256', $header64 . "." . $payload64, self::getSecret(), true);

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($payload64), true);
        if (!$payload || !is_array($payload)) {
            return null;
        }

        if (!isset($payload['user_id'], $payload['role'], $payload['iat'], $payload['exp'])
            || !is_string($payload['user_id'])
            || !in_array($payload['role'], ['student', 'recruiter', 'admin'], true)
            || !is_int($payload['iat'])
            || !is_int($payload['exp'])
            || $payload['exp'] <= $payload['iat']
            || $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    /**
     * Issue and record a secure refresh token in database
     */
    public static function createRefreshToken(string $userId, int $daysValid = 30): string {
        $db = Database::getConnection();
        $randomBytes = random_bytes(32);
        $rawToken = bin2hex($randomBytes);
        $tokenHash = hash('sha256', $rawToken);

        $expiresAt = date('Y-m-d H:i:s', time() + ($daysValid * 86400));
        $tokenId = 'rt_' . bin2hex(random_bytes(8));

        $stmt = $db->prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)');
        $stmt->execute([$tokenId, $userId, $tokenHash, $expiresAt]);

        return $rawToken;
    }

    /**
     * Invalidate refresh token on logout
     */
    public static function revokeRefreshToken(string $rawToken): void {
        $db = Database::getConnection();
        $tokenHash = hash('sha256', $rawToken);
        $stmt = $db->prepare('DELETE FROM refresh_tokens WHERE token_hash = ?');
        $stmt->execute([$tokenHash]);
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
