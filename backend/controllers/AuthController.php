<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../services/Validator.php';
require_once __DIR__ . '/../services/AuditLogger.php';

class AuthController {
    public static function register(): void {
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        // ── Centralised Validation ────────────────────────────────────────
        $v = new Validator($input);
        $v->required('email',    'Email')
          ->email('email')
          ->required('password', 'Password')
          ->minLength('password', 8, 'Password')
          ->maxLength('password', 128, 'Password')
          ->required('name',     'Full Name')
          ->minLength('name', 2, 'Full Name')
          ->maxLength('name', 100, 'Full Name')
          ->required('role',     'Role')
          ->in('role', ['student', 'recruiter'], 'Role');
        $v->failOrProceed();

        $email    = $v->get('email');
        $password = $input['password'];      // keep un-trimmed for hashing
        $role     = $v->get('role');
        $name     = $v->get('name');

        // Check if email exists
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            errorResponse('An account with this email address already exists.', 409);
        }

        $userId = 'u_' . bin2hex(random_bytes(10));
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        $db->beginTransaction();
        try {
            $stmt = $db->prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)');
            $stmt->execute([$userId, $email, $passwordHash, $role]);

            $profile = null;
            if ($role === 'student') {
                $studentId = 's_' . bin2hex(random_bytes(10));
                $college = trim($input['college'] ?? 'University Student');
                $program = trim($input['program'] ?? 'Computer Science');

                $stmtStudent = $db->prepare('INSERT INTO students (id, user_id, name, college, program) VALUES (?, ?, ?, ?, ?)');
                $stmtStudent->execute([$studentId, $userId, $name ?: 'Student', $college, $program]);
                $profile = ['id' => $studentId, 'name' => $name ?: 'Student', 'college' => $college, 'program' => $program];
            } else if ($role === 'recruiter') {
                $companyId = 'c_' . bin2hex(random_bytes(10));
                $companyName = trim($input['company_name'] ?? ($name . ' Labs'));
                $industry = trim($input['industry'] ?? 'Technology');

                $stmtCompany = $db->prepare('INSERT INTO companies (id, user_id, name, industry) VALUES (?, ?, ?, ?)');
                $stmtCompany->execute([$companyId, $userId, $companyName, $industry]);
                $profile = ['id' => $companyId, 'name' => $companyName, 'industry' => $industry];
            }

            // Create refresh token
            $rawRefreshToken = bin2hex(random_bytes(32));
            $refreshTokenHash = hash('sha256', $rawRefreshToken);
            $refreshTokenId = 'rt_' . bin2hex(random_bytes(8));
            $expiresAt = date('Y-m-d H:i:s', time() + (30 * 86400)); // 30 days

            $rtStmt = $db->prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)');
            $rtStmt->execute([$refreshTokenId, $userId, $refreshTokenHash, $expiresAt]);

            $db->commit();

            AuditLogger::auth('user.register', $userId, $role, [
                'email'   => $email,
                'college' => $input['college'] ?? '',
                'company' => $input['company_name'] ?? '',
            ]);

            $accessToken = JWT::encode([
                'user_id' => $userId,
                'email'   => $email,
                'role'    => $role
            ], 7200); // 2 hours

            jsonResponse([
                'success'      => true,
                'message'      => 'Registration successful.',
                'token'        => $accessToken,
                'refreshToken' => $rawRefreshToken,
                'user'         => [
                    'id'      => $userId,
                    'email'   => $email,
                    'role'    => $role,
                    'name'    => $name,
                    'profile' => $profile
                ]
            ], 201);
        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            errorResponse('Registration failed: ' . $e->getMessage(), 500);
        }
    }

    public static function login(): void {
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = new Validator($input);
        $v->required('email', 'Email')->email('email')
          ->required('password', 'Password');
        $v->failOrProceed();

        $email    = $v->get('email');
        $password = $input['password'];

        $stmt = $db->prepare('SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            AuditLogger::auth('user.login_failed', 'anonymous', 'unknown', ['email' => $email]);
            errorResponse('Incorrect email or password.', 401);
        }

        $profile = null;
        if ($user['role'] === 'student') {
            $sStmt = $db->prepare('SELECT id, name, college, program FROM students WHERE user_id = ?');
            $sStmt->execute([$user['id']]);
            $profile = $sStmt->fetch();
        } else if ($user['role'] === 'recruiter') {
            $cStmt = $db->prepare('SELECT id, name, verified FROM companies WHERE user_id = ?');
            $cStmt->execute([$user['id']]);
            $profile = $cStmt->fetch();
        }

        // Generate Access Token (JWT, 2 hours)
        $accessToken = JWT::encode([
            'user_id' => $user['id'],
            'email'   => $user['email'],
            'role'    => $user['role']
        ], 7200);

        // Generate Refresh Token (30 days)
        $rawRefreshToken = bin2hex(random_bytes(32));
        $refreshTokenHash = hash('sha256', $rawRefreshToken);
        $refreshTokenId = 'rt_' . bin2hex(random_bytes(8));
        $expiresAt = date('Y-m-d H:i:s', time() + (30 * 86400));

        $rtStmt = $db->prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)');
        $rtStmt->execute([$refreshTokenId, $user['id'], $refreshTokenHash, $expiresAt]);

        jsonResponse([
            'success'      => true,
            'message'      => 'Login successful.',
            'token'        => $accessToken,
            'refreshToken' => $rawRefreshToken,
            'user'         => [
                'id'      => $user['id'],
                'email'   => $user['email'],
                'role'    => $user['role'],
                'profile' => $profile
            ]
        ]);
    }

    public static function refresh(): void {
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $rawRefreshToken = trim($input['refreshToken'] ?? '');

        if (empty($rawRefreshToken)) {
            errorResponse('Refresh token is required.', 400);
        }

        $tokenHash = hash('sha256', $rawRefreshToken);
        $stmt = $db->prepare('
            SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked, u.email, u.role 
            FROM refresh_tokens rt
            JOIN users u ON rt.user_id = u.id
            WHERE rt.token_hash = ? LIMIT 1
        ');
        $stmt->execute([$tokenHash]);
        $row = $stmt->fetch();

        if (!$row || $row['revoked'] || strtotime($row['expires_at']) < time()) {
            errorResponse('Refresh token is expired or revoked. Please sign in again.', 401);
        }

        // Issue new Access Token
        $newAccessToken = JWT::encode([
            'user_id' => $row['user_id'],
            'email'   => $row['email'],
            'role'    => $row['role']
        ], 7200);

        jsonResponse([
            'success' => true,
            'token'   => $newAccessToken,
            'user'    => [
                'id'    => $row['user_id'],
                'email' => $row['email'],
                'role'  => $row['role']
            ]
        ]);
    }

    public static function logout(): void {
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $rawRefreshToken = trim($input['refreshToken'] ?? '');

        // If refresh token provided, revoke it
        if (!empty($rawRefreshToken)) {
            $tokenHash = hash('sha256', $rawRefreshToken);
            $stmt = $db->prepare('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?');
            $stmt->execute([$tokenHash]);
        }

        // If authorization header exists, also revoke tokens for user
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $payload = JWT::decode($matches[1]);
            if ($payload && isset($payload['user_id'])) {
                $uStmt = $db->prepare('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?');
                $uStmt->execute([$payload['user_id']]);
            }
        }

        jsonResponse([
            'success' => true,
            'message' => 'Signed out successfully.'
        ]);
    }

    public static function me(array $currentUser): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id, email, role, created_at FROM users WHERE id = ?');
        $stmt->execute([$currentUser['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            errorResponse('User not found.', 404);
        }

        $profile = null;
        if ($user['role'] === 'student') {
            $sStmt = $db->prepare('SELECT * FROM students WHERE user_id = ?');
            $sStmt->execute([$user['id']]);
            $profile = $sStmt->fetch();

            if ($profile) {
                $skStmt = $db->prepare('
                    SELECT s.name as skill_name, sk.proficiency 
                    FROM student_skills sk
                    JOIN skills s ON sk.skill_id = s.id
                    WHERE sk.student_id = ?
                ');
                $skStmt->execute([$profile['id']]);
                $profile['skills'] = $skStmt->fetchAll();
            }
        } else if ($user['role'] === 'recruiter') {
            $cStmt = $db->prepare('SELECT * FROM companies WHERE user_id = ?');
            $cStmt->execute([$user['id']]);
            $profile = $cStmt->fetch();
        }

        jsonResponse([
            'success' => true,
            'user'    => $user,
            'profile' => $profile
        ]);
    }
}
