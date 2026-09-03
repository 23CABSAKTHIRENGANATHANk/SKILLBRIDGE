<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/CareerEvolutionService.php';
require_once __DIR__ . '/ProofOfSkillService.php';

final class DataRecommendationService
{
    private static string $freshness = "active = TRUE AND last_verified_at IS NOT NULL AND last_verified_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'";

    public static function getFullCareerProgressionChain(string $studentId, ?string $targetRole = null): array
    {
        $db = Database::getConnection();
        if (!$targetRole) {
            $stmt = $db->prepare('SELECT target_role FROM career_goals WHERE student_id = ?');
            $stmt->execute([$studentId]);
            $targetRole = (string)($stmt->fetchColumn() ?: '');
        }
        $requiredSkills = $targetRole !== '' ? CareerEvolutionService::getTargetRoleRequirements($targetRole) : [];
        $gapAnalysis = $targetRole !== '' ? CareerEvolutionService::analyzeSkillGaps($studentId, $targetRole) : ['needs_improvement' => [], 'missing' => []];
        $focusSkill = $gapAnalysis['needs_improvement'][0]['skill'] ?? $gapAnalysis['missing'][0]['skill'] ?? ($requiredSkills[0] ?? null);
        $courses = [];
        $videos = [];
        $projects = [];
        if ($focusSkill !== null) {
            $stmt = $db->prepare("SELECT lr.id, lr.title, lr.provider, lr.resource_type, lr.level, lr.url, lr.duration, lr.is_free, lr.relevance_reason, lr.source_id, lr.last_verified_at FROM learning_resources lr WHERE " . str_replace('active', 'lr.active', self::$freshness) . " AND LOWER(lr.skill) = LOWER(?) AND lr.resource_type IN ('course', 'documentation', 'article') LIMIT 4");
            $stmt->execute([$focusSkill]);
            $courses = $stmt->fetchAll();
            $stmt = $db->prepare("SELECT lr.id, lr.title, lr.provider, lr.resource_type, lr.level, lr.url, lr.duration, lr.is_free, lr.relevance_reason, lr.source_id, lr.last_verified_at FROM learning_resources lr WHERE " . str_replace('active', 'lr.active', self::$freshness) . " AND LOWER(lr.skill) = LOWER(?) AND lr.resource_type IN ('video', 'playlist') LIMIT 4");
            $stmt->execute([$focusSkill]);
            $videos = $stmt->fetchAll();
            $stmt = $db->prepare("SELECT id, skill, title, description, deliverables, tech_stack, difficulty, repo_template_url, estimated_hours, source_id, last_verified_at FROM project_recommendations WHERE " . self::$freshness . " AND LOWER(skill) = LOWER(?) LIMIT 2");
            $stmt->execute([$focusSkill]);
            $projects = $stmt->fetchAll();
        }
        $skill = null;
        if ($focusSkill !== null) {
            $stmt = $db->prepare('SELECT id, name FROM skills WHERE LOWER(name) = LOWER(?) LIMIT 1');
            $stmt->execute([$focusSkill]);
            $skill = $stmt->fetch() ?: null;
        }
        $proofs = ProofOfSkillService::getStudentSkillsWithProof($studentId);
        $opportunities = $targetRole !== '' ? CareerEvolutionService::getCareerOpportunities($studentId) : ['ready_now' => []];
        return [
            'career' => ['target_role' => $targetRole, 'required_skills' => $requiredSkills],
            'focus_gap' => $focusSkill === null ? null : ['skill' => $focusSkill, 'reason' => "Prioritized from the student's verified skill gap."],
            'recommended_courses' => $courses,
            'recommended_videos' => $videos,
            'recommended_projects' => $projects,
            'recommended_assessment' => $skill ? ['skill_id' => $skill['id'], 'skill_name' => $skill['name'], 'status' => 'ready_to_take', 'cta_url' => '/dashboard'] : null,
            'verified_skills' => array_values(array_filter($proofs, static fn(array $proof): bool => !empty($proof['verification_passed']))),
            'matching_jobs' => $opportunities['ready_now'],
            'chain_sequence' => ['career' => $targetRole ?: null, 'required_skill' => $focusSkill, 'course' => $courses[0]['title'] ?? null, 'video' => $videos[0]['title'] ?? null, 'project' => $projects[0]['title'] ?? null, 'assessment' => $skill ? "Verify {$skill['name']} Proof-of-Skill" : null]
        ];
    }

    public static function getProjects(?string $skill = null, ?string $difficulty = null): array
    {
        $sql = 'SELECT id, skill, title, description, deliverables, tech_stack, difficulty, repo_template_url, estimated_hours, created_at, source_id, last_verified_at FROM project_recommendations WHERE ' . self::$freshness;
        $params = [];
        if (!empty($skill) && strtolower($skill) !== 'all') { $sql .= ' AND LOWER(skill) = LOWER(?)'; $params[] = trim($skill); }
        if (!empty($difficulty) && strtolower($difficulty) !== 'all') { $sql .= ' AND difficulty = ?'; $params[] = trim($difficulty); }
        $sql .= ' ORDER BY difficulty ASC, title ASC';
        $stmt = Database::getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function getRegistryStatus(): array
    {
        $db = Database::getConnection();
        $sources = $db->query('SELECT id, source_name, source_type, source_url, license, terms_checked, collection_method, last_collected_at, last_verified_at, refresh_frequency, status FROM data_source_registry ORDER BY source_name ASC')->fetchAll();
        return ['sources' => $sources, 'source_count' => count($sources), 'staging_counts' => ['learning_resources' => (int)$db->query('SELECT COUNT(*) FROM staging_learning_resources')->fetchColumn(), 'projects' => (int)$db->query('SELECT COUNT(*) FROM staging_projects')->fetchColumn(), 'jobs' => (int)$db->query('SELECT COUNT(*) FROM staging_jobs')->fetchColumn()], 'production_counts' => ['skills' => (int)$db->query('SELECT COUNT(*) FROM skills')->fetchColumn(), 'learning_resources' => (int)$db->query('SELECT COUNT(*) FROM learning_resources WHERE ' . self::$freshness)->fetchColumn(), 'project_recommendations' => (int)$db->query('SELECT COUNT(*) FROM project_recommendations WHERE ' . self::$freshness)->fetchColumn(), 'jobs' => (int)$db->query('SELECT COUNT(*) FROM jobs WHERE ' . self::$freshness)->fetchColumn()]];
    }
}
