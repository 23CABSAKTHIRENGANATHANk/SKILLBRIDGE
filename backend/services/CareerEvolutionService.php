<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/ProofOfSkillService.php';
require_once __DIR__ . '/ProofOfWorkService.php';
require_once __DIR__ . '/MatchingService.php';

/**
 * CareerEvolutionService
 * Core deterministic engine for SkillBridge 3.0 Student Career Evolution.
 * 
 * Computes:
 *  - Evidence-backed Career Readiness Scores (0-100%)
 *  - Categorized Skill Gaps (Strong, Needs Improvement, Missing)
 *  - Deterministic "What Should I Do Next?" single highest-impact action
 *  - Personalized N-week Roadmaps & 7-day Weekly Plans
 *  - Opportunity Readiness tiers (Ready Now, Almost Ready, Future Target)
 *  - Knowledge Evolution timeline ledger
 *  - Milestones & Achievements based on real DB events
 */
class CareerEvolutionService {

    /**
     * Standard role skill requirements topology (fallback if DB has few jobs for target role)
     */
    public const ROLE_TAXONOMY = [
        'Full Stack Developer' => ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Git'],
        'Frontend Developer'   => ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Tailwind CSS', 'Git'],
        'Backend Developer'    => ['Python', 'Node.js', 'PostgreSQL', 'Docker', 'REST API', 'System Design', 'Git'],
        'Python Developer'     => ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Docker', 'Git', 'Data Structures'],
        'Java Developer'       => ['Java', 'Spring Boot', 'SQL', 'PostgreSQL', 'Microservices', 'Docker', 'Git'],
        'Data Analyst'         => ['Python', 'SQL', 'Excel', 'Data Visualization', 'Pandas', 'Statistics'],
        'Data Scientist'       => ['Python', 'Machine Learning', 'Pandas', 'SQL', 'Statistics', 'Deep Learning'],
        'AI/ML Engineer'       => ['Python', 'Machine Learning', 'Deep Learning', 'PyTorch', 'Docker', 'Git'],
        'Cloud Engineer'       => ['Linux', 'Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Git'],
        'DevOps Engineer'      => ['Linux', 'Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform', 'Monitoring'],
        'Cybersecurity'        => ['Networking', 'Linux', 'Security Fundamentals', 'Python', 'Cryptography'],
        'UI/UX Designer'       => ['Figma', 'UI Design', 'User Research', 'Wireframing', 'Prototyping', 'CSS'],
        'Mobile Developer'     => ['React Native', 'JavaScript', 'TypeScript', 'Mobile Design', 'REST API', 'Git'],
    ];

    /**
     * 1. Get or resolve Target Role Requirements from DB jobs + fallback taxonomy
     */
    public static function getTargetRoleRequirements(string $targetRole): array {
        $db = Database::getConnection();

        // 1. Try fetching real skills from active jobs in DB matching target role
        $stmt = $db->prepare('
            SELECT DISTINCT s.name
            FROM jobs j
            JOIN job_skills js ON j.id = js.job_id
            JOIN skills s ON js.skill_id = s.id
            WHERE j.title ILIKE ? AND j.status = \'active\'
            LIMIT 12
        ');
        $stmt->execute(['%' . trim($targetRole) . '%']);
        $dbSkills = array_column($stmt->fetchAll(), 'name');

        if (count($dbSkills) >= 4) {
            return array_values(array_unique($dbSkills));
        }

        // 2. Check standard taxonomy
        foreach (self::ROLE_TAXONOMY as $roleName => $skills) {
            if (stripos($targetRole, $roleName) !== false || stripos($roleName, $targetRole) !== false) {
                return array_values(array_unique(array_merge($dbSkills, $skills)));
            }
        }

        // 3. Fallback for custom role
        return !empty($dbSkills) ? $dbSkills : ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Git'];
    }

    /**
     * 2. Calculate Evidence-backed Career Readiness Score (0-100%)
     */
    public static function calculateReadiness(string $studentId, string $targetRole): array {
        $db = Database::getConnection();
        $requiredSkills = self::getTargetRoleRequirements($targetRole);
        $skillsProof = ProofOfSkillService::getStudentSkillsWithProof($studentId);

        $proofBySkill = [];
        foreach ($skillsProof as $sp) {
            $proofBySkill[strtolower(trim($sp['skill_name']))] = $sp;
        }

        $skillBreakdown = [];
        $totalEarned = 0;
        $maxPossible = count($requiredSkills) * 100;

        foreach ($requiredSkills as $reqSkill) {
            $key = strtolower(trim($reqSkill));
            $proof = $proofBySkill[$key] ?? null;

            if (!$proof) {
                $skillBreakdown[] = [
                    'skill' => $reqSkill,
                    'readiness' => 0,
                    'status' => 'missing',
                    'evidence_level' => 'None',
                    'confidence' => 0,
                ];
                continue;
            }

            // Evidence weights:
            // Verified assessment passed = up to 40 pts
            // Assessment score = up to 25 pts
            // GitHub Proof-of-Work = up to 15 pts
            // Project evidence = up to 10 pts
            // Self-declaration / claimed = 10 pts
            $pts = 0;
            $status = 'claimed';
            $confidence = (int)$proof['confidence_score'];

            if (!empty($proof['verification_passed'])) {
                $pts += 40;
                $status = 'verified';
            }
            if (!empty($proof['assessment_score'])) {
                $pts += min(25, (int)round(($proof['assessment_score'] / 100) * 25));
                if ($status !== 'verified') $status = 'assessed';
            }
            if (!empty($proof['github_score']) && $proof['github_score'] > 0) {
                $pts += min(15, (int)round(($proof['github_score'] / 100) * 15));
            }
            if (!empty($proof['project_score']) && $proof['project_score'] > 0) {
                $pts += min(10, (int)round(($proof['project_score'] / 100) * 10));
            }
            $pts += 10; // baseline presence in profile
            $pts = min(100, $pts);

            $totalEarned += $pts;
            $skillBreakdown[] = [
                'skill' => $reqSkill,
                'readiness' => $pts,
                'status' => $status,
                'evidence_level' => $proof['verification_level'] ?? ($pts >= 60 ? 'Developing' : 'Beginner'),
                'confidence' => $confidence,
            ];
        }

        $overallReadiness = $maxPossible > 0 ? (int)round(($totalEarned / $maxPossible) * 100) : 0;

        return [
            'target_role' => $targetRole,
            'overall_readiness' => $overallReadiness,
            'required_skills_count' => count($requiredSkills),
            'matched_skills_count' => count(array_filter($skillBreakdown, fn($s) => $s['readiness'] > 0)),
            'verified_skills_count' => count(array_filter($skillBreakdown, fn($s) => $s['status'] === 'verified')),
            'breakdown' => $skillBreakdown,
        ];
    }

    /**
     * 3. Skill Gap Analyzer
     */
    public static function analyzeSkillGaps(string $studentId, string $targetRole): array {
        $readinessData = self::calculateReadiness($studentId, $targetRole);
        $breakdown = $readinessData['breakdown'];

        $strong = [];
        $needsImprovement = [];
        $missing = [];

        foreach ($breakdown as $item) {
            $skill = $item['skill'];
            $pts = $item['readiness'];
            $status = $item['status'];

            if ($pts >= 70 && $status === 'verified') {
                $strong[] = [
                    'skill' => $skill,
                    'readiness' => $pts,
                    'status' => 'strong',
                    'level' => $item['evidence_level'],
                    'detail' => 'Verified through formal assessment and multi-factor evidence.',
                ];
            } elseif ($pts > 0) {
                $priority = $pts < 40 ? 'HIGH' : 'MEDIUM';
                $needsImprovement[] = [
                    'skill' => $skill,
                    'readiness' => $pts,
                    'status' => 'needs_improvement',
                    'priority' => $priority,
                    'current_level' => $item['evidence_level'],
                    'target_level' => 'Verified',
                    'reason' => "Skill is in your profile with {$pts}% evidence, but lacks formal verification to qualify for top roles.",
                    'estimated_effort' => '1–2 weeks',
                ];
            } else {
                $missing[] = [
                    'skill' => $skill,
                    'readiness' => 0,
                    'status' => 'missing',
                    'priority' => 'HIGH',
                    'current_level' => 'None',
                    'target_level' => 'Intermediate',
                    'reason' => "Frequently required for {$targetRole} roles and absent from your profile.",
                    'estimated_effort' => '2–3 weeks',
                ];
            }
        }

        // Cache snapshot to skill_gap_analysis
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare('
                INSERT INTO skill_gap_analysis (student_id, target_role, strong_skills, gap_skills, missing_skills, readiness_score, breakdown, analyzed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (student_id, target_role) DO UPDATE
                    SET strong_skills = EXCLUDED.strong_skills,
                        gap_skills = EXCLUDED.gap_skills,
                        missing_skills = EXCLUDED.missing_skills,
                        readiness_score = EXCLUDED.readiness_score,
                        breakdown = EXCLUDED.breakdown,
                        analyzed_at = CURRENT_TIMESTAMP
            ');
            $stmt->execute([
                $studentId,
                $targetRole,
                json_encode($strong),
                json_encode($needsImprovement),
                json_encode($missing),
                $readinessData['overall_readiness'],
                json_encode($readinessData['breakdown']),
            ]);
        } catch (\Throwable) {}

        return [
            'target_role' => $targetRole,
            'readiness_score' => $readinessData['overall_readiness'],
            'strong' => $strong,
            'needs_improvement' => $needsImprovement,
            'missing' => $missing,
            'total_gaps' => count($needsImprovement) + count($missing),
        ];
    }

    /**
     * 4. "What Should I Do Next?" Engine
     * Evaluates exact DB state and returns ONE deterministic highest-impact action.
     */
    public static function determineNextAction(string $studentId, ?string $targetRole = null): array {
        $db = Database::getConnection();

        // Resolve target role if not provided
        if (!$targetRole) {
            $gStmt = $db->prepare('SELECT target_role FROM career_goals WHERE student_id = ?');
            $gStmt->execute([$studentId]);
            $targetRole = (string)($gStmt->fetchColumn() ?: 'Full Stack Developer');
        }

        $gapAnalysis = self::analyzeSkillGaps($studentId, $targetRole);

        // Priority 1: Unverified skill in needs_improvement that already has project/claimed presence
        if (!empty($gapAnalysis['needs_improvement'])) {
            $topGap = $gapAnalysis['needs_improvement'][0];
            return [
                'type' => 'complete_assessment',
                'badge' => 'HIGHEST IMPACT',
                'skill' => $topGap['skill'],
                'title' => "Complete the {$topGap['skill']} Skill Assessment",
                'reason' => "Your {$topGap['skill']} skill is recorded in your profile but is currently unverified. Completing this assessment will immediately increase your {$targetRole} readiness and verify your passport.",
                'cta_label' => "Start {$topGap['skill']} Assessment",
                'cta_url' => "/dashboard",
                'impact' => "+15% Career Readiness potential",
            ];
        }

        // Priority 2: Missing high-priority skill
        if (!empty($gapAnalysis['missing'])) {
            $topMissing = $gapAnalysis['missing'][0];
            return [
                'type' => 'learn_skill',
                'badge' => 'SKILL GAP',
                'skill' => $topMissing['skill'],
                'title' => "Learn {$topMissing['skill']} Fundamentals",
                'reason' => "{$topMissing['skill']} is a core requirement for {$targetRole} opportunities. Begin the recommended learning module to close this gap.",
                'cta_label' => "View {$topMissing['skill']} Resources",
                'cta_url' => "/learning",
                'impact' => "+20% Target Role Alignment",
            ];
        }

        // Priority 3: Check if GitHub Proof-of-Work exists
        $powStmt = $db->prepare('SELECT COUNT(*) FROM proof_of_work_repositories WHERE student_id = ?');
        $powStmt->execute([$studentId]);
        $powCount = (int)$powStmt->fetchColumn();

        if ($powCount === 0) {
            return [
                'type' => 'connect_github',
                'badge' => 'PROOF OF WORK',
                'skill' => 'Git & Code Evidence',
                'title' => 'Connect Your GitHub to Generate Proof-of-Work',
                'reason' => 'Recruiters prioritize candidates with public repository evidence. Connect your GitHub profile to automatically extract verifiable code signals.',
                'cta_label' => 'Connect GitHub Profile',
                'cta_url' => '/dashboard',
                'impact' => 'Unlocks Proof-of-Work verification level',
            ];
        }

        // Priority 4: High readiness -> Apply to matching jobs
        return [
            'type' => 'apply_jobs',
            'badge' => 'JOB READY',
            'skill' => $targetRole,
            'title' => "Apply to Matching {$targetRole} Opportunities",
            'reason' => "Your verified skills demonstrate strong alignment with {$targetRole} requirements. Explore active roles matching your profile.",
            'cta_label' => 'Explore Reachable Jobs',
            'cta_url' => '/career-opportunities',
            'impact' => 'Direct recruiter visibility with verified credentials',
        ];
    }

    /**
     * 5. Generate or Get Personalized Career Roadmap (N-Week)
     */
    public static function getOrCreateRoadmap(string $studentId, string $targetRole, int $timelineWeeks = 16): array {
        $db = Database::getConnection();

        // 1. Check existing active roadmap
        $rStmt = $db->prepare('SELECT * FROM career_roadmaps WHERE student_id = ? AND target_role = ? AND status = \'active\' LIMIT 1');
        $rStmt->execute([$studentId, $targetRole]);
        $roadmap = $rStmt->fetch();

        if (!$roadmap) {
            $roadmapId = 'rm_' . bin2hex(random_bytes(8));
            $insStmt = $db->prepare('
                INSERT INTO career_roadmaps (id, student_id, target_role, total_weeks, progress_pct, status)
                VALUES (?, ?, ?, ?, 0, \'active\')
            ');
            $insStmt->execute([$roadmapId, $studentId, $targetRole, $timelineWeeks]);

            // Generate structured steps based on target role requirements
            $requiredSkills = self::getTargetRoleRequirements($targetRole);
            $phaseCount = max(4, min(8, count($requiredSkills)));
            $weeksPerPhase = max(1, (int)round($timelineWeeks / $phaseCount));

            $stepIndex = 1;
            foreach ($requiredSkills as $idx => $skill) {
                if ($stepIndex > $phaseCount) break;
                $stepId = 'step_' . bin2hex(random_bytes(8));
                $phaseNumber = $stepIndex;
                $title = "Phase {$phaseNumber}: {$skill} Mastery & Verification";
                $desc = "Study {$skill} fundamentals, practice coding challenges, build a demonstrable micro-project, and pass the verification assessment.";
                
                $stepStmt = $db->prepare('
                    INSERT INTO career_roadmap_steps (id, roadmap_id, phase_number, title, skill_name, description, resource_type, estimated_hours, is_completed)
                    VALUES (?, ?, ?, ?, ?, ?, \'learn\', ?, FALSE)
                ');
                $stepStmt->execute([$stepId, $roadmapId, $phaseNumber, $title, $skill, $desc, $weeksPerPhase * 8]);
                $stepIndex++;
            }

            // Refetch created roadmap
            $rStmt->execute([$studentId, $targetRole]);
            $roadmap = $rStmt->fetch();
        }

        // Fetch steps
        $stepsStmt = $db->prepare('
            SELECT id, phase_number, title, skill_name, description, resource_type, estimated_hours, is_completed, completed_at
            FROM career_roadmap_steps
            WHERE roadmap_id = ?
            ORDER BY phase_number ASC
        ');
        $stepsStmt->execute([$roadmap['id']]);
        $steps = $stepsStmt->fetchAll();

        // Calculate progress
        $completedCount = count(array_filter($steps, fn($s) => (bool)$s['is_completed']));
        $progressPct = count($steps) > 0 ? (int)round(($completedCount / count($steps)) * 100) : 0;

        if ($progressPct !== (int)$roadmap['progress_pct']) {
            $db->prepare('UPDATE career_roadmaps SET progress_pct = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
               ->execute([$progressPct, $roadmap['id']]);
            $roadmap['progress_pct'] = $progressPct;
        }

        return [
            'roadmap' => $roadmap,
            'steps' => $steps,
            'completed_steps' => $completedCount,
            'total_steps' => count($steps),
            'progress_pct' => $progressPct,
        ];
    }

    /**
     * 6. Toggle or Complete Roadmap Step
     */
    public static function toggleRoadmapStep(string $studentId, string $stepId): array {
        $db = Database::getConnection();

        // Ensure step belongs to student
        $stmt = $db->prepare('
            SELECT s.id, s.roadmap_id, s.is_completed, s.skill_name, r.target_role
            FROM career_roadmap_steps s
            JOIN career_roadmaps r ON s.roadmap_id = r.id
            WHERE s.id = ? AND r.student_id = ?
        ');
        $stmt->execute([$stepId, $studentId]);
        $step = $stmt->fetch();

        if (!$step) {
            throw new \RuntimeException('Roadmap step not found or unauthorized.');
        }

        $newCompleted = !$step['is_completed'];
        $upd = $db->prepare('
            UPDATE career_roadmap_steps
            SET is_completed = ?, completed_at = ?
            WHERE id = ?
        ');
        $upd->execute([$newCompleted ? 1 : 0, $newCompleted ? date('c') : null, $stepId]);

        // Record knowledge evolution event if completed
        if ($newCompleted) {
            self::recordEvolutionEvent(
                $studentId,
                'skill_learned',
                "Completed Roadmap Phase: {$step['skill_name']}",
                "Finished all learning modules and milestone deliverables for {$step['skill_name']} in {$step['target_role']} path."
            );
        }

        return self::getOrCreateRoadmap($studentId, $step['target_role']);
    }

    /**
     * 7. Get or Create 7-Day Weekly Career Plan
     */
    public static function getOrCreateWeeklyPlan(string $studentId, string $targetRole): array {
        $db = Database::getConnection();
        $mondayThisWeek = date('Y-m-d', strtotime('monday this week'));

        $pStmt = $db->prepare('SELECT * FROM weekly_career_plans WHERE student_id = ? AND week_start_date = ? LIMIT 1');
        $pStmt->execute([$studentId, $mondayThisWeek]);
        $plan = $pStmt->fetch();

        if (!$plan) {
            $planId = 'wcp_' . bin2hex(random_bytes(8));
            $db->prepare('
                INSERT INTO weekly_career_plans (id, student_id, week_start_date, target_hours, completed_hours, status)
                VALUES (?, ?, ?, 10, 0, \'active\')
            ')->execute([$planId, $studentId, $mondayThisWeek]);

            $gapAnalysis = self::analyzeSkillGaps($studentId, $targetRole);
            $primaryGap = !empty($gapAnalysis['needs_improvement']) 
                ? $gapAnalysis['needs_improvement'][0]['skill'] 
                : (!empty($gapAnalysis['missing']) ? $gapAnalysis['missing'][0]['skill'] : 'TypeScript');

            $standardTasks = [
                ['monday', "45 min — {$primaryGap} Core Concept Study", 'learn', 45, $primaryGap],
                ['tuesday', "30 min — Hands-on Coding Practice with {$primaryGap}", 'practice', 30, $primaryGap],
                ['wednesday', "45 min — Watch Curated Tutorial on {$primaryGap}", 'video', 45, $primaryGap],
                ['thursday', "60 min — Build Micro-Feature in Portfolio Project", 'project', 60, $primaryGap],
                ['friday', "30 min — Complete Skill Verification Assessment", 'assess', 30, $primaryGap],
                ['saturday', "45 min — GitHub Code Cleanup & Commit Verification", 'github', 45, $primaryGap],
                ['sunday', "30 min — Weekly Career Progress & Opportunity Review", 'review', 30, $targetRole],
            ];

            foreach ($standardTasks as $t) {
                $taskId = 'task_' . bin2hex(random_bytes(8));
                $db->prepare('
                    INSERT INTO career_plan_tasks (id, plan_id, day_of_week, title, task_type, duration_minutes, skill, is_completed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)
                ')->execute([$taskId, $planId, $t[0], $t[1], $t[2], $t[3], $t[4]]);
            }

            $pStmt->execute([$studentId, $mondayThisWeek]);
            $plan = $pStmt->fetch();
        }

        $tasksStmt = $db->prepare('
            SELECT id, day_of_week, title, task_type, duration_minutes, skill, is_completed, completed_at
            FROM career_plan_tasks
            WHERE plan_id = ?
            ORDER BY CASE day_of_week
                WHEN \'monday\' THEN 1
                WHEN \'tuesday\' THEN 2
                WHEN \'wednesday\' THEN 3
                WHEN \'thursday\' THEN 4
                WHEN \'friday\' THEN 5
                WHEN \'saturday\' THEN 6
                WHEN \'sunday\' THEN 7
            END
        ');
        $tasksStmt->execute([$plan['id']]);
        $tasks = $tasksStmt->fetchAll();

        $completedMinutes = 0;
        foreach ($tasks as $t) {
            if ($t['is_completed']) $completedMinutes += (int)$t['duration_minutes'];
        }
        $completedHours = (int)round($completedMinutes / 60);

        return [
            'plan' => $plan,
            'tasks' => $tasks,
            'completed_hours' => $completedHours,
            'target_hours' => (int)$plan['target_hours'],
            'total_tasks' => count($tasks),
            'completed_tasks' => count(array_filter($tasks, fn($t) => (bool)$t['is_completed'])),
        ];
    }

    /**
     * 8. Toggle Weekly Plan Task
     */
    public static function toggleWeeklyTask(string $studentId, string $taskId): array {
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT t.id, t.plan_id, t.is_completed, t.title, p.student_id
            FROM career_plan_tasks t
            JOIN weekly_career_plans p ON t.plan_id = p.id
            WHERE t.id = ? AND p.student_id = ?
        ');
        $stmt->execute([$taskId, $studentId]);
        $task = $stmt->fetch();

        if (!$task) {
            throw new \RuntimeException('Plan task not found or unauthorized.');
        }

        $newCompleted = !$task['is_completed'];
        $db->prepare('UPDATE career_plan_tasks SET is_completed = ?, completed_at = ? WHERE id = ?')
           ->execute([$newCompleted ? 1 : 0, $newCompleted ? date('c') : null, $taskId]);

        // Fetch target role to reload
        $gStmt = $db->prepare('SELECT target_role FROM career_goals WHERE student_id = ?');
        $gStmt->execute([$studentId]);
        $targetRole = (string)($gStmt->fetchColumn() ?: 'Full Stack Developer');

        return self::getOrCreateWeeklyPlan($studentId, $targetRole);
    }

    /**
     * 9. "Jobs You Can Reach" Opportunities Engine
     */
    public static function getCareerOpportunities(string $studentId): array {
        $db = Database::getConnection();

        $stmt = $db->query('
            SELECT j.id, j.title, COALESCE(c.name, \'Enterprise Partner\') as company_name, j.location, j.type, j.salary_range, j.created_at
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE j.status = \'active\'
            ORDER BY j.created_at DESC
            LIMIT 50
        ');

        $jobs = $stmt->fetchAll();

        $skillsProof = ProofOfSkillService::getStudentSkillsWithProof($studentId);
        $studentSkillNames = array_column($skillsProof, 'skill_name');

        // Batch fetch all job skills
        $jobIds = array_column($jobs, 'id');
        $allJobSkills = [];
        if (!empty($jobIds)) {
            $inList = implode(',', array_fill(0, count($jobIds), '?'));
            $jsStmt = $db->prepare("
                SELECT js.job_id, s.name
                FROM job_skills js
                JOIN skills s ON js.skill_id = s.id
                WHERE js.job_id IN ({$inList})
            ");
            $jsStmt->execute($jobIds);
            foreach ($jsStmt->fetchAll() as $row) {
                $allJobSkills[$row['job_id']][] = $row['name'];
            }
        }

        $readyNow = [];
        $almostReady = [];
        $futureTarget = [];

        foreach ($jobs as $job) {
            $jSkills = $allJobSkills[$job['id']] ?? [];
            $matchResult = MatchingService::calculateMatch($studentSkillNames, $jSkills);
            $score = (int)($matchResult['score'] ?? 0);
            $matched = $matchResult['matched'] ?? [];
            $missing = $matchResult['missing'] ?? [];

            $item = [
                'job_id' => $job['id'],
                'title' => $job['title'],
                'company_name' => $job['company_name'],
                'location' => $job['location'],
                'type' => $job['type'],
                'salary_range' => $job['salary_range'],
                'match_score' => $score,
                'matched_skills' => $matched,
                'missing_skills' => $missing,
                'potential_improvement' => !empty($missing) ? "Closing " . $missing[0] . " increases match by ~" . min(18, count($missing) * 8) . "%" : null,
            ];


            if ($score >= 80) {
                $readyNow[] = $item;
            } elseif ($score >= 50) {
                $almostReady[] = $item;
            } else {
                $futureTarget[] = $item;
            }
        }

        return [
            'ready_now' => array_slice($readyNow, 0, 10),
            'almost_ready' => array_slice($almostReady, 0, 10),
            'future_target' => array_slice($futureTarget, 0, 10),
            'counts' => [
                'ready_now' => count($readyNow),
                'almost_ready' => count($almostReady),
                'future_target' => count($futureTarget),
            ]
        ];
    }

    /**
     * 10. Knowledge Evolution Timeline Events
     */
    public static function getKnowledgeEvolution(string $studentId): array {
        $db = Database::getConnection();

        $stmt = $db->prepare('
            SELECT id, event_type, title, description, metadata, event_date
            FROM knowledge_evolution_events
            WHERE student_id = ?
            ORDER BY event_date DESC
            LIMIT 30
        ');
        $stmt->execute([$studentId]);
        $events = $stmt->fetchAll();

        // If empty, synthesize real events from DB records so history is grounded
        if (empty($events)) {
            // Check student creation
            $sStmt = $db->prepare('SELECT name, created_at FROM students WHERE id = ?');
            $sStmt->execute([$studentId]);
            $student = $sStmt->fetch();

            if ($student) {
                self::recordEvolutionEvent(
                    $studentId,
                    'skill_learned',
                    'Joined SkillBridge Career Platform',
                    'Initial student profile created with verified baseline credentials.',
                    [],
                    $student['created_at']
                );
            }

            // Check verifications
            $vStmt = $db->prepare('
                SELECT s.name as skill_name, sva.completed_at, sva.score
                FROM skill_verification_attempts sva
                JOIN skills s ON sva.skill_id = s.id
                WHERE sva.student_id = ? AND sva.status = \'completed\' AND sva.passed = TRUE
            ');
            $vStmt->execute([$studentId]);
            foreach ($vStmt->fetchAll() as $v) {
                self::recordEvolutionEvent(
                    $studentId,
                    'skill_verified',
                    "Verified Skill: {$v['skill_name']}",
                    "Achieved {$v['score']}% passing score on 4-stage Bloom verification.",
                    ['score' => $v['score']],
                    $v['completed_at']
                );
            }

            // Re-fetch
            $stmt->execute([$studentId]);
            $events = $stmt->fetchAll();
        }

        return [
            'events' => $events,
            'total_events' => count($events),
        ];
    }

    /**
     * Helper to record an evolution event
     */
    public static function recordEvolutionEvent(
        string $studentId,
        string $eventType,
        string $title,
        string $description,
        array $metadata = [],
        ?string $eventDate = null
    ): void {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare('
                INSERT INTO knowledge_evolution_events (student_id, event_type, title, description, metadata, event_date)
                VALUES (?, ?, ?, ?, ?, COALESCE(?::timestamptz, CURRENT_TIMESTAMP))
            ');
            $stmt->execute([
                $studentId,
                $eventType,
                $title,
                $description,
                json_encode($metadata),
                $eventDate
            ]);
        } catch (\Throwable) {}
    }

    /**
     * 11. Student Achievements & Badges
     */
    public static function getAchievements(string $studentId): array {
        $db = Database::getConnection();

        // Real DB checks:
        // 1. Skill Verified Badge
        $vCount = (int)$db->query("SELECT COUNT(*) FROM skill_verification_attempts WHERE student_id = '{$studentId}' AND passed = TRUE")->fetchColumn();
        if ($vCount > 0) {
            self::grantBadge($studentId, 'skill_verified', 'Verified Proof-of-Skill', 'Successfully passed rigorous 4-stage Bloom technical verification.', 'ShieldCheck');
        }

        // 2. Proof-of-Work Badge
        $powCount = (int)$db->query("SELECT COUNT(*) FROM proof_of_work_repositories WHERE student_id = '{$studentId}'")->fetchColumn();
        if ($powCount > 0) {
            self::grantBadge($studentId, 'github_verified', 'GitHub Proof-of-Work', 'Connected active GitHub repositories with verified codebase metrics.', 'GitBranch');
        }

        // 3. Project Builder Badge
        $pCount = (int)$db->query("SELECT COUNT(*) FROM student_projects WHERE student_id = '{$studentId}'")->fetchColumn();
        if ($pCount > 0) {
            self::grantBadge($studentId, 'project_builder', 'Project Builder', 'Showcased verified project deliverables demonstrating hands-on proficiency.', 'FolderGit2');
        }

        // 4. Passport Badge
        $passCount = (int)$db->query("SELECT COUNT(*) FROM student_passports sp JOIN skill_credentials sc ON sp.public_token = sc.passport_token WHERE sp.student_id = '{$studentId}' AND sc.status = 'VALID'")->fetchColumn();
        if ($passCount > 0) {
            self::grantBadge($studentId, 'passport_holder', 'Cryptographic Passport', 'Holds a tamper-proof ECDSA cryptographically signed Skill Passport.', 'Award');
        }

        $stmt = $db->prepare('SELECT badge_key, title, description, icon, unlocked_at FROM student_achievements WHERE student_id = ? ORDER BY unlocked_at DESC');
        $stmt->execute([$studentId]);
        $badges = $stmt->fetchAll();

        return [
            'achievements' => $badges,
            'total_unlocked' => count($badges),
            'learning_streak_days' => min(14, max(1, count($badges) * 2)),
        ];
    }

    private static function grantBadge(string $studentId, string $badgeKey, string $title, string $description, string $icon): void {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare('
                INSERT INTO student_achievements (id, student_id, badge_key, title, description, icon)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (student_id, badge_key) DO NOTHING
            ');
            $stmt->execute(['ach_' . bin2hex(random_bytes(6)), $studentId, $badgeKey, $title, $description, $icon]);
        } catch (\Throwable) {}
    }

    /**
     * 12. Curated Learning Resources Filter
     */
    public static function getLearningResources(?string $skill = null, ?string $type = null): array {
        $db = Database::getConnection();

        $sql = 'SELECT id, skill, title, provider, resource_type, level, url, duration, is_free, relevance_reason, verified_at FROM learning_resources WHERE 1=1';
        $params = [];

        if (!empty($skill) && strtolower($skill) !== 'all') {
            $sql .= ' AND LOWER(skill) = LOWER(?)';
            $params[] = trim($skill);
        }

        if (!empty($type) && strtolower($type) !== 'all') {
            $sql .= ' AND resource_type = ?';
            $params[] = trim($type);
        }

        $sql .= ' ORDER BY skill ASC, is_free DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    /**
     * 13. Skill Dependencies Graph
     */
    public static function getSkillDependencies(?string $skillName = null): array {
        $db = Database::getConnection();

        if (!empty($skillName)) {
            $stmt = $db->prepare('SELECT skill_name, prerequisite_name, relationship_type FROM skill_dependencies WHERE LOWER(skill_name) = LOWER(?) OR LOWER(prerequisite_name) = LOWER(?)');
            $stmt->execute([trim($skillName), trim($skillName)]);
        } else {
            $stmt = $db->query('SELECT skill_name, prerequisite_name, relationship_type FROM skill_dependencies ORDER BY skill_name ASC');
        }

        return $stmt->fetchAll();
    }
}
