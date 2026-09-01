<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../config/cors.php';

class AuthController {
    public static function register(): void {
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        $role = $input['role'] ?? 'student';
        $name = trim($input['name'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            errorResponse('Please provide a valid email address.');
        }

        if (strlen($password) < 6) {
            errorResponse('Password must be at least 6 characters long.');
        }

        if (!in_array($role, ['student', 'recruiter'], true)) {
            errorResponse('Invalid role specified. Must be student or recruiter.');
        }

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

            if ($role === 'student') {
                $studentId = 's_' . bin2hex(random_bytes(10));
                $college = trim($input['college'] ?? 'University Student');
                $program = trim($input['program'] ?? 'Computer Science');

                $stmtStudent = $db->prepare('INSERT INTO students (id, user_id, name, college, program) VALUES (?, ?, ?, ?, ?)');
                $stmtStudent->execute([$studentId, $userId, $name ?: 'Student', $college, $program]);
            } else if ($role === 'recruiter') {
                $companyId = 'c_' . bin2hex(random_bytes(10));
                $companyName = trim($input['company_name'] ?? ($name . ' Labs'));
                $industry = trim($input['industry'] ?? 'Technology');

                $stmtCompany = $db->prepare('INSERT INTO companies (id, user_id, name, industry) VALUES (?, ?, ?, ?)');
                $stmtCompany->execute([$companyId, $userId, $companyName, $industry]);
            }

            $db->commit();

            $token = JWT::encode([
                'user_id' => $userId,
                'email'   => $email,
                'role'    => $role
            ]);

            jsonResponse([
                'success' => true,
                'message' => 'Registration successful.',
                'token'   => $token,
                'user'    => [
                    'id'    => $userId,
                    'email' => $email,
                    'role'  => $role,
                    'name'  => $name
                ]
            ], 201);
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Registration failed: ' . $e->getMessage(), 500);
        }
    }

    public static function login(): void {
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            errorResponse('Email and password are required.');
        }

        $stmt = $db->prepare('SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            errorResponse('Invalid email or password credentials.', 401);
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

        $token = JWT::encode([
            'user_id' => $user['id'],
            'email'   => $user['email'],
            'role'    => $user['role']
        ]);

        jsonResponse([
            'success' => true,
            'token'   => $token,
            'user'    => [
                'id'      => $user['id'],
                'email'   => $user['email'],
                'role'    => $user['role'],
                'profile' => $profile
            ]
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
