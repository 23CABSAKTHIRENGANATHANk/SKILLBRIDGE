<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../services/MatchingService.php';
require_once __DIR__ . '/../services/FileUploadService.php';
require_once __DIR__ . '/../services/ProofOfSkillService.php';
require_once __DIR__ . '/../services/ResumeExtractionService.php';
require_once __DIR__ . '/../services/GeminiService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class StudentController {
    /**
     * Get student profile
     */
    public static function getProfile(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student', 'admin');
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM students WHERE user_id = ? LIMIT 1');
        $stmt->execute([$currentUser['user_id']]);
        $student = $stmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $skStmt = $db->prepare('
            SELECT s.id as skill_id, s.name as skill_name, sk.proficiency 
            FROM student_skills sk
            JOIN skills s ON sk.skill_id = s.id
            WHERE sk.student_id = ?
        ');
        $skStmt->execute([$student['id']]);
        $skills = $skStmt->fetchAll();

        $projStmt = $db->prepare('SELECT id, title, description, tech_stack, project_url, github_url FROM student_projects WHERE student_id = ? ORDER BY created_at DESC');
        $projStmt->execute([$student['id']]);
        $projects = $projStmt->fetchAll();

        $certStmt = $db->prepare('SELECT id, title, issuer, issue_date, credential_url FROM student_certificates WHERE student_id = ? ORDER BY created_at DESC');
        $certStmt->execute([$student['id']]);
        $certificates = $certStmt->fetchAll();

        // Calculate profile completion
        $hasCustomAvatar = !empty($student['avatar_url']);
        $hasExperience = (count($projects) > 0) || (!empty($student['experience']) && !in_array(strtolower(trim($student['experience'])), ['fresher', 'none', '']));
        $hasResume = !empty($student['resume_storage_key']);
        $hasSkills = count($skills) >= 3;
        $hasCertificates = count($certificates) > 0;

        $steps = [
            ['id' => 'profile', 'label' => 'Profile', 'complete' => $hasCustomAvatar],
            ['id' => 'skills', 'label' => 'Skills', 'complete' => $hasSkills],
            ['id' => 'resume', 'label' => 'Resume', 'complete' => $hasResume],
            ['id' => 'projects', 'label' => 'Projects', 'complete' => $hasExperience],
            ['id' => 'certificates', 'label' => 'Certificates', 'complete' => $hasCertificates]
        ];

        // Group current skills into canonical categories
        $categorizedSkills = ResumeExtractionService::categorizeSkills($skills);

        // Also fetch detected resume skills if resume exists
        $detectedResumeSkills = [];
        $categorizedDetectedSkills = null;
        if (!empty($student['resume_storage_key'])) {
            try {
                $ext = ResumeExtractionService::extractTextFromFile($student['resume_storage_key']);
                if (!empty($ext['text'])) {
                    $matched = ResumeExtractionService::matchSkillsInText($ext['text']);
                    $detectedResumeSkills = $matched;
                    $categorizedDetectedSkills = ResumeExtractionService::categorizeSkills($matched);
                }
            } catch (\Throwable $e) {}
        }

        jsonResponse([
            'success' => true,
            'student' => [
                'id' => $student['id'],
                'name' => $student['name'],
                'avatarUrl' => $student['avatar_url'],
                'college' => $student['college'],
                'program' => $student['program'],
                'experience' => $student['experience'],
                'hasResume' => !empty($student['resume_storage_key'])
            ],
            'skills'                      => $skills,
            'categorized_skills'          => $categorizedSkills,
            'detected_resume_skills'      => $detectedResumeSkills,
            'categorized_detected_skills' => $categorizedDetectedSkills,
            'skill_proof'                 => ProofOfSkillService::getStudentSkillsWithProof($student['id']),
            'projects'                    => $projects,
            'certificates'                => $certificates,
            'progress' => [
                'percent' => $percent,
                'steps'   => $steps
            ]
        ]);
    }

    /**
     * Get student dashboard metrics
     */
    public static function getDashboard(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student', 'admin');
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id, name, avatar_url, college, program, resume_storage_key, experience FROM students WHERE user_id = ? LIMIT 1');
        $stmt->execute([$currentUser['user_id']]);
        $student = $stmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // 1. Pipeline counts
        $pipelineStmt = $db->prepare('
            SELECT stage, COUNT(*) as count 
            FROM applications 
            WHERE student_id = ? 
            GROUP BY stage
        ');
        $pipelineStmt->execute([$student['id']]);
        $stageRows = $pipelineStmt->fetchAll();

        $pipeline = [
            'applied' => 0,
            'shortlisted' => 0,
            'interview' => 0,
            'offer' => 0,
            'hired' => 0
        ];
        foreach ($stageRows as $row) {
            $stage = $row['stage'];
            if (isset($pipeline[$stage])) {
                $pipeline[$stage] = (int)$row['count'];
            }
        }

        // 2. Recent applications
        $appStmt = $db->prepare('
            SELECT a.id, a.stage, a.updated_at,
                   j.id as job_id, j.title as job_title, c.name as company_name
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.student_id = ?
            ORDER BY a.updated_at DESC
            LIMIT 5
        ');
        $appStmt->execute([$student['id']]);
        $rawApps = $appStmt->fetchAll();

        $applications = [];
        foreach ($rawApps as $app) {
            $diff = time() - strtotime($app['updated_at']);
            $timeStr = $diff < 86400 ? 'Today' : (int)floor($diff / 86400) . ' days ago';
            $applications[] = [
                'id' => $app['id'],
                'stage' => $app['stage'],
                'updatedAt' => $timeStr,
                'job' => [
                    'id' => $app['job_id'],
                    'title' => $app['job_title'],
                    'companyName' => $app['company_name']
                ]
            ];
        }

        // 3. Counts for skills, projects, and certificates
        $skStmt = $db->prepare('SELECT COUNT(*) FROM student_skills WHERE student_id = ?');
        $skStmt->execute([$student['id']]);
        $skillsCount = (int)$skStmt->fetchColumn();

        $projStmt = $db->prepare('SELECT COUNT(*) FROM student_projects WHERE student_id = ?');
        $projStmt->execute([$student['id']]);
        $projectsCount = (int)$projStmt->fetchColumn();

        $certStmt = $db->prepare('SELECT COUNT(*) FROM student_certificates WHERE student_id = ?');
        $certStmt->execute([$student['id']]);
        $certsCount = (int)$certStmt->fetchColumn();

        // 4. Progress calculation
        $hasCustomAvatar = !empty($student['avatar_url']);
        $hasExperience = ($projectsCount > 0) || (!empty($student['experience']) && !in_array(strtolower(trim($student['experience'])), ['fresher', 'none', '']));
        $hasResume = !empty($student['resume_storage_key']);
        $hasSkills = $skillsCount >= 3;
        $hasCertificates = $certsCount > 0;

        $steps = [
            ['id' => 'profile', 'label' => 'Profile', 'complete' => $hasCustomAvatar],
            ['id' => 'skills', 'label' => 'Skills', 'complete' => $hasSkills],
            ['id' => 'resume', 'label' => 'Resume', 'complete' => $hasResume],
            ['id' => 'projects', 'label' => 'Projects', 'complete' => $hasExperience],
            ['id' => 'certificates', 'label' => 'Certificates', 'complete' => $hasCertificates]
        ];
        $completedCount = count(array_filter($steps, fn($s) => $s['complete']));
        $percent = (int)round(($completedCount / count($steps)) * 100);

        jsonResponse([
            'success' => true,
            'pipeline' => $pipeline,
            'progress' => [
                'percent' => $percent,
                'steps' => $steps
            ],
            'applications' => $applications
        ]);
    }

    /**
     * Add normalized skill to student profile
     */
    public static function addSkill(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $rawSkillInput = trim((string)($input['skill_name'] ?? ''));
        if (empty($rawSkillInput)) {
            errorResponse('Skill name is required.');
        }

        $rawProf = $input['proficiency'] ?? 'intermediate';
        $proficiency = 'intermediate';
        if (is_numeric($rawProf)) {
            $num = (int)$rawProf;
            $proficiency = $num >= 85 ? 'expert' : ($num >= 65 ? 'advanced' : ($num >= 40 ? 'intermediate' : 'beginner'));
        } else if (in_array(strtolower((string)$rawProf), ['beginner', 'intermediate', 'advanced', 'expert'], true)) {
            $proficiency = strtolower((string)$rawProf);
        }

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // Support single skill or comma-separated list of skills
        $skillNames = array_filter(array_map('trim', explode(',', $rawSkillInput)));

        foreach ($skillNames as $skillName) {
            if (empty($skillName)) continue;
            $normName = strtolower($skillName);
            $mStmt = $db->prepare('SELECT id FROM skills WHERE normalized_name = ? LIMIT 1');
            $mStmt->execute([$normName]);
            $masterSkill = $mStmt->fetch();

            if (!$masterSkill) {
                $newSkillId = 'sk_' . bin2hex(random_bytes(6));
                $insStmt = $db->prepare('INSERT INTO skills (id, name, normalized_name) VALUES (?, ?, ?)');
                $insStmt->execute([$newSkillId, $skillName, $normName]);
                $skillId = $newSkillId;
            } else {
                $skillId = $masterSkill['id'];
            }

            $checkStmt = $db->prepare('SELECT id FROM student_skills WHERE student_id = ? AND skill_id = ?');
            $checkStmt->execute([$student['id'], $skillId]);
            if ($checkStmt->fetch()) {
                $upStmt = $db->prepare('UPDATE student_skills SET proficiency = ? WHERE student_id = ? AND skill_id = ?');
                $upStmt->execute([$proficiency, $student['id'], $skillId]);
            } else {
                $insStmt = $db->prepare('INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES (?, ?, ?)');
                $insStmt->execute([$student['id'], $skillId, $proficiency]);
            }

            $evStmt = $db->prepare('
                INSERT INTO skill_evidence (id, student_id, skill_id, source, confidence, metadata, verified_at)
                VALUES (?, ?, ?, \'self_declared\', 100, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (student_id, skill_id, source)
                DO UPDATE SET confidence = EXCLUDED.confidence, metadata = EXCLUDED.metadata, verified_at = CURRENT_TIMESTAMP
            ');
            $evStmt->execute([
                'ev_' . bin2hex(random_bytes(8)),
                $student['id'],
                $skillId,
                json_encode(['source' => 'student_skill_entry'])
            ]);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Skill(s) saved to profile.'
        ]);
    }

    /**
     * Batch approve and add detected resume skills to student profile
     */
    public static function batchApproveSkills(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $sStmt = $db->prepare('SELECT id, program, college, resume_storage_key FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch(\PDO::FETCH_ASSOC);

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $rawSkills = $input['skills'] ?? [];
        if (empty($rawSkills) && !empty($student['resume_storage_key'])) {
            $extracted = ResumeExtractionService::matchSkillsInText(
                ResumeExtractionService::extractTextFromFile($student['resume_storage_key'])['text'] ?? ''
            );
            $rawSkills = $extracted;
        }

        if (empty($rawSkills)) {
            errorResponse('No skills provided to approve.', 400);
        }

        // Pre-fetch entire skills catalog into an in-memory map (reduces 40 DB roundtrips to 1)
        $catalogStmt = $db->query('SELECT id, name, normalized_name, category FROM skills');
        $dbSkillMap = [];
        foreach ($catalogStmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
            $dbSkillMap[strtolower(trim($row['normalized_name']))] = $row;
            $dbSkillMap[strtolower(trim($row['name']))] = $row;
        }

        // Begin Atomic Transaction for ultrafast batch insert
        $db->beginTransaction();

        $insSkill = $db->prepare('
            INSERT INTO skills (id, name, normalized_name, category)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (normalized_name) DO NOTHING
        ');

        $insStudentSkill = $db->prepare('
            INSERT INTO student_skills (student_id, skill_id, proficiency)
            VALUES (?, ?, ?)
            ON CONFLICT (student_id, skill_id) DO NOTHING
        ');

        $insEvidence = $db->prepare('
            INSERT INTO skill_evidence (
                id, student_id, skill_id, source, confidence, metadata, verified_at
            ) VALUES (?, ?, ?, \'resume_evidence\', 75.0, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, skill_id, source)
            DO UPDATE SET confidence = EXCLUDED.confidence,
                          metadata = EXCLUDED.metadata,
                          verified_at = CURRENT_TIMESTAMP
        ');

        $addedCount = 0;
        $approvedSkillDetails = [];
        $meta = json_encode([
            'source_label'    => 'Approved by student from detected resume skills',
            'approved_at'     => date('c'),
            'approved_by_user'=> $currentUser['email'] ?? $currentUser['user_id']
        ]);

        try {
            foreach ($rawSkills as $item) {
                $rawName = is_array($item) ? ($item['name'] ?? '') : (string)$item;
                $rawCat = is_array($item) ? ($item['category'] ?? 'Other') : 'Other';
                $prof = is_array($item) ? ($item['proficiency'] ?? 'intermediate') : 'intermediate';

                $norm = ResumeExtractionService::normalizeSkill($rawName);
                if (!$norm) continue;

                $normName = strtolower(trim($norm['normalized_name']));
                $canonicalName = $norm['name'];
                $category = !empty($norm['category']) && $norm['category'] !== 'Technical' ? $norm['category'] : $rawCat;

                $dbSkill = $dbSkillMap[$normName] ?? null;

                if (!$dbSkill) {
                    $newId = 'sk_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $canonicalName));
                    try {
                        $insSkill->execute([$newId, $canonicalName, $normName, $category]);
                        $dbSkill = ['id' => $newId, 'name' => $canonicalName, 'normalized_name' => $normName, 'category' => $category];
                        $dbSkillMap[$normName] = $dbSkill;
                    } catch (\Throwable $e) {}
                }

                if (!$dbSkill) continue;

                $sId = $dbSkill['id'];

                // Insert student skill & evidence
                $insStudentSkill->execute([$student['id'], $sId, $prof]);

                $evId = 'ev_res_appr_' . bin2hex(random_bytes(6));
                $insEvidence->execute([$evId, $student['id'], $sId, $meta]);

                $addedCount++;
                $approvedSkillDetails[] = [
                    'id'       => $sId,
                    'name'     => $dbSkill['name'],
                    'category' => $dbSkill['category']
                ];
            }

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            error_log('Batch skill approval error: ' . $e->getMessage());
            errorResponse('Database error during skill approval.', 500);
        }

        // Trigger Career Evolution / Readiness Recalculation (non-blocking)
        try {
            $careerGoal = CareerEvolutionService::getCareerGoal($student['id']);
            if ($careerGoal && !empty($careerGoal['target_role'])) {
                $readiness = CareerEvolutionService::calculateReadiness($student['id'], $careerGoal['target_role']);
                CareerEvolutionService::recordReadinessSnapshot(
                    $student['id'],
                    $careerGoal['target_role'],
                    (int)($readiness['readiness_score'] ?? 0),
                    $readiness['readiness_tier'] ?? 'Developing',
                    $readiness
                );
            }
        } catch (\Throwable $e) {
            error_log('Career evolution sync error: ' . $e->getMessage());
        }

        // Fetch all current student skills
        $allStmt = $db->prepare('
            SELECT sk.id, sk.name, sk.category, ss.proficiency
            FROM student_skills ss
            JOIN skills sk ON ss.skill_id = sk.id
            WHERE ss.student_id = ?
            ORDER BY sk.name ASC
        ');
        $allStmt->execute([$student['id']]);
        $allSkills = $allStmt->fetchAll(\PDO::FETCH_ASSOC);

        $categorized = ResumeExtractionService::categorizeSkills($allSkills);

        jsonResponse([
            'success'            => true,
            'message'            => "{$addedCount} skills approved and synchronized to your verified profile!",
            'skills_approved'    => $addedCount,
            'total_skills_count' => count($allSkills),
            'skills'             => $allSkills,
            'categorized_skills' => $categorized
        ]);
    }

    /**
     * Return deterministic proof and confidence breakdown for the current student.
     */
    public static function getSkillProof(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id FROM students WHERE user_id = ? LIMIT 1');
        $stmt->execute([$currentUser['user_id']]);
        $student = $stmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        jsonResponse([
            'success' => true,
            'skills' => ProofOfSkillService::getStudentSkillsWithProof($student['id'])
        ]);
    }

    /**
     * Upload resume to private protected storage & trigger Intelligent Auto-Sync Engine
     */
    public static function uploadResume(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();

        $sStmt = $db->prepare('SELECT id, name, program, college, experience, phone FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch(\PDO::FETCH_ASSOC);

        if (!$student) {
            errorResponse('Student not found.', 404);
        }

        $file = $_FILES['resume'] ?? $_FILES['file'] ?? null;
        if (!$file) {
            errorResponse('No resume file provided.', 400);
        }

        $upload = FileUploadService::uploadResume($file);
        if (!$upload['success']) {
            errorResponse($upload['error'] ?? 'Upload failed.', 400);
        }

        $resumeId = 'res_' . bin2hex(random_bytes(8));

        // 1. Trigger Full Resume Intelligent Auto-Sync Engine
        $syncResult = ResumeExtractionService::processResumeAutoSync($student['id'], $upload['storageKey'], $resumeId);

        if (!($syncResult['success'] ?? false)) {
            errorResponse($syncResult['error'] ?? 'Resume analysis could not be completed.', 422);
        }

        // 2. Compute instant AI resume analysis & deterministic ATS score
        $resumeAnalysis = null;
        try {
            $extText = $syncResult['structured_data']['personal']['summary'] ?? '';
            if (empty($extText)) {
                $rawExt = ResumeExtractionService::extractTextFromFile($upload['storageKey']);
                $extText = $rawExt['text'] ?? '';
            }

            // Fetch newly updated student skills
            $skStmt = $db->prepare('
                SELECT sk.name FROM student_skills ss
                JOIN skills sk ON ss.skill_id = sk.id
                WHERE ss.student_id = ?
            ');
            $skStmt->execute([$student['id']]);
            $updatedSkills = $skStmt->fetchAll(\PDO::FETCH_COLUMN);

            $resumeAnalysis = GeminiService::summariseResume(
                $extText,
                $student['name'] ?? 'Student',
                $student['program'] ?? 'Computer Science',
                $updatedSkills
            );
        } catch (\Throwable $e) {
            error_log('Automated resume analysis error: ' . $e->getMessage());
        }

        jsonResponse([
            'success'            => true,
            'message'            => 'Resume uploaded and profile intelligently synchronized.',
            'hasResume'          => true,
            'resume_id'          => $resumeId,
            'analysis'           => $syncResult['analysis'] ?? [],
            'sync'               => $syncResult['sync'] ?? $syncResult['summary'] ?? [],
            'summary'            => $syncResult['summary'] ?? [],
            'conflicts'          => $syncResult['conflicts'] ?? [],
            'career_impact'      => $syncResult['career_impact'] ?? [
                'readiness_updated'   => true,
                'skill_gaps_updated'  => true,
                'job_matches_updated' => true,
                'next_action_updated' => true,
            ],
            'skills_detected'    => $syncResult['skills_detected'] ?? [],
            'categorized_skills' => $syncResult['categorized_skills'] ?? ResumeExtractionService::categorizeSkills($syncResult['skills_detected'] ?? []),
            'extraction'         => [
                'success'              => $syncResult['success'] ?? true,
                'format'               => $syncResult['format'] ?? 'pdf',
                'word_count'           => $syncResult['word_count'] ?? 0,
                'matched_skills_count' => $syncResult['matched_skills_count'] ?? 0,
                'matched_skills'       => $syncResult['matched_skills'] ?? [],
            ],
            'resume_analysis'    => $resumeAnalysis ?? ($syncResult['analysis']['resume_quality'] ?? null),
            'ats_analysis'       => $syncResult['analysis']['ats_analysis'] ?? null,
        ]);
    }

    /**
     * Get pending resume conflicts requiring student review
     */
    public static function getResumeConflicts(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch(\PDO::FETCH_ASSOC);

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $cStmt = $db->prepare('
            SELECT id, resume_id, field, existing_value, resume_value, status, created_at
            FROM resume_conflicts
            WHERE student_id = ? AND status = \'requires_review\'
            ORDER BY created_at DESC
        ');
        $cStmt->execute([$student['id']]);
        $conflicts = $cStmt->fetchAll(\PDO::FETCH_ASSOC);

        jsonResponse([
            'success'   => true,
            'conflicts' => $conflicts
        ]);
    }

    /**
     * Resolve a resume conflict (Keep Existing vs Use Resume Value)
     */
    public static function resolveResumeConflict(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $conflictId = trim((string)($input['conflict_id'] ?? ''));
        $resolution = trim((string)($input['resolution'] ?? '')); // 'keep_existing' | 'use_resume'

        if (empty($conflictId) || !in_array($resolution, ['keep_existing', 'use_resume'], true)) {
            errorResponse('Valid conflict_id and resolution (keep_existing|use_resume) are required.', 400);
        }

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch(\PDO::FETCH_ASSOC);

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $cStmt = $db->prepare('SELECT id, field, existing_value, resume_value, status FROM resume_conflicts WHERE id = ? AND student_id = ? LIMIT 1');
        $cStmt->execute([$conflictId, $student['id']]);
        $conflict = $cStmt->fetch(\PDO::FETCH_ASSOC);

        if (!$conflict) {
            errorResponse('Conflict record not found.', 404);
        }

        $db->beginTransaction();
        try {
            if ($resolution === 'use_resume') {
                $field = $conflict['field'];
                $resumeVal = $conflict['resume_value'];

                if ($field === 'phone') {
                    $up = $db->prepare('UPDATE students SET phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
                    $up->execute([$resumeVal, $student['id']]);
                } elseif (in_array($field, ['location', 'bio', 'github_url', 'linkedin_url', 'portfolio_url'], true)) {
                    $up = $db->prepare("UPDATE students SET {$field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                    $up->execute([$resumeVal, $student['id']]);
                }
            }

            $upConf = $db->prepare('UPDATE resume_conflicts SET status = \'resolved\', resolution = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?');
            $upConf->execute([$resolution, $conflictId]);

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            error_log('Conflict resolution failed: ' . $e->getMessage());
            errorResponse('Unable to resolve conflict. Please try again.', 500);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Conflict resolved successfully.',
            'resolution' => $resolution
        ]);
    }

    /**
     * Get resume processing history for the student
     */
    public static function getResumeHistory(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch(\PDO::FETCH_ASSOC);

        if (!$student) {
            errorResponse('Student not found.', 404);
        }

        $hStmt = $db->prepare('
            SELECT id, resume_id, processing_status, extraction_status, sync_status,
                   summary, conflicts, parser_version, processed_at
            FROM resume_processing_history
            WHERE student_id = ?
            ORDER BY processed_at DESC
            LIMIT 10
        ');
        $hStmt->execute([$student['id']]);
        $history = $hStmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($history as &$item) {
            if (is_string($item['summary'])) {
                $item['summary'] = json_decode($item['summary'], true);
            }
            if (is_string($item['conflicts'])) {
                $item['conflicts'] = json_decode($item['conflicts'], true);
            }
        }

        jsonResponse([
            'success' => true,
            'history' => $history
        ]);
    }

    /**
     * Protected Resume Streaming Download
     * Enforces strict authorization: Student themselves, Admin, or Recruiter reviewing candidate's application
     */
    public static function streamResume(array $currentUser, string $studentId): void {
        $db = Database::getConnection();

        // 1. Fetch student resume key
        $sStmt = $db->prepare('SELECT id, user_id, name, resume_storage_key FROM students WHERE id = ?');
        $sStmt->execute([$studentId]);
        $student = $sStmt->fetch();

        if (!$student || empty($student['resume_storage_key'])) {
            errorResponse('Resume not found.', 404);
        }

        // 2. Authorization Check
        $isOwner = ($currentUser['user_id'] === $student['user_id']);
        $isAdmin = (($currentUser['role'] ?? '') === 'admin');
        $isAuthorizedRecruiter = false;

        if ($currentUser['role'] === 'recruiter') {
            // Check if student applied to any job posted by this recruiter's company
            $authCheckStmt = $db->prepare('
                SELECT a.id 
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                JOIN companies c ON j.company_id = c.id
                WHERE a.student_id = ? AND c.user_id = ?
                LIMIT 1
            ');
            $authCheckStmt->execute([$student['id'], $currentUser['user_id']]);
            $isAuthorizedRecruiter = (bool)$authCheckStmt->fetch();
        }

        if (!$isOwner && !$isAdmin && !$isAuthorizedRecruiter) {
            errorResponse('Access Denied: You do not have permission to view this candidate resume.', 403);
        }

        $filename = preg_replace('/[^a-zA-Z0-9_-]/', '_', $student['name']) . '_Resume.pdf';
        FileUploadService::streamProtectedFile($student['resume_storage_key'], $filename);
    }

    /**
     * Update student profile details (name, college, program, experience, avatar_url)
     */
    public static function updateProfile(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $sStmt = $db->prepare('SELECT id, user_id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $name = trim($input['name'] ?? '');
        $college = trim($input['college'] ?? '');
        $program = trim($input['program'] ?? '');
        $experience = trim($input['experience'] ?? '');
        $avatarUrl = trim($input['avatar_url'] ?? '');

        if (empty($name)) {
            errorResponse('Full name is required.');
        }

        $upStmt = $db->prepare('
            UPDATE students 
            SET name = ?, college = ?, program = ?, experience = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ');
        $upStmt->execute([$name, $college, $program, $experience, $avatarUrl ?: null, $student['id']]);

        AuditLogger::log('student.profile_update', $currentUser['user_id'], 'student', 'student', $student['id'], [
            'name' => $name,
            'college' => $college,
            'program' => $program
        ]);

        self::getProfile($currentUser);
    }

    public static function saveOnboarding(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $sStmt = $db->prepare('SELECT id, name, college FROM students WHERE user_id = ? LIMIT 1');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();
        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $program = trim((string)($input['program'] ?? ''));
        $experience = trim((string)($input['careerGoal'] ?? ''));
        if ($program === '') {
            errorResponse('Program is required.');
        }

        $db->beginTransaction();
        try {
            $update = $db->prepare('UPDATE students SET program = ?, experience = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            $update->execute([$program, $experience ?: 'Fresher', $student['id']]);

            $skills = $input['skills'] ?? [];
            if (is_array($skills)) {
                foreach ($skills as $skillName) {
                    $skillName = trim((string)$skillName);
                    if ($skillName === '') continue;
                    $norm = strtolower($skillName);
                    $find = $db->prepare('SELECT id FROM skills WHERE normalized_name = ? LIMIT 1');
                    $find->execute([$norm]);
                    $skill = $find->fetch();
                    if (!$skill) {
                        $skillId = 'sk_' . bin2hex(random_bytes(6));
                        $db->prepare('INSERT INTO skills (id, name, normalized_name) VALUES (?, ?, ?)')->execute([$skillId, $skillName, $norm]);
                    } else {
                        $skillId = $skill['id'];
                    }
                    $db->prepare('INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES (?, ?, ?) ON CONFLICT (student_id, skill_id) DO NOTHING')
                        ->execute([$student['id'], $skillId, 'intermediate']);
                    $db->prepare('INSERT INTO skill_evidence (id, student_id, skill_id, source, confidence, metadata) VALUES (?, ?, ?, \'self_declared\', 10, ?) ON CONFLICT (student_id, skill_id, source) DO NOTHING')
                        ->execute(['ev_' . bin2hex(random_bytes(8)), $student['id'], $skillId, json_encode(['source' => 'onboarding'])]);
                }
            }
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            error_log('Onboarding save failed: ' . $e->getMessage());
            errorResponse('Unable to save onboarding details. Please try again.', 500);
        }

        self::getProfile($currentUser);
    }

    /**
     * Delete a skill from student profile
     */
    public static function deleteSkill(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $skillId = trim($input['skill_id'] ?? ($_GET['skill_id'] ?? ''));

        if (empty($skillId)) {
            errorResponse('Skill ID is required.');
        }

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $delStmt = $db->prepare('DELETE FROM student_skills WHERE student_id = ? AND skill_id = ?');
        $delStmt->execute([$student['id'], $skillId]);

        jsonResponse([
            'success' => true,
            'message' => 'Skill removed from profile.'
        ]);
    }

    /**
     * Get Trust & Credibility profile for student with real endorsements from database
     */
    public static function getTrustProfile(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student', 'admin');
        $db = Database::getConnection();

        $sStmt = $db->prepare('SELECT id, name, college, program, resume_storage_key, phone_verified FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student not found.', 404);
        }

        // Real endorsements from PostgreSQL
        $endStmt = $db->prepare('
            SELECT re.id, re.rating, re.review_text as feedback, re.created_at,
                   c.name as company_name
            FROM recruiter_endorsements re
            JOIN users u ON re.recruiter_id = u.id
            LEFT JOIN companies c ON c.user_id = u.id
            WHERE re.student_id = ? AND re.is_published = TRUE
            ORDER BY re.created_at DESC
        ');
        $endStmt->execute([$student['id']]);
        $rawEndorsements = $endStmt->fetchAll();

        $endorsements = [];
        foreach ($rawEndorsements as $end) {
            $diff = time() - strtotime($end['created_at']);
            $dateStr = $diff < 86400 ? 'Today' : (int)floor($diff / 86400) . 'd ago';
            $endorsements[] = [
                'id' => $end['id'],
                'company_name' => $end['company_name'] ?? 'Verified Employer',
                'recruiter_title' => 'Technical Hiring Manager',
                'rating' => (int)$end['rating'],
                'feedback' => $end['feedback'],
                'date' => $dateStr,
                'verified_interview' => true
            ];
        }

        // Check GitHub evidence for proof-of-work
        $ghStmt = $db->prepare('SELECT id FROM student_github_profiles WHERE student_id = ? LIMIT 1');
        $ghStmt->execute([$student['id']]);
        $hasGithub = (bool)$ghStmt->fetch();

        // Check assessment completion
        $assessStmt = $db->prepare('SELECT COUNT(*) FROM skill_assessments WHERE student_id = ?');
        $assessStmt->execute([$student['id']]);
        $assessmentCount = (int)$assessStmt->fetchColumn();

        // Derive trust flags from real data
        $hasResume    = !empty($student['resume_storage_key']);
        $phoneVerified = !empty($student['phone_verified']) && (bool)$student['phone_verified'];
        $hasCollege    = !empty($student['college']) && $student['college'] !== 'University Student';

        // Trust score: base 40 + real data signals (max 100)
        $trustScore = 40
            + ($hasResume       ? 20 : 0)
            + ($phoneVerified   ? 10 : 0)
            + ($hasGithub       ? 10 : 0)
            + ($assessmentCount > 0 ? 10 : 0)
            + (count($endorsements) > 0 ? 10 : 0);

        jsonResponse([
            'success' => true,
            'trust_profile' => [
                'academic_verified'      => $hasCollege,
                'college_email_verified' => $hasCollege,
                'phone_verified'         => $phoneVerified,
                'identity_verified'      => $hasResume,
                'resume_verified'        => $hasResume,
                'github_connected'       => $hasGithub,
                'assessments_completed'  => $assessmentCount,
                'institution'            => $student['college'],
                'program'                => $student['program'],
                'trust_score'            => min(100, $trustScore),
                'endorsements'           => $endorsements
            ]
        ]);
    }


    /**
     * Add student project
     */
    public static function addProject(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $techStack = trim($input['tech_stack'] ?? '');
        $projectUrl = trim($input['project_url'] ?? '');
        $githubUrl = trim($input['github_url'] ?? '');

        if (empty($title)) {
            errorResponse('Project title is required.');
        }

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $projectId = 'proj_' . bin2hex(random_bytes(8));
        $insStmt = $db->prepare('
            INSERT INTO student_projects (id, student_id, title, description, tech_stack, project_url, github_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $insStmt->execute([$projectId, $student['id'], $title, $description, $techStack, $projectUrl, $githubUrl]);

        jsonResponse([
            'success' => true,
            'message' => 'Project added to portfolio.',
            'projectId' => $projectId
        ], 201);
    }

    /**
     * Delete student project
     */
    public static function deleteProject(array $currentUser, string $projectId): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $delStmt = $db->prepare('DELETE FROM student_projects WHERE id = ? AND student_id = ?');
        $delStmt->execute([$projectId, $student['id']]);

        jsonResponse([
            'success' => true,
            'message' => 'Project removed.'
        ]);
    }

    /**
     * Add student certificate
     */
    public static function addCertificate(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $title = trim($input['title'] ?? '');
        $issuer = trim($input['issuer'] ?? '');
        $issueDate = trim($input['issue_date'] ?? '');
        $credentialUrl = trim($input['credential_url'] ?? '');

        if (empty($title) || empty($issuer)) {
            errorResponse('Certificate title and issuer are required.');
        }

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $certId = 'cert_' . bin2hex(random_bytes(8));
        $insStmt = $db->prepare('
            INSERT INTO student_certificates (id, student_id, title, issuer, issue_date, credential_url)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $insStmt->execute([$certId, $student['id'], $title, $issuer, $issueDate, $credentialUrl]);

        jsonResponse([
            'success' => true,
            'message' => 'Certificate added to profile.',
            'certificateId' => $certId
        ], 201);
    }

    /**
     * Delete student certificate
     */
    public static function deleteCertificate(array $currentUser, string $certId): void {
        AuthMiddleware::requireRole($currentUser, 'student');
        $db = Database::getConnection();

        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        $delStmt = $db->prepare('DELETE FROM student_certificates WHERE id = ? AND student_id = ?');
        $delStmt->execute([$certId, $student['id']]);

        jsonResponse([
            'success' => true,
            'message' => 'Certificate removed.'
        ]);
    }

    /**
     * Simulated phone verification with instant confirmation
     */
    public static function verifyPhone(array $currentUser): void {
        AuthMiddleware::requireRole($currentUser, 'student', 'recruiter', 'admin');
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $phone = trim($input['phone'] ?? '');
        if (empty($phone)) {
            errorResponse('Phone number is required.', 400);
        }

        // Basic phone format validation: allow digits, spaces, dashes, +
        if (!preg_match('/^\+?[\d\s\-]{7,20}$/', $phone)) {
            errorResponse('Invalid phone number format.', 422);
        }

        // Get student ID from user
        $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ? LIMIT 1');
        $sStmt->execute([$currentUser['user_id']]);
        $student = $sStmt->fetch();

        if (!$student) {
            errorResponse('Student profile not found.', 404);
        }

        // Persist phone and mark as verified in the database
        $upStmt = $db->prepare('
            UPDATE students
            SET phone = ?, phone_verified = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ');
        $upStmt->execute([$phone, $student['id']]);

        AuditLogger::log('student.phone_verified', $currentUser['user_id'], 'student', 'student', $student['id'], [
            'phone' => $phone
        ]);

        jsonResponse([
            'success'  => true,
            'message'  => "Phone number {$phone} verified successfully.",
            'verified' => true,
            'phone'    => $phone
        ]);
    }
}

