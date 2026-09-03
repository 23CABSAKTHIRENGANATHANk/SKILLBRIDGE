<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/ProofOfSkillService.php';
require_once __DIR__ . '/ProofOfWorkService.php';

/**
 * PassportCryptoService
 * Asymmetric cryptographic signing, canonicalization, and verification
 * for SkillBridge Verified Skill Passports (RS256).
 */
class PassportCryptoService {

    public const ALGORITHM = 'RS256';
    public const DEFAULT_KEY_ID = 'sb_k1_2026';
    public const CREDENTIAL_VERSION = '2.0';

    private static ?string $cachedPrivateKey = null;
    private static ?string $cachedPublicKey = null;

    /**
     * Recursively sort array keys to guarantee canonical, deterministic JSON formatting.
     */
    public static function canonicalizeData(mixed $data): mixed {
        if (!is_array($data)) {
            return $data;
        }
        $isAssoc = array_keys($data) !== range(0, count($data) - 1);
        if ($isAssoc) {
            ksort($data, SORT_STRING);
        }
        foreach ($data as $key => $value) {
            $data[$key] = self::canonicalizeData($value);
        }
        return $data;
    }

    /**
     * Convert data into a deterministic canonical JSON string.
     */
    public static function getCanonicalString(array $data): string {
        $sorted = self::canonicalizeData($data);
        return (string)json_encode($sorted, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Base64URL encode binary data
     */
    public static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64URL decode string data
     */
    public static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }

    /**
     * Get or generate server-side RSA-2048 signing keys.
     */
    public static function getSigningKeys(): array {
        if (self::$cachedPrivateKey !== null && self::$cachedPublicKey !== null) {
            return [
                'private_key' => self::$cachedPrivateKey,
                'public_key' => self::$cachedPublicKey
            ];
        }

        // Check if environment has keys configured
        $envPriv = getenv('SKILLBRIDGE_PASSPORT_PRIVKEY');
        $envPub = getenv('SKILLBRIDGE_PASSPORT_PUBKEY');
        if (!empty($envPriv) && !empty($envPub)) {
            self::$cachedPrivateKey = $envPriv;
            self::$cachedPublicKey = $envPub;
            return ['private_key' => $envPriv, 'public_key' => $envPub];
        }

        // Check persistent key file in storage
        $keysDir = __DIR__ . '/../storage/keys';
        if (!is_dir($keysDir)) {
            @mkdir($keysDir, 0700, true);
        }
        $privFile = $keysDir . '/passport_private.pem';
        $pubFile = $keysDir . '/passport_public.pem';

        if (file_exists($privFile) && file_exists($pubFile)) {
            self::$cachedPrivateKey = file_get_contents($privFile);
            self::$cachedPublicKey = file_get_contents($pubFile);
            return [
                'private_key' => self::$cachedPrivateKey,
                'public_key' => self::$cachedPublicKey
            ];
        }

        // Generate new RSA-2048 keypair
        $tmpConf = tempnam(sys_get_temp_dir(), 'sb_ssl_');
        file_put_contents($tmpConf, '');
        $config = [
            'config' => $tmpConf,
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ];
        $res = openssl_pkey_new($config);
        if (!$res) {
            @unlink($tmpConf);
            throw new \RuntimeException('Failed to generate asymmetric cryptographic signing keypair: ' . openssl_error_string());
        }

        openssl_pkey_export($res, $privPem, null, $config);
        $details = openssl_pkey_get_details($res);
        $pubPem = $details['key'] ?? '';
        @unlink($tmpConf);

        @file_put_contents($privFile, $privPem);
        @file_put_contents($pubFile, $pubPem);

        self::$cachedPrivateKey = $privPem;
        self::$cachedPublicKey = $pubPem;

        return [
            'private_key' => $privPem,
            'public_key' => $pubPem
        ];
    }

    /**
     * Cryptographically sign a canonical credential payload using RS256.
     */
    public static function signPayload(array $payload, string $keyId = self::DEFAULT_KEY_ID): array {
        $keys = self::getSigningKeys();
        $canonicalStr = self::getCanonicalString($payload);
        $digest = hash('sha256', $canonicalStr);

        $rawSig = '';
        $success = openssl_sign($canonicalStr, $rawSig, $keys['private_key'], OPENSSL_ALGO_SHA256);
        if (!$success) {
            throw new \RuntimeException('Cryptographic signing failed: ' . openssl_error_string());
        }

        $signature = self::base64UrlEncode($rawSig);

        return [
            'credential_hash' => $digest,
            'signature' => $signature,
            'algorithm' => self::ALGORITHM,
            'key_id' => $keyId,
            'public_key' => $keys['public_key']
        ];
    }

    /**
     * Mathematically verify a credential payload against its cryptographic signature.
     */
    public static function verifySignature(array $payload, string $signature, ?string $publicKey = null): bool {
        if ($publicKey === null) {
            $keys = self::getSigningKeys();
            $publicKey = $keys['public_key'];
        }

        $canonicalStr = self::getCanonicalString($payload);
        $rawSig = self::base64UrlDecode($signature);

        $res = openssl_verify($canonicalStr, $rawSig, $publicKey, OPENSSL_ALGO_SHA256);
        return ($res === 1);
    }

    /**
     * Issue a cryptographically signed Skill Passport credential for a student.
     */
    public static function issueCredential(string $studentId, string $passportToken, string $keyId = self::DEFAULT_KEY_ID): array {
        $db = Database::getConnection();

        // 1. Fetch student public-safe profile
        $sStmt = $db->prepare('SELECT id, name, college, program, experience, created_at FROM students WHERE id = ?');
        $sStmt->execute([$studentId]);
        $student = $sStmt->fetch();
        if (!$student) {
            throw new \RuntimeException('Student profile not found.');
        }

        // 2. Fetch verified skills & Proof of Work
        $skills = ProofOfSkillService::getStudentSkillsWithProof($studentId);
        $pow = ProofOfWorkService::getStudentProofOfWorkSummary($studentId);

        // Strict public-safe sanitization: filter only necessary fields
        $verifiedSkills = [];
        foreach ($skills as $s) {
            $verifiedSkills[] = [
                'skill_name' => $s['skill_name'],
                'proficiency' => $s['proficiency'],
                'confidence_score' => (int)$s['confidence_score'],
                'verification_level' => $s['verification_level'],
                'integrity_status' => $s['integrity_status'],
                'is_verified' => (bool)$s['is_verified'],
                'proof_of_work_level' => $s['proof_of_work_level'] ?? 'NONE'
            ];
        }

        $issuedAt = gmdate('Y-m-d\TH:i:s\Z');

        // Construct canonical payload
        $canonicalPayload = [
            'credential_version' => self::CREDENTIAL_VERSION,
            'issuer' => 'SkillBridge Proof-of-Skill Cryptographic Authority',
            'passport_token' => $passportToken,
            'subject' => [
                'name' => $student['name'],
                'institution' => $student['college'],
                'program' => $student['program'],
                'experience' => $student['experience']
            ],
            'verified_skills' => $verifiedSkills,
            'proof_of_work' => [
                'level' => $pow['proof_of_work_level'],
                'score' => $pow['overall_pow_score'],
                'repositories_count' => $pow['total_repositories']
            ],
            'issued_at' => $issuedAt
        ];

        // Sign payload
        $sigResult = self::signPayload($canonicalPayload, $keyId);

        $credId = 'cred_' . bin2hex(random_bytes(8));
        $stmt = $db->prepare('
            INSERT INTO skill_credentials
            (id, student_id, passport_token, credential_version, status, credential_hash, signature, algorithm, key_id, canonical_payload, issued_at)
            VALUES (?, ?, ?, ?, \'VALID\', ?, ?, ?, ?, ?, ?::timestamptz)
            ON CONFLICT (passport_token) DO UPDATE SET
                credential_version = EXCLUDED.credential_version,
                status = \'VALID\',
                credential_hash = EXCLUDED.credential_hash,
                signature = EXCLUDED.signature,
                algorithm = EXCLUDED.algorithm,
                key_id = EXCLUDED.key_id,
                canonical_payload = EXCLUDED.canonical_payload,
                issued_at = EXCLUDED.issued_at,
                revoked_at = NULL,
                revoked_reason = NULL
        ');
        $stmt->execute([
            $credId,
            $studentId,
            $passportToken,
            self::CREDENTIAL_VERSION,
            $sigResult['credential_hash'],
            $sigResult['signature'],
            $sigResult['algorithm'],
            $sigResult['key_id'],
            json_encode($canonicalPayload),
            $issuedAt
        ]);

        return [
            'credential_id' => $credId,
            'passport_token' => $passportToken,
            'credential_version' => self::CREDENTIAL_VERSION,
            'status' => 'VALID',
            'issued_at' => $issuedAt,
            'signature' => $sigResult['signature'],
            'algorithm' => $sigResult['algorithm'],
            'key_id' => $sigResult['key_id'],
            'public_key' => $sigResult['public_key'],
            'canonical_payload' => $canonicalPayload
        ];
    }

    /**
     * Revoke a skill credential.
     */
    public static function revokeCredential(string $studentId, string $passportToken, string $reason, string $revokedBy): array {
        $db = Database::getConnection();

        $cStmt = $db->prepare('SELECT id, status FROM skill_credentials WHERE passport_token = ? AND student_id = ?');
        $cStmt->execute([$passportToken, $studentId]);
        $cred = $cStmt->fetch();

        if (!$cred) {
            throw new \RuntimeException('Skill credential not found or unauthorized.');
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $db->prepare('
            UPDATE skill_credentials
            SET status = \'REVOKED\',
                revoked_at = CURRENT_TIMESTAMP,
                revoked_reason = ?
            WHERE id = ?
        ')->execute([$reason, $cred['id']]);

        // Insert audit log
        $revId = 'rev_' . bin2hex(random_bytes(8));
        $db->prepare('
            INSERT INTO skill_credential_revocations
            (id, credential_id, student_id, revoked_by, reason, revoked_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ')->execute([$revId, $cred['id'], $studentId, $revokedBy, $reason]);

        return [
            'success' => true,
            'passport_token' => $passportToken,
            'status' => 'REVOKED',
            'revoked_at' => $now,
            'reason' => $reason
        ];
    }

    /**
     * Verify a credential by passport token.
     */
    public static function verifyCredentialByToken(string $passportToken): array {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM skill_credentials WHERE passport_token = ?');
        $stmt->execute([$passportToken]);
        $cred = $stmt->fetch();

        if (!$cred) {
            return [
                'valid' => false,
                'credential_status' => 'NOT_FOUND',
                'message' => 'Credential token does not exist.'
            ];
        }

        if ($cred['status'] === 'REVOKED') {
            return [
                'valid' => false,
                'credential_status' => 'REVOKED',
                'issued_at' => $cred['issued_at'],
                'revoked_at' => $cred['revoked_at'],
                'revocation_reason' => $cred['revoked_reason'],
                'message' => 'This credential was revoked by the candidate or issuing authority.'
            ];
        }

        $payload = json_decode($cred['canonical_payload'], true) ?: [];
        $sigValid = self::verifySignature($payload, $cred['signature']);

        if (!$sigValid) {
            return [
                'valid' => false,
                'credential_status' => 'INVALID_SIGNATURE',
                'message' => 'Cryptographic signature verification failed: payload has been modified or tampered with.'
            ];
        }

        $keys = self::getSigningKeys();

        return [
            'valid' => true,
            'credential_status' => 'VALID',
            'credential_version' => $cred['credential_version'],
            'issued_at' => $cred['issued_at'],
            'algorithm' => $cred['algorithm'],
            'key_id' => $cred['key_id'],
            'signature' => $cred['signature'],
            'public_key' => $keys['public_key'],
            'credential_data' => $payload
        ];
    }
}
