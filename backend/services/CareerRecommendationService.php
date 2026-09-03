<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/CareerEvolutionService.php';
require_once __DIR__ . '/ProofOfSkillService.php';

final class CareerRecommendationService
{
    private const WEIGHT_GAP = 0.30;
    private const WEIGHT_PREREQ = 0.25;
    private const WEIGHT_CAREER = 0.20;
    private const WEIGHT_DIFF = 0.10;
    private const WEIGHT_QUAL = 0.10;
    private const WEIGHT_FRESH = 0.05;

    /**
     * Compute Multi-Factor Recommendation Score (0-100)
     */
    public static function calculateRecommendationScore(array $item, array $studentContext): array
    {
        // 1. Skill Gap Coverage (0-100)
        $isMissing = in_array(strtolower($item['skill'] ?? ''), $studentContext['missing_skills_lower'] ?? [], true);
        $scoreGap = $isMissing ? 100.0 : 40.0;

        // 2. Prerequisite Readiness (0-100)
        // Check if all prerequisites of the skill are mastered
        $prereqsMet = $item['prerequisites_satisfied'] ?? true;
        $scorePrereq = $prereqsMet ? 100.0 : 20.0;

        // 3. Career Alignment (0-100)
        $isCoreCareer = in_array(strtolower($item['skill'] ?? ''), $studentContext['core_career_skills_lower'] ?? [], true);
        $scoreCareer = $isCoreCareer ? 100.0 : 60.0;

        // 4. Difficulty Proximity (0-100)
        $studentLevel = $studentContext['proficiency_level'] ?? 'beginner';
        $itemLevel = strtolower($item['difficulty'] ?? $item['level'] ?? 'beginner');
        $levelMap = ['beginner' => 1, 'intermediate' => 2, 'advanced' => 3, 'expert' => 4];
        $studentRank = $levelMap[$studentLevel] ?? 1;
        $itemRank = $levelMap[$itemLevel] ?? 1;
        $diffDelta = abs($studentRank - $itemRank);
        $scoreDiff = match ($diffDelta) {
            0 => 100.0,
            1 => 75.0,
            2 => 45.0,
            default => 20.0
        };

        // 5. Resource Quality Score (0-100)
        $scoreQual = (float)($item['quality_score'] ?? 90.0);

        // 6. Freshness (0-100)
        $scoreFresh = !empty($item['last_verified_at']) ? 95.0 : 75.0;

        $finalScore = (self::WEIGHT_GAP * $scoreGap)
            + (self::WEIGHT_PREREQ * $scorePrereq)
            + (self::WEIGHT_CAREER * $scoreCareer)
            + (self::WEIGHT_DIFF * $scoreDiff)
            + (self::WEIGHT_QUAL * $scoreQual)
            + (self::WEIGHT_FRESH * $scoreFresh);

        return [
            'total_score' => round($finalScore, 1),
            'factors' => [
                'gap_coverage' => round($scoreGap, 1),
                'prerequisite_readiness' => round($scorePrereq, 1),
                'career_alignment' => round($scoreCareer, 1),
                'difficulty_proximity' => round($scoreDiff, 1),
                'resource_quality' => round($scoreQual, 1),
                'freshness' => round($scoreFresh, 1)
            ]
        ];
    }

    /**
     * Compute Student Career Readiness percentage (0-100) against a specific Career Role
     */
    public static function getCareerReadiness(string $studentId, ?string $careerIdOrSlug = null): array
    {
        $db = Database::getConnection();

        // 1. Fetch Student's Verified Skills & Confidence Scores
        $studentSkillsWithProof = ProofOfSkillService::getStudentSkillsWithProof($studentId);
        $verifiedSkills = [];
        $verifiedMap = [];
        foreach ($studentSkillsWithProof as $p) {
            $nameLower = strtolower(trim($p['skill_name']));
            $prof = strtolower($p['proficiency'] ?? 'intermediate');
            $profScore = match ($prof) {
                'expert' => 95.0,
                'advanced' => 85.0,
                'intermediate' => 70.0,
                default => 50.0
            };
            $rating = !empty($p['confidence_score']) ? (float)$p['confidence_score'] : $profScore;
            $verifiedMap[$nameLower] = [
                'name' => $p['skill_name'],
                'rating' => $rating,
                'verified' => !empty($p['verification_passed'])
            ];
            $verifiedSkills[] = $p['skill_name'];
        }

        // 2. Fetch Career Role
        $career = null;
        if ($careerIdOrSlug !== null && $careerIdOrSlug !== '') {
            $stmt = $db->prepare('
                SELECT * FROM careers 
                WHERE id = ? OR normalized_slug = ? OR LOWER(title) = LOWER(?)
                LIMIT 1
            ');
            $stmt->execute([$careerIdOrSlug, $careerIdOrSlug, $careerIdOrSlug]);
            $career = $stmt->fetch();
        }

        if (!$career) {
            // Check student career goals
            $stmt = $db->prepare('SELECT target_role FROM career_goals WHERE student_id = ? LIMIT 1');
            $stmt->execute([$studentId]);
            $targetRole = (string)($stmt->fetchColumn() ?: '');

            if ($targetRole !== '') {
                $stmt = $db->prepare('SELECT * FROM careers WHERE LOWER(title) = LOWER(?) OR normalized_slug = ? LIMIT 1');
                $stmt->execute([$targetRole, strtolower(str_replace(' ', '-', $targetRole))]);
                $career = $stmt->fetch();
            }

            if (!$career) {
                // Default to first career in database
                $career = $db->query('SELECT * FROM careers ORDER BY title ASC LIMIT 1')->fetch();
            }
        }

        if (!$career) {
            return [
                'career' => null,
                'readiness_score' => 0,
                'tier' => 'Not Started',
                'breakdown' => []
            ];
        }

        $requiredSkills = json_decode($career['required_skills'] ?? '[]', true) ?: [];
        $preferredSkills = json_decode($career['preferred_skills'] ?? '[]', true) ?: [];

        // Required skills coverage (weight: 0.50)
        $reqCount = count($requiredSkills);
        $reqMatched = 0;
        $missingRequired = [];
        foreach ($requiredSkills as $req) {
            $reqLower = strtolower($req);
            if (isset($verifiedMap[$reqLower]) && $verifiedMap[$reqLower]['rating'] >= 60.0) {
                $reqMatched++;
            } else {
                $missingRequired[] = $req;
            }
        }
        $reqScore = $reqCount > 0 ? ($reqMatched / $reqCount) * 100.0 : 100.0;

        // Preferred skills coverage (weight: 0.20)
        $prefCount = count($preferredSkills);
        $prefMatched = 0;
        $missingPreferred = [];
        foreach ($preferredSkills as $pref) {
            $prefLower = strtolower($pref);
            if (isset($verifiedMap[$prefLower])) {
                $prefMatched++;
            } else {
                $missingPreferred[] = $pref;
            }
        }
        $prefScore = $prefCount > 0 ? ($prefMatched / $prefCount) * 100.0 : 100.0;

        // Verified proficiency level vs expectation (weight: 0.15)
        $totalRating = 0.0;
        $ratedSkillsCount = 0;
        foreach ($requiredSkills as $req) {
            $reqLower = strtolower($req);
            if (isset($verifiedMap[$reqLower])) {
                $totalRating += $verifiedMap[$reqLower]['rating'];
                $ratedSkillsCount++;
            }
        }
        $profScore = $reqCount > 0 ? ($totalRating / ($reqCount * 100.0)) * 100.0 : 0.0;

        // Project portfolio evidence (weight: 0.15)
        $stmt = $db->prepare('
            SELECT COUNT(*) FROM student_projects sp
            WHERE sp.student_id = ?
        ');
        $stmt->execute([$studentId]);
        $projectCount = (int)$stmt->fetchColumn();
        $projScore = min(100.0, $projectCount * 33.3);

        $readiness = (0.50 * $reqScore) + (0.20 * $prefScore) + (0.15 * $profScore) + (0.15 * $projScore);
        $readiness = round(min(100.0, max(0.0, $readiness)), 1);

        $tier = match (true) {
            $readiness >= 85.0 => 'Job Ready (High)',
            $readiness >= 70.0 => 'Near Ready (Competitive)',
            $readiness >= 50.0 => 'Progressing (Intermediate)',
            default => 'Foundational (Early Stage)'
        };

        return [
            'career' => [
                'id' => $career['id'],
                'title' => $career['title'],
                'slug' => $career['normalized_slug'],
                'domain' => $career['domain'],
                'description' => $career['description']
            ],
            'readiness_score' => $readiness,
            'readiness_tier' => $tier,
            'breakdown' => [
                'required_skills_coverage' => round($reqScore, 1),
                'preferred_skills_coverage' => round($prefScore, 1),
                'proficiency_benchmark' => round($profScore, 1),
                'portfolio_evidence' => round($projScore, 1)
            ],
            'matched_skills' => array_values(array_diff($requiredSkills, $missingRequired)),
            'missing_required_skills' => $missingRequired,
            'missing_preferred_skills' => $missingPreferred,
            'project_count' => $projectCount
        ];
    }

    /**
     * "What Should I Do Next?" Recommendation Engine
     */
    public static function getNextBestAction(string $studentId, ?string $targetCareer = null): array
    {
        $db = Database::getConnection();

        // 1. Get Career Readiness & Missing Skills
        $readinessData = self::getCareerReadiness($studentId, $targetCareer);
        $career = $readinessData['career'];
        $missingSkills = $readinessData['missing_required_skills'];

        // 2. Fetch Dependency Graph to check prerequisites
        $stmt = $db->query('
            SELECT skill_name, prerequisite_name, relationship_type 
            FROM skill_dependencies
        ');
        $allDeps = $stmt->fetchAll();

        $prereqMap = []; // skill => [prereq1, prereq2]
        foreach ($allDeps as $d) {
            $skillLower = strtolower($d['skill_name']);
            $prereqMap[$skillLower][] = $d['prerequisite_name'];
        }

        // Student's verified skills lookup via ProofOfSkillService
        $confidenceMap = ProofOfSkillService::getStudentSkillConfidence($studentId);
        $studentMastered = [];
        foreach ($confidenceMap as $skLower => $conf) {
            if ($conf >= 50) {
                $studentMastered[] = $skLower;
            }
        }
        $studentMasteredLookup = array_flip($studentMastered);

        // 3. Prioritize Next Skill via Graph Dependencies
        $nextSkill = null;
        $nextSkillRationale = '';
        $isPrereqRecommendation = false;

        foreach ($missingSkills as $miss) {
            $missLower = strtolower($miss);
            $prereqs = $prereqMap[$missLower] ?? [];

            // Check if any prerequisite is missing
            $unmetPrereqs = [];
            foreach ($prereqs as $p) {
                if (!isset($studentMasteredLookup[strtolower($p)])) {
                    $unmetPrereqs[] = $p;
                }
            }

            if (!empty($unmetPrereqs)) {
                // Must master prerequisite first
                $nextSkill = $unmetPrereqs[0];
                $nextSkillRationale = "Master foundational prerequisite for {$miss}, which is required for your target role {$career['title']}.";
                $isPrereqRecommendation = true;
                break;
            } else {
                // Prerequisites already satisfied! This skill is ready to learn!
                $nextSkill = $miss;
                $nextSkillRationale = "Direct core skill gap for {$career['title']}. All prerequisites are met and verified.";
                break;
            }
        }

        if ($nextSkill === null && !empty($missingSkills)) {
            $nextSkill = $missingSkills[0];
            $nextSkillRationale = "Recommended core competency for {$career['title']}.";
        }

        if ($nextSkill === null) {
            // Student has mastered all required skills! Recommend applying to jobs or building an advanced portfolio
            $nextSkill = $career['title'] ?? 'Full Stack Engineering';
            $nextSkillRationale = "You have verified all core competencies for {$nextSkill}! Ready to apply to benchmark opportunities.";
        }

        // 4. Fetch Top Verified Learning Resource for $nextSkill
        $resStmt = $db->prepare("
            SELECT id, title, provider, resource_type, level, url, duration, is_free, relevance_reason, quality_score, source_id
            FROM learning_resources
            WHERE LOWER(skill) = LOWER(?)
            ORDER BY quality_score DESC, verified_at DESC
            LIMIT 1
        ");
        $resStmt->execute([$nextSkill]);
        $topResource = $resStmt->fetch() ?: null;

        // 5. Fetch Top Project Blueprint for $nextSkill
        $projStmt = $db->prepare("
            SELECT id, skill, title, description, deliverables, tech_stack, difficulty, repo_template_url, estimated_hours
            FROM project_recommendations
            WHERE LOWER(skill) = LOWER(?)
            LIMIT 1
        ");
        $projStmt->execute([$nextSkill]);
        $topProject = $projStmt->fetch() ?: null;

        // 6. Formulate Primary Action
        $estHours = $topResource['duration'] ?? (!empty($topProject['estimated_hours']) ? ($topProject['estimated_hours'] . ' hours') : null);
        $primaryAction = [
            'action_type' => $readinessData['readiness_score'] >= 85.0 ? 'apply_job' : ($topResource ? 'learn_skill' : 'build_project'),
            'focus_skill' => $nextSkill,
            'title' => $readinessData['readiness_score'] >= 85.0
                ? "Apply to Verified {$career['title']} Positions"
                : ($topResource ? "Learn {$nextSkill}: {$topResource['title']}" : "Build {$nextSkill} Capstone Project"),
            'rationale' => $nextSkillRationale,
            'estimated_hours' => $estHours,
            'learning_resource' => $topResource,
            'project_blueprint' => $topProject
        ];

        // 7. Formulate 3 Prioritized Secondary Follow-ups
        $secondaryActions = [];
        $secondarySkills = array_slice($missingSkills, 1, 3);
        foreach ($secondarySkills as $idx => $secSkill) {
            $pos = $idx + 2;
            $secondaryActions[] = [
                'priority' => $pos,
                'action_type' => 'learn_skill',
                'skill' => $secSkill,
                'title' => "Master {$secSkill}",
                'rationale' => "Target competency #{$pos} for {$career['title']}.",
                'expected_boost' => '+10% Readiness'
            ];
        }

        if (count($secondaryActions) < 3 && $topProject) {
            $secondaryActions[] = [
                'priority' => count($secondaryActions) + 1,
                'action_type' => 'build_project',
                'skill' => $nextSkill,
                'title' => $topProject['title'],
                'rationale' => 'Provide tangible proof-of-skill for employer evaluation.',
                'expected_boost' => '+12% Readiness'
            ];
        }

        return [
            'career_context' => $readinessData,
            'primary_action' => $primaryAction,
            'secondary_actions' => $secondaryActions,
            'active_gaps_count' => count($missingSkills)
        ];
    }

    /**
     * 4-Tier Reachable Jobs Engine with Detailed Gap Analysis
     */
    public static function getReachableJobs(string $studentId, ?string $careerRole = null): array
    {
        $db = Database::getConnection();

        // 1. Student's Verified Skills Map
        $studentSkills = ProofOfSkillService::getStudentSkillConfidence($studentId);

        // 2. Fetch Active Jobs with Company Name and Skills
        $stmt = $db->query("
            SELECT j.id, j.title, COALESCE(c.name, 'SkillBridge Partner') AS company, j.location, j.salary_range, j.type, j.description,
                   COALESCE(
                       (SELECT json_agg(s.name) FROM job_skills js JOIN skills s ON js.skill_id = s.id WHERE js.job_id = j.id),
                       '[]'::json
                   ) AS required_skills
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE j.status = 'active'
            LIMIT 100
        ");
        $allJobs = $stmt->fetchAll();

        $tier1 = []; // Ready Now (85-100%)
        $tier2 = []; // Nearly Ready (70-84%)
        $tier3 = []; // Skill Gap (50-69%)
        $tier4 = []; // Future Target (< 50%)

        foreach ($allJobs as $job) {
            $reqSkills = is_string($job['required_skills']) ? json_decode($job['required_skills'], true) : $job['required_skills'];
            if (!is_array($reqSkills) || empty($reqSkills)) {
                $reqSkills = ['Problem Solving', 'Communication'];
            }

            $reqCount = count($reqSkills);
            $matched = [];
            $missing = [];

            foreach ($reqSkills as $req) {
                $reqLower = strtolower(trim($req));
                if (isset($studentSkills[$reqLower]) && (float)$studentSkills[$reqLower] >= 60.0) {
                    $matched[] = $req;
                } else {
                    $missing[] = $req;
                }
            }

            $matchPercent = round(($reqCount > 0 ? (count($matched) / $reqCount) * 100.0 : 100.0), 1);

            // Closing steps
            $closingSteps = [];
            foreach ($missing as $m) {
                $closingSteps[] = "Complete verified learning module and pass proof-of-skill assessment for {$m}.";
            }

            $jobPayload = [
                'id' => $job['id'],
                'title' => $job['title'],
                'company' => $job['company'],
                'location' => $job['location'],
                'salary_range' => $job['salary_range'] ?? 'Competitive',
                'experience_level' => $job['experience_level'] ?? 'Entry / Mid Level',
                'job_url' => $job['job_url'] ?? ('/jobs/' . $job['id']),
                'match_score' => $matchPercent,
                'matched_skills' => $matched,
                'missing_skills' => $missing,
                'closing_steps' => array_slice($closingSteps, 0, 3)
            ];

            if ($matchPercent >= 85.0) {
                $jobPayload['tier'] = 'Ready Now';
                $jobPayload['reachability_timeline'] = 'Immediate (Apply today)';
                $tier1[] = $jobPayload;
            } elseif ($matchPercent >= 70.0) {
                $jobPayload['tier'] = 'Nearly Ready';
                $jobPayload['reachability_timeline'] = '2-4 weeks (1-2 minor skill gaps)';
                $tier2[] = $jobPayload;
            } elseif ($matchPercent >= 50.0) {
                $jobPayload['tier'] = 'Skill Gap';
                $jobPayload['reachability_timeline'] = '30-60 days (Structured learning path)';
                $tier3[] = $jobPayload;
            } else {
                $jobPayload['tier'] = 'Future Target';
                $jobPayload['reachability_timeline'] = '60-120 days (Foundational progression)';
                $tier4[] = $jobPayload;
            }
        }

        // Sort each tier descending by match_score
        $sortFn = static fn(array $a, array $b): int => $b['match_score'] <=> $a['match_score'];
        usort($tier1, $sortFn);
        usort($tier2, $sortFn);
        usort($tier3, $sortFn);
        usort($tier4, $sortFn);

        return [
            'total_opportunities' => count($allJobs),
            'tier_summary' => [
                'ready_now' => count($tier1),
                'nearly_ready' => count($tier2),
                'skill_gap' => count($tier3),
                'future_target' => count($tier4)
            ],
            'tiers' => [
                'ready_now' => $tier1,
                'nearly_ready' => $tier2,
                'skill_gap' => $tier3,
                'future_target' => array_slice($tier4, 0, 15) // Limit future targets to top 15
            ]
        ];
    }

    /**
     * Complete Technology Careers Catalog
     */
    public static function getCareers(?string $domain = null, ?string $search = null): array
    {
        $db = Database::getConnection();
        $sql = 'SELECT id, title, normalized_slug, description, domain, required_skills, preferred_skills, typical_experience, related_careers FROM careers WHERE 1=1';
        $params = [];

        if (!empty($domain) && strtolower($domain) !== 'all') {
            $sql .= ' AND LOWER(domain) = LOWER(?)';
            $params[] = trim($domain);
        }

        if (!empty($search)) {
            $sql .= ' AND (title ILIKE ? OR description ILIKE ?)';
            $params[] = '%' . trim($search) . '%';
            $params[] = '%' . trim($search) . '%';
        }

        $sql .= ' ORDER BY domain ASC, title ASC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $careers = $stmt->fetchAll();

        foreach ($careers as &$c) {
            $c['required_skills'] = json_decode($c['required_skills'] ?? '[]', true) ?: [];
            $c['preferred_skills'] = json_decode($c['preferred_skills'] ?? '[]', true) ?: [];
            $c['related_careers'] = json_decode($c['related_careers'] ?? '[]', true) ?: [];
            $c['skill_count'] = count($c['required_skills']);
        }
        unset($c);

        return $careers;
    }

    /**
     * Single Career Specification & Full Graph Details
     */
    public static function getCareerDetail(string $idOrSlug): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT * FROM careers 
            WHERE id = ? OR normalized_slug = ? OR LOWER(title) = LOWER(?)
            LIMIT 1
        ');
        $stmt->execute([$idOrSlug, $idOrSlug, $idOrSlug]);
        $career = $stmt->fetch();

        if (!$career) {
            return null;
        }

        $career['required_skills'] = json_decode($career['required_skills'] ?? '[]', true) ?: [];
        $career['preferred_skills'] = json_decode($career['preferred_skills'] ?? '[]', true) ?: [];
        $career['entry_level_skills'] = json_decode($career['entry_level_skills'] ?? '[]', true) ?: [];
        $career['intermediate_skills'] = json_decode($career['intermediate_skills'] ?? '[]', true) ?: [];
        $career['advanced_skills'] = json_decode($career['advanced_skills'] ?? '[]', true) ?: [];
        $career['related_careers'] = json_decode($career['related_careers'] ?? '[]', true) ?: [];
        $career['career_progression'] = json_decode($career['career_progression'] ?? '[]', true) ?: [];

        // Count reachable jobs matching this career title
        $jobStmt = $db->prepare('
            SELECT COUNT(*) FROM jobs 
            WHERE title ILIKE ? OR description ILIKE ?
        ');
        $jobStmt->execute(['%' . $career['title'] . '%', '%' . $career['title'] . '%']);
        $career['active_job_postings'] = (int)$jobStmt->fetchColumn();

        return $career;
    }

    /**
     * Skill Dependency Graph Topology
     */
    public static function getSkillDependencyGraph(): array
    {
        $db = Database::getConnection();

        $nodes = $db->query('
            SELECT id, name, category, difficulty 
            FROM skills 
            ORDER BY name ASC
        ')->fetchAll();

        $edges = $db->query('
            SELECT skill_name, prerequisite_name, relationship_type, strength, confidence 
            FROM skill_dependencies
            ORDER BY skill_name ASC
        ')->fetchAll();

        return [
            'total_nodes' => count($nodes),
            'total_edges' => count($edges),
            'nodes' => $nodes,
            'edges' => $edges
        ];
    }
}
