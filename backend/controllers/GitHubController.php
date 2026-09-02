<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/ProofOfSkillService.php';

/**
 * GitHubController
 * Analyzes public GitHub repositories to extract real proof-of-work signals.
 */
class GitHubController {

    public static function connectProfile(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $username = trim((string)($input['github_username'] ?? ''));
        if (empty($username)) {
            errorResponse('GitHub username is required.');
        }
        if (!preg_match('/^[A-Za-z0-9-]{1,39}$/', $username)) {
            errorResponse('Invalid GitHub username.');
        }

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // Fetch public repositories using GitHub API (with timeout & User-Agent)
        $ctx = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: SkillBridge-ProofOfWork-Bot/2.0\r\nAccept: application/vnd.github.v3+json\r\n",
                'timeout' => 5
            ]
        ]);

        $rawRepos = @file_get_contents("https://api.github.com/users/" . rawurlencode($username) . "/repos?per_page=15&sort=updated", false, $ctx);
        $repos = $rawRepos ? json_decode($rawRepos, true) : null;

        if (!is_array($repos)) {
            errorResponse('GitHub public repositories could not be analyzed. Please try again later.', 502);
        }

        $detectedLanguages = [];
        $detectedSkills = [];
        $topRepos = [];

        if (is_array($repos)) {
            foreach ($repos as $repo) {
                if (!empty($repo['language'])) {
                    $detectedLanguages[] = $repo['language'];
                    $detectedSkills[] = $repo['language'];
                }
                if (!empty($repo['topics']) && is_array($repo['topics'])) {
                    foreach ($repo['topics'] as $topic) {
                        $detectedSkills[] = ucfirst((string)$topic);
                    }
                }
                $topRepos[] = [
                    'name' => $repo['name'] ?? '',
                    'language' => $repo['language'] ?? 'N/A',
                    'stars' => (int)($repo['stargazers_count'] ?? 0),
                    'url' => $repo['html_url'] ?? "https://github.com/{$username}/" . ($repo['name'] ?? ''),
                    'description' => $repo['description'] ?? ''
                ];
            }
        }

        $detectedSkills = array_values(array_unique($detectedSkills));
        $detectedLanguages = array_values(array_unique($detectedLanguages));

        $pId = 'gh_' . bin2hex(random_bytes(8));
        $insStmt = $db->prepare('
            INSERT INTO student_github_profiles (id, student_id, github_username, public_repos_count, languages, detected_skills, top_repositories, analyzed_at)
            ON CONFLICT (student_id) DO UPDATE SET
                github_username = EXCLUDED.github_username,
                public_repos_count = EXCLUDED.public_repos_count,
                languages = EXCLUDED.languages,
                detected_skills = EXCLUDED.detected_skills,
                top_repositories = EXCLUDED.top_repositories,
                analyzed_at = CURRENT_TIMESTAMP
        ');
        $insStmt->execute([
            $pId,
            $student['id'],
            $username,
            count($topRepos),
            json_encode($detectedLanguages),
            json_encode($detectedSkills),
            json_encode(array_slice($topRepos, 0, 5))
        ]);

        // Record GitHub evidence for student's registered skills
        $skStmt = $db->prepare('SELECT id, name FROM skills');
        $skStmt->execute();
        $allSkills = $skStmt->fetchAll();

        foreach ($allSkills as $ms) {
            $norm = strtolower($ms['name']);
            foreach ($detectedSkills as $ds) {
                if (str_contains(strtolower((string)$ds), $norm)) {
                    $evStmt = $db->prepare('
                        INSERT INTO skill_evidence (id, student_id, skill_id, source, confidence, metadata, verified_at)
                        VALUES (?, ?, ?, \'github_evidence\', 85, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT (student_id, skill_id, source) DO UPDATE SET confidence = 85, verified_at = CURRENT_TIMESTAMP
                    ');
                    $evStmt->execute(['ev_gh_' . bin2hex(random_bytes(6)), $student['id'], $ms['id'], json_encode(['username' => $username])]);
                    break;
                }
            }
        }

        $skillsWithProof = ProofOfSkillService::getStudentSkillsWithProof($student['id']);

        jsonResponse([
            'success' => true,
            'message' => "GitHub profile @{$username} analyzed! Detected " . count($detectedSkills) . " technology signals.",
            'profile' => [
                'username' => $username,
                'repos_count' => count($topRepos),
                'languages' => $detectedLanguages,
                'detected_skills' => $detectedSkills,
                'top_repositories' => array_slice($topRepos, 0, 4)
            ],
            'updated_skills' => $skillsWithProof
        ]);
    }
}
