<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/FileUploadService.php';
require_once __DIR__ . '/SkillIntegrityService.php';
require_once __DIR__ . '/GeminiService.php';
require_once __DIR__ . '/CareerEvolutionService.php';

/**
 * ResumeExtractionService
 * SkillBridge 3.0 Native Resume Text & Skill Evidence Extraction Pipeline.
 * 
 * Pipeline:
 * Upload -> MIME & Magic Bytes Validation -> Private Storage -> Deep Text Extraction ->
 * Structured Data Parsing (Gemini AI + Deterministic Fallback) ->
 * Taxonomy Matching & Normalization -> Conflict Detection ->
 * Intelligent Merge & Persistence -> Skill Evidence Registration ->
 * Non-punitive Integrity Audit -> Career Intelligence Recalculation
 */
class ResumeExtractionService {

    /**
     * Pre-defined Master Engineering & Tech Skills Taxonomy with common aliases
     */
    public const MASTER_TAXONOMY = [
        // Programming Languages
        ['name' => 'Python', 'category' => 'Language', 'aliases' => ['python', 'python3', 'py']],
        ['name' => 'Java', 'category' => 'Language', 'aliases' => ['java', 'core java', 'j2ee']],
        ['name' => 'JavaScript', 'category' => 'Language', 'aliases' => ['javascript', 'js', 'ecmascript', 'es6', 'vanilla js']],
        ['name' => 'TypeScript', 'category' => 'Language', 'aliases' => ['typescript', 'ts']],
        ['name' => 'PHP', 'category' => 'Language', 'aliases' => ['php', 'php8', 'php7', 'modern php']],
        ['name' => 'C++', 'category' => 'Language', 'aliases' => ['c++', 'cpp']],
        ['name' => 'C', 'category' => 'Language', 'aliases' => ['c language', 'c programming']],
        ['name' => 'C#', 'category' => 'Language', 'aliases' => ['c#', 'csharp', '.net', 'dotnet']],
        ['name' => 'Go', 'category' => 'Language', 'aliases' => ['golang', 'go language', 'go']],
        ['name' => 'Rust', 'category' => 'Language', 'aliases' => ['rust', 'rustlang']],
        ['name' => 'Ruby', 'category' => 'Language', 'aliases' => ['ruby', 'ruby on rails', 'rails']],
        ['name' => 'Kotlin', 'category' => 'Language', 'aliases' => ['kotlin']],
        ['name' => 'Swift', 'category' => 'Language', 'aliases' => ['swift', 'swiftui']],
        ['name' => 'SQL', 'category' => 'Database', 'aliases' => ['sql', 'structured query language']],
        ['name' => 'HTML5', 'category' => 'Frontend', 'aliases' => ['html', 'html5']],
        ['name' => 'CSS3', 'category' => 'Frontend', 'aliases' => ['css', 'css3']],
        ['name' => 'Dart', 'category' => 'Mobile', 'aliases' => ['dart', 'flutter']],
        ['name' => 'Scala', 'category' => 'Language', 'aliases' => ['scala']],
        ['name' => 'R', 'category' => 'Data Science', 'aliases' => ['r programming', 'r language']],
        ['name' => 'Bash', 'category' => 'DevOps', 'aliases' => ['bash', 'shell script', 'shell scripting', 'powershell']],

        // Frontend Frameworks & Libraries
        ['name' => 'React', 'category' => 'Frontend', 'aliases' => ['react', 'react.js', 'reactjs']],
        ['name' => 'Next.js', 'category' => 'Frontend', 'aliases' => ['next.js', 'nextjs', 'next']],
        ['name' => 'Vue.js', 'category' => 'Frontend', 'aliases' => ['vue', 'vue.js', 'vuejs']],
        ['name' => 'Angular', 'category' => 'Frontend', 'aliases' => ['angular', 'angularjs', 'angular.js']],
        ['name' => 'Tailwind CSS', 'category' => 'Frontend', 'aliases' => ['tailwind', 'tailwind css', 'tailwindcss']],
        ['name' => 'Bootstrap', 'category' => 'Frontend', 'aliases' => ['bootstrap', 'bootstrap5']],
        ['name' => 'Redux', 'category' => 'Frontend', 'aliases' => ['redux', 'redux toolkit', 'rtk']],
        ['name' => 'Sass', 'category' => 'Frontend', 'aliases' => ['sass', 'scss']],
        ['name' => 'Vite', 'category' => 'Frontend', 'aliases' => ['vite', 'vite.js']],

        // Backend Frameworks
        ['name' => 'Node.js', 'category' => 'Backend', 'aliases' => ['node.js', 'nodejs', 'node']],
        ['name' => 'Express.js', 'category' => 'Backend', 'aliases' => ['express', 'express.js', 'expressjs']],
        ['name' => 'Django', 'category' => 'Backend', 'aliases' => ['django', 'django rest framework', 'drf']],
        ['name' => 'Flask', 'category' => 'Backend', 'aliases' => ['flask']],
        ['name' => 'FastAPI', 'category' => 'Backend', 'aliases' => ['fastapi']],
        ['name' => 'Spring Boot', 'category' => 'Backend', 'aliases' => ['spring boot', 'springboot', 'spring framework', 'spring']],
        ['name' => 'Laravel', 'category' => 'Backend', 'aliases' => ['laravel']],
        ['name' => 'NestJS', 'category' => 'Backend', 'aliases' => ['nestjs', 'nest.js']],

        // Databases & Storage
        ['name' => 'PostgreSQL', 'category' => 'Database', 'aliases' => ['postgresql', 'postgres', 'psql']],
        ['name' => 'MySQL', 'category' => 'Database', 'aliases' => ['mysql']],
        ['name' => 'MongoDB', 'category' => 'Database', 'aliases' => ['mongodb', 'mongo', 'mongoose']],
        ['name' => 'Redis', 'category' => 'Database', 'aliases' => ['redis']],
        ['name' => 'SQLite', 'category' => 'Database', 'aliases' => ['sqlite', 'sqlite3']],
        ['name' => 'Firebase', 'category' => 'Cloud', 'aliases' => ['firebase', 'firestore']],
        ['name' => 'Supabase', 'category' => 'Cloud', 'aliases' => ['supabase']],
        ['name' => 'Elasticsearch', 'category' => 'Database', 'aliases' => ['elasticsearch', 'elastic']],

        // Cloud & DevOps
        ['name' => 'AWS', 'category' => 'Cloud', 'aliases' => ['aws', 'amazon web services', 'ec2', 's3', 'lambda']],
        ['name' => 'Google Cloud', 'category' => 'Cloud', 'aliases' => ['gcp', 'google cloud', 'google cloud platform']],
        ['name' => 'Microsoft Azure', 'category' => 'Cloud', 'aliases' => ['azure', 'microsoft azure']],
        ['name' => 'Docker', 'category' => 'DevOps', 'aliases' => ['docker', 'docker compose', 'containerization']],
        ['name' => 'Kubernetes', 'category' => 'DevOps', 'aliases' => ['kubernetes', 'k8s']],
        ['name' => 'Git', 'category' => 'DevOps', 'aliases' => ['git', 'version control']],
        ['name' => 'GitHub', 'category' => 'DevOps', 'aliases' => ['github', 'github actions']],
        ['name' => 'CI/CD', 'category' => 'DevOps', 'aliases' => ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'jenkins']],
        ['name' => 'Linux', 'category' => 'DevOps', 'aliases' => ['linux', 'ubuntu', 'debian', 'centos']],
        ['name' => 'Nginx', 'category' => 'DevOps', 'aliases' => ['nginx']],
        ['name' => 'Vercel', 'category' => 'Cloud', 'aliases' => ['vercel']],

        // AI / ML & Data Science
        ['name' => 'Machine Learning', 'category' => 'AI/ML', 'aliases' => ['machine learning', 'ml', 'deep learning']],
        ['name' => 'Artificial Intelligence', 'category' => 'AI/ML', 'aliases' => ['artificial intelligence', 'ai', 'genai', 'generative ai', 'llm']],
        ['name' => 'TensorFlow', 'category' => 'AI/ML', 'aliases' => ['tensorflow', 'tf']],
        ['name' => 'PyTorch', 'category' => 'AI/ML', 'aliases' => ['pytorch', 'torch']],
        ['name' => 'Pandas', 'category' => 'Data Science', 'aliases' => ['pandas']],
        ['name' => 'NumPy', 'category' => 'Data Science', 'aliases' => ['numpy']],
        ['name' => 'Scikit-Learn', 'category' => 'AI/ML', 'aliases' => ['scikit-learn', 'sklearn']],
        ['name' => 'Computer Vision', 'category' => 'AI/ML', 'aliases' => ['computer vision', 'opencv', 'image processing']],
        ['name' => 'Natural Language Processing', 'category' => 'AI/ML', 'aliases' => ['nlp', 'natural language processing']],

        // Architecture & Core CS
        ['name' => 'REST API', 'category' => 'Core CS', 'aliases' => ['rest api', 'rest apis', 'restful api', 'restful apis', 'rest']],
        ['name' => 'GraphQL', 'category' => 'Core CS', 'aliases' => ['graphql']],
        ['name' => 'Data Structures', 'category' => 'Core CS', 'aliases' => ['data structures', 'dsa']],
        ['name' => 'Algorithms', 'category' => 'Core CS', 'aliases' => ['algorithms', 'problem solving']],
        ['name' => 'Object-Oriented Programming', 'category' => 'Core CS', 'aliases' => ['oop', 'object-oriented programming', 'object oriented']],
        ['name' => 'System Design', 'category' => 'Core CS', 'aliases' => ['system design', 'distributed systems', 'microservices']],
        ['name' => 'Unit Testing', 'category' => 'Testing', 'aliases' => ['unit testing', 'jest', 'phpunit', 'pytest', 'testing']],
        ['name' => 'WebSockets', 'category' => 'Core CS', 'aliases' => ['websockets', 'websocket', 'socket.io']],
        ['name' => 'Figma', 'category' => 'UI/UX', 'aliases' => ['figma', 'ui/ux', 'ui design', 'ux design']],
    ];

    /**
     * Extract plain text from a stored resume file (PDF or DOCX).
     */
    public static function extractTextFromFile(string $storageKey): array {
        $storageRoot = realpath(FileUploadService::getStorageRoot());
        $filePath = $storageRoot === false ? false : realpath($storageRoot . '/' . ltrim($storageKey, '/'));

        if ($storageRoot === false || $filePath === false || !str_starts_with($filePath, $storageRoot . DIRECTORY_SEPARATOR) || !is_file($filePath)) {
            return [
                'success' => false,
                'error' => 'Resume file not found in secure storage.',
                'text' => '',
                'format' => 'unknown'
            ];
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($filePath);

        $text = '';
        $format = 'unknown';

        if ($mime === 'application/pdf' || str_ends_with(strtolower($filePath), '.pdf')) {
            $format = 'pdf';
            $text = self::extractTextFromPdf($filePath);
        } elseif ($mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || str_ends_with(strtolower($filePath), '.docx')) {
            $format = 'docx';
            $text = self::extractTextFromDocx($filePath);
        } else {
            return [
                'success' => false,
                'error' => "Unsupported format for automated text extraction: {$mime}",
                'text' => '',
                'format' => $mime
            ];
        }

        $wordCount = str_word_count($text);
        return [
            'success' => !empty($text),
            'format' => $format,
            'text' => $text,
            'word_count' => $wordCount,
            'is_scanned_image' => empty($text) && $format === 'pdf',
            'error' => empty($text) ? 'No extractable text layer found in document.' : null
        ];
    }

    /**
     * Multi-pass robust pure-PHP PDF text extractor.
     */
    public static function extractTextFromPdf(string $filePath): string {
        if (!file_exists($filePath)) {
            return '';
        }
        $content = file_get_contents($filePath);
        if ($content === false || empty($content)) {
            return '';
        }

        $extractedParts = [];

        // Pass 1: Stream extraction (matches any stream...endstream delimiter style)
        if (preg_match_all('/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/m', $content, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[1] as $streamMatch) {
                $streamData = $streamMatch[0];
                $streamOffset = $streamMatch[1];
                $headerChunk = substr($content, max(0, $streamOffset - 400), 400);

                $decompressed = $streamData;
                if (str_contains($headerChunk, '/FlateDecode') || str_contains($headerChunk, '/Fl')) {
                    $uncompressed = @gzuncompress($streamData);
                    if ($uncompressed === false) {
                        $uncompressed = @gzinflate($streamData);
                    }
                    if ($uncompressed === false && strlen($streamData) > 2) {
                        $uncompressed = @gzinflate(substr($streamData, 2));
                    }
                    if ($uncompressed !== false) {
                        $decompressed = $uncompressed;
                    }
                }

                // 1A. Parenthesized text
                if (preg_match_all('/\((.*?)\)\s*(?:Tj|\'|")/s', $decompressed, $tjMatches)) {
                    foreach ($tjMatches[1] as $tm) {
                        $extractedParts[] = self::cleanPdfString($tm);
                    }
                }

                // 1B. Text arrays
                if (preg_match_all('/\[(.*?)\]\s*TJ/s', $decompressed, $tjArrMatches)) {
                    foreach ($tjArrMatches[1] as $tjArr) {
                        if (preg_match_all('/\((.*?)\)/s', $tjArr, $innerMatches)) {
                            $joined = '';
                            foreach ($innerMatches[1] as $im) {
                                $joined .= self::cleanPdfString($im);
                            }
                            $extractedParts[] = $joined;
                        } elseif (preg_match_all('/<([0-9a-fA-F]+)>/s', $tjArr, $hexInner)) {
                            foreach ($hexInner[1] as $hx) {
                                $extractedParts[] = @hex2bin($hx) ?: '';
                            }
                        }
                    }
                }

                // 1C. Hexadecimal text strings
                if (preg_match_all('/<([0-9a-fA-F]{2,})>\s*Tj/s', $decompressed, $hexMatches)) {
                    foreach ($hexMatches[1] as $hexStr) {
                        $extractedParts[] = @hex2bin($hexStr) ?: '';
                    }
                }
            }
        }

        // Pass 2: Raw BT...ET block extraction if stream was sparse
        $collectedText = trim(implode(' ', $extractedParts));
        if (strlen($collectedText) < 30) {
            if (preg_match_all('/BT[\s\S]*?ET/m', $content, $btMatches)) {
                foreach ($btMatches[0] as $btBlock) {
                    if (preg_match_all('/\((.*?)\)/s', $btBlock, $btText)) {
                        foreach ($btText[1] as $bt) {
                            $extractedParts[] = self::cleanPdfString($bt);
                        }
                    }
                }
            }
        }

        $finalText = trim(implode(' ', $extractedParts));
        $finalText = (string)preg_replace('/[^\x20-\x7E\t\n\r]/', ' ', $finalText);
        $finalText = (string)preg_replace('/\s+/', ' ', $finalText);
        return trim($finalText);
    }

    private static function cleanPdfString(string $raw): string {
        $cleaned = preg_replace_callback('/\\\([0-7]{1,3})/', function($m) {
            return chr((int)octdec($m[1]));
        }, $raw);
        $cleaned = str_replace(
            ['\\(', '\\)', '\\\\', '\\n', '\\r', '\\t'],
            ['(', ')', '\\', "\n", "\r", "\t"],
            $cleaned ?? $raw
        );
        return $cleaned;
    }

    public static function extractTextFromDocx(string $filePath): string {
        if (!file_exists($filePath) || !class_exists('\ZipArchive')) {
            return '';
        }

        $zip = new \ZipArchive();
        if ($zip->open($filePath) !== true) {
            return '';
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if ($xml === false || empty($xml)) {
            return '';
        }

        if (preg_match_all('/<w:t[^>]*>(.*?)<\/w:t>/is', $xml, $matches)) {
            return trim((string)preg_replace('/\s+/', ' ', html_entity_decode(implode(' ', $matches[1]), ENT_QUOTES | ENT_XML1)));
        }

        return trim((string)preg_replace('/\s+/', ' ', strip_tags($xml)));
    }

    /**
     * Normalize a single raw skill name against Master Taxonomy and registered database catalog.
     * Prevents duplicate skills and ensures canonical naming (e.g. "React.js" -> "React", "NodeJS" -> "Node.js").
     */
    public static function normalizeSkill(string $rawSkill): ?array {
        $clean = trim($rawSkill);
        if (strlen($clean) < 2) {
            return null;
        }

        $lower = strtolower($clean);

        // 1. Check taxonomy aliases
        foreach (self::MASTER_TAXONOMY as $tax) {
            $taxNorm = strtolower(trim($tax['name']));
            if ($taxNorm === $lower) {
                return ['name' => $tax['name'], 'normalized_name' => $taxNorm, 'category' => $tax['category']];
            }
            foreach ($tax['aliases'] ?? [] as $alias) {
                if (strtolower(trim($alias)) === $lower) {
                    return ['name' => $tax['name'], 'normalized_name' => $taxNorm, 'category' => $tax['category']];
                }
            }
        }

        // 2. Check Database directly
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id, name, normalized_name, category FROM skills WHERE normalized_name = ? OR LOWER(name) = ? LIMIT 1');
        $stmt->execute([$lower, $lower]);
        $row = $stmt->fetch();
        if ($row) {
            return ['id' => $row['id'], 'name' => $row['name'], 'normalized_name' => $row['normalized_name'], 'category' => $row['category']];
        }

        // 3. Fallback for valid domain terms
        return [
            'name' => ucwords($clean),
            'normalized_name' => $lower,
            'category' => 'Technical'
        ];
    }

    /**
     * Match text against master skills & taxonomy. Auto-registers detected skills.
     */
    public static function matchSkillsInText(string $text): array {
        if (empty($text)) {
            return [];
        }

        $db = Database::getConnection();
        $stmt = $db->query('SELECT id, name, normalized_name, category FROM skills');
        $dbSkills = $stmt->fetchAll();

        $dbSkillMap = [];
        foreach ($dbSkills as $s) {
            $norm = strtolower(trim($s['normalized_name'] ?? $s['name']));
            $dbSkillMap[$norm] = $s;
        }

        $matched = [];
        $matchedKeys = [];
        $lowerText = ' ' . strtolower($text) . ' ';

        // 1. Direct DB lookup against text
        foreach ($dbSkills as $s) {
            $norm = strtolower(trim($s['normalized_name'] ?? $s['name']));
            if (strlen($norm) < 2) continue;

            $pattern = '/\b' . preg_quote($norm, '/') . '\b/i';
            if (preg_match($pattern, $lowerText) && !isset($matchedKeys[$norm])) {
                $matched[] = $s;
                $matchedKeys[$norm] = true;
            }
        }

        // 2. Comprehensive Taxonomy scan & auto-registration
        $insSkillStmt = $db->prepare('
            INSERT INTO skills (id, name, normalized_name, category)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (normalized_name) DO NOTHING
        ');

        foreach (self::MASTER_TAXONOMY as $taxSkill) {
            $taxNorm = strtolower(trim($taxSkill['name']));
            if (isset($matchedKeys[$taxNorm])) {
                continue;
            }

            $isMatch = false;
            $aliases = array_merge([$taxSkill['name']], $taxSkill['aliases'] ?? []);
            foreach ($aliases as $alias) {
                $aliasNorm = strtolower(trim($alias));
                if (strlen($aliasNorm) < 2) continue;
                $pat = '/\b' . preg_quote($aliasNorm, '/') . '\b/i';
                if (preg_match($pat, $lowerText)) {
                    $isMatch = true;
                    break;
                }
            }

            if ($isMatch) {
                if (isset($dbSkillMap[$taxNorm])) {
                    $matched[] = $dbSkillMap[$taxNorm];
                    $matchedKeys[$taxNorm] = true;
                } else {
                    $skillId = 'sk_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $taxSkill['name']));
                    try {
                        $insSkillStmt->execute([
                            $skillId,
                            $taxSkill['name'],
                            $taxNorm,
                            $taxSkill['category'] ?? 'Technical'
                        ]);
                    } catch (\Throwable $e) {
                        // ignore duplicate
                    }

                    $fetchStmt = $db->prepare('SELECT id, name, normalized_name, category FROM skills WHERE normalized_name = ? LIMIT 1');
                    $fetchStmt->execute([$taxNorm]);
                    $newSkill = $fetchStmt->fetch();
                    if ($newSkill) {
                        $matched[] = $newSkill;
                        $matchedKeys[$taxNorm] = true;
                        $dbSkillMap[$taxNorm] = $newSkill;
                    }
                }
            }
        }

        return $matched;
    }

    /**
     * Complete Resume Auto-Sync Engine:
     * Extract, Normalize, Detect Conflicts, Intelligently Merge Profile, Projects,
     * Education, Experience, Certifications, and Evidence without downgrading verified skills.
     */
    public static function processResumeAutoSync(string $studentId, string $storageKey, ?string $resumeId = null): array {
        $db = Database::getConnection();

        // 1. Validate file exists in storage and calculate content hash
        $storageRoot = realpath(FileUploadService::getStorageRoot());
        $filePath = $storageRoot === false ? false : realpath($storageRoot . '/' . ltrim($storageKey, '/'));

        if (!$filePath || !is_file($filePath)) {
            return [
                'success' => false,
                'error' => 'Resume file not found in secure storage.',
                'error_code' => 'INVALID_FILE'
            ];
        }

        $contentHash = hash_file('sha256', $filePath) ?: hash('sha256', $storageKey);

        // 2. Fetch existing student record
        $sStmt = $db->prepare('SELECT * FROM students WHERE id = ? LIMIT 1');
        $sStmt->execute([$studentId]);
        $student = $sStmt->fetch(\PDO::FETCH_ASSOC);

        if (!$student) {
            return [
                'success' => false,
                'error' => 'Student record not found.',
                'error_code' => 'STUDENT_NOT_FOUND'
            ];
        }

        // 3. Extract plain text
        $textResult = self::extractTextFromFile($storageKey);
        if (!$textResult['success'] || empty($textResult['text'])) {
            return [
                'success' => false,
                'error' => $textResult['error'] ?? 'No extractable text layer found in resume.',
                'error_code' => 'EXTRACTION_FAILED'
            ];
        }

        $resumeText = $textResult['text'];

        // 4. Extract Structured Entities (Gemini AI with Candidate Untrusted Input Defense + Fallback)
        $structuredData = GeminiService::extractStructuredResumeData($resumeText, [
            'name'    => $student['name'] ?? '',
            'program' => $student['program'] ?? '',
            'college' => $student['college'] ?? '',
        ]);

        // 5. Match and Normalize Skills
        $matchedTaxonomySkills = self::matchSkillsInText($resumeText);
        $extractedRawSkills = $structuredData['skills'] ?? [];

        $allSkillNames = array_map(fn($s) => $s['name'], $matchedTaxonomySkills);
        foreach ($extractedRawSkills as $rawSkill) {
            $norm = self::normalizeSkill($rawSkill);
            if ($norm && !in_array($norm['name'], $allSkillNames, true)) {
                $allSkillNames[] = $norm['name'];
            }
        }

        // Auto-register any newly discovered skills in DB
        $insSkillStmt = $db->prepare('
            INSERT INTO skills (id, name, normalized_name, category)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (normalized_name) DO NOTHING
        ');

        $finalMatchedSkills = [];
        $finalSkillIds = [];

        foreach ($allSkillNames as $skName) {
            $norm = self::normalizeSkill($skName);
            if (!$norm) continue;

            $normName = $norm['normalized_name'];
            $fetchStmt = $db->prepare('SELECT id, name, normalized_name, category FROM skills WHERE normalized_name = ? LIMIT 1');
            $fetchStmt->execute([$normName]);
            $dbRow = $fetchStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$dbRow) {
                $newId = 'sk_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $norm['name']));
                try {
                    $insSkillStmt->execute([$newId, $norm['name'], $normName, $norm['category'] ?? 'Technical']);
                } catch (\Throwable $e) {
                    // Ignore duplicate
                }
                $fetchStmt->execute([$normName]);
                $dbRow = $fetchStmt->fetch(\PDO::FETCH_ASSOC);
            }

            if ($dbRow && !isset($finalSkillIds[$dbRow['id']])) {
                $finalSkillIds[$dbRow['id']] = true;
                $finalMatchedSkills[] = $dbRow;
            }
        }

        // 6. Begin Atomic Database Transaction for Intelligent Merge
        $db->beginTransaction();

        $summary = [
            'profile_fields_updated' => 0,
            'skills_added'           => 0,
            'skills_updated'         => 0,
            'projects_added'         => 0,
            'projects_updated'       => 0,
            'education_updated'      => 0,
            'experience_added'       => 0,
            'certifications_added'   => 0
        ];

        $conflicts = [];
        $skillsDetected = [];

        try {
            // A. Contact / Identity Conflict Detection (Phone)
            $existingPhone = trim((string)($student['phone'] ?? ''));
            $resumePhone = trim((string)($structuredData['personal']['phone'] ?? ''));

            $cleanExistingPhone = preg_replace('/\D/', '', $existingPhone);
            $cleanResumePhone = preg_replace('/\D/', '', $resumePhone);

            if (!empty($cleanExistingPhone) && !empty($cleanResumePhone) && $cleanExistingPhone !== $cleanResumePhone) {
                $conflictId = 'conf_' . bin2hex(random_bytes(8));
                $conflicts[] = [
                    'id'             => $conflictId,
                    'field'          => 'phone',
                    'existing_value' => $existingPhone,
                    'resume_value'   => $resumePhone,
                    'status'         => 'requires_review'
                ];

                $insConf = $db->prepare('
                    INSERT INTO resume_conflicts (id, student_id, resume_id, field, existing_value, resume_value, status)
                    VALUES (?, ?, ?, ?, ?, ?, \'requires_review\')
                ');
                $insConf->execute([$conflictId, $studentId, $resumeId, 'phone', $existingPhone, $resumePhone]);
            }

            // B. Profile Fields Intelligent Merge (Fill missing, never destroy existing manually entered data)
            $profileUpdates = [];
            $updateParams = [];

            // Location
            if (empty($student['location']) && !empty($structuredData['personal']['location'])) {
                $profileUpdates[] = 'location = ?';
                $updateParams[] = $structuredData['personal']['location'];
                $summary['profile_fields_updated']++;
            }

            // Phone (only set if student currently has NO phone registered)
            if (empty($existingPhone) && !empty($resumePhone)) {
                $profileUpdates[] = 'phone = ?';
                $updateParams[] = $resumePhone;
                $summary['profile_fields_updated']++;
            }

            // Bio / Summary
            if (empty($student['bio']) && !empty($structuredData['personal']['summary'])) {
                $profileUpdates[] = 'bio = ?';
                $updateParams[] = $structuredData['personal']['summary'];
                $summary['profile_fields_updated']++;
            }

            // Links: GitHub
            if (empty($student['github_url']) && !empty($structuredData['links']['github'])) {
                $profileUpdates[] = 'github_url = ?';
                $updateParams[] = $structuredData['links']['github'];
                $summary['profile_fields_updated']++;
            }

            // Links: LinkedIn
            if (empty($student['linkedin_url']) && !empty($structuredData['links']['linkedin'])) {
                $profileUpdates[] = 'linkedin_url = ?';
                $updateParams[] = $structuredData['links']['linkedin'];
                $summary['profile_fields_updated']++;
            }

            // Links: Portfolio
            if (empty($student['portfolio_url']) && !empty($structuredData['links']['portfolio'])) {
                $profileUpdates[] = 'portfolio_url = ?';
                $updateParams[] = $structuredData['links']['portfolio'];
                $summary['profile_fields_updated']++;
            }

            if (!empty($profileUpdates)) {
                $profileUpdates[] = 'updated_at = CURRENT_TIMESTAMP';
                $updateParams[] = $studentId;
                $sql = 'UPDATE students SET ' . implode(', ', $profileUpdates) . ' WHERE id = ?';
                $upStmt = $db->prepare($sql);
                $upStmt->execute($updateParams);
            }

            // C. Skill Synchronization & Evidence
            // Fetch existing student skills to determine new vs existing and protect verification
            $ssStmt = $db->prepare('SELECT skill_id, proficiency FROM student_skills WHERE student_id = ?');
            $ssStmt->execute([$studentId]);
            $existingStudentSkills = [];
            foreach ($ssStmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                $existingStudentSkills[$row['skill_id']] = $row['proficiency'];
            }

            $insStudentSkill = $db->prepare('
                INSERT INTO student_skills (student_id, skill_id, proficiency)
                VALUES (?, ?, \'intermediate\')
                ON CONFLICT (student_id, skill_id) DO NOTHING
            ');

            $insEvidence = $db->prepare('
                INSERT INTO skill_evidence (
                    id, student_id, skill_id, source, confidence, metadata, verified_at
                ) VALUES (?, ?, ?, \'resume_evidence\', ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (student_id, skill_id, source)
                DO UPDATE SET confidence = EXCLUDED.confidence,
                              metadata = EXCLUDED.metadata,
                              verified_at = CURRENT_TIMESTAMP
            ');

            foreach ($finalMatchedSkills as $sk) {
                $sId = $sk['id'];
                $isExisting = isset($existingStudentSkills[$sId]);

                if ($isExisting) {
                    $summary['skills_updated']++;
                } else {
                    $insStudentSkill->execute([$studentId, $sId]);
                    $summary['skills_added']++;
                }

                // Create / update skill evidence (20% proof factor, does NOT automatically mark verified)
                $evId = 'ev_res_' . bin2hex(random_bytes(6));
                $meta = json_encode([
                    'storage_key'  => $storageKey,
                    'format'       => $textResult['format'],
                    'detected_at'  => date('c'),
                    'source_label' => 'Extracted from uploaded resume'
                ]);
                $insEvidence->execute([$evId, $studentId, $sId, 75.0, $meta]);

                $skillsDetected[] = [
                    'id'       => $sId,
                    'name'     => $sk['name'],
                    'category' => $sk['category'],
                    'status'   => 'evidence_available'
                ];
            }

            // D. Projects Auto-Sync
            $pStmt = $db->prepare('SELECT id, title, project_url, github_url, description, tech_stack FROM student_projects WHERE student_id = ?');
            $pStmt->execute([$studentId]);
            $existingProjects = $pStmt->fetchAll(\PDO::FETCH_ASSOC);

            $insProject = $db->prepare('
                INSERT INTO student_projects (id, student_id, title, description, tech_stack, project_url, github_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ');

            $upProject = $db->prepare('
                UPDATE student_projects SET
                    description = COALESCE(NULLIF(description, \'\'), ?),
                    tech_stack = COALESCE(NULLIF(tech_stack, \'\'), ?),
                    github_url = COALESCE(NULLIF(github_url, \'\'), ?),
                    project_url = COALESCE(NULLIF(project_url, \'\'), ?)
                WHERE id = ?
            ');

            foreach ($structuredData['projects'] as $proj) {
                $pName = trim($proj['name']);
                if (empty($pName)) continue;

                $matchedProjId = null;
                $normPName = strtolower($pName);

                foreach ($existingProjects as $ep) {
                    $normEp = strtolower(trim($ep['title']));
                    if ($normEp === $normPName || str_contains($normEp, $normPName) || str_contains($normPName, $normEp)) {
                        $matchedProjId = $ep['id'];
                        break;
                    }
                    if (!empty($proj['github_url']) && !empty($ep['github_url']) && strtolower(trim($ep['github_url'])) === strtolower(trim($proj['github_url']))) {
                        $matchedProjId = $ep['id'];
                        break;
                    }
                }

                if ($matchedProjId) {
                    $upProject->execute([
                        $proj['description'],
                        $proj['technologies'],
                        $proj['github_url'],
                        $proj['live_url'],
                        $matchedProjId
                    ]);
                    $summary['projects_updated']++;
                } else {
                    $newPId = 'proj_' . bin2hex(random_bytes(8));
                    $insProject->execute([
                        $newPId,
                        $studentId,
                        $pName,
                        $proj['description'],
                        $proj['technologies'],
                        $proj['live_url'],
                        $proj['github_url']
                    ]);
                    $summary['projects_added']++;
                }
            }

            // E. Education Auto-Sync
            $eduStmt = $db->prepare('SELECT id, institution, degree, field FROM student_education WHERE student_id = ?');
            $eduStmt->execute([$studentId]);
            $existingEducation = $eduStmt->fetchAll(\PDO::FETCH_ASSOC);

            $insEdu = $db->prepare('
                INSERT INTO student_education (id, student_id, institution, degree, field, start_year, graduation_year, grade)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');

            foreach ($structuredData['education'] as $edu) {
                $inst = trim($edu['institution']);
                if (empty($inst)) continue;

                $isEduMatch = false;
                $normInst = strtolower($inst);
                foreach ($existingEducation as $ee) {
                    if (str_contains(strtolower($ee['institution']), $normInst) || str_contains($normInst, strtolower($ee['institution']))) {
                        $isEduMatch = true;
                        break;
                    }
                }

                if (!$isEduMatch) {
                    $eduId = 'edu_' . bin2hex(random_bytes(8));
                    $insEdu->execute([
                        $eduId,
                        $studentId,
                        $inst,
                        $edu['degree'] ?: ($student['program'] ?? ''),
                        $edu['field'] ?: 'Computer Science',
                        $edu['start_year'] ?? '',
                        $edu['graduation_year'] ?? '',
                        $edu['grade'] ?? ''
                    ]);
                    $summary['education_updated']++;
                }

                // Update students table college/program if empty
                if (empty($student['college']) && !empty($inst)) {
                    $db->prepare('UPDATE students SET college = ? WHERE id = ?')->execute([$inst, $studentId]);
                }
                if (empty($student['program']) && !empty($edu['degree'])) {
                    $db->prepare('UPDATE students SET program = ? WHERE id = ?')->execute([$edu['degree'], $studentId]);
                }
                if (empty($student['graduation_year']) && !empty($edu['graduation_year'])) {
                    $db->prepare('UPDATE students SET graduation_year = ? WHERE id = ?')->execute([$edu['graduation_year'], $studentId]);
                }
            }

            // F. Experience Auto-Sync
            $expStmt = $db->prepare('SELECT id, company, job_title FROM student_experience WHERE student_id = ?');
            $expStmt->execute([$studentId]);
            $existingExperience = $expStmt->fetchAll(\PDO::FETCH_ASSOC);

            $insExp = $db->prepare('
                INSERT INTO student_experience (id, student_id, company, job_title, employment_type, start_date, end_date, description, technologies)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');

            foreach ($structuredData['experience'] as $exp) {
                $comp = trim($exp['company']);
                if (empty($comp)) continue;

                $isExpMatch = false;
                $normComp = strtolower($comp);
                foreach ($existingExperience as $ee) {
                    if (strtolower($ee['company']) === $normComp) {
                        $isExpMatch = true;
                        break;
                    }
                }

                if (!$isExpMatch) {
                    $expId = 'exp_' . bin2hex(random_bytes(8));
                    $insExp->execute([
                        $expId,
                        $studentId,
                        $comp,
                        $exp['job_title'] ?: 'Software Engineer',
                        $exp['employment_type'] ?: 'Full-time',
                        $exp['start_date'] ?? '',
                        $exp['end_date'] ?? 'Present',
                        $exp['description'] ?? '',
                        $exp['technologies'] ?? ''
                    ]);
                    $summary['experience_added']++;
                }

                // Update student experience field if currently 'Fresher'
                if (($student['experience'] === 'Fresher' || empty($student['experience'])) && !empty($exp['job_title'])) {
                    $db->prepare('UPDATE students SET experience = ? WHERE id = ?')->execute([$exp['job_title'] . ' at ' . $comp, $studentId]);
                }
            }

            // G. Certifications Auto-Sync
            $certStmt = $db->prepare('SELECT id, title, issuer FROM student_certificates WHERE student_id = ?');
            $certStmt->execute([$studentId]);
            $existingCertificates = $certStmt->fetchAll(\PDO::FETCH_ASSOC);

            $insCert = $db->prepare('
                INSERT INTO student_certificates (id, student_id, title, issuer, issue_date, credential_url)
                VALUES (?, ?, ?, ?, ?, ?)
            ');

            foreach ($structuredData['certifications'] as $cert) {
                $cTitle = trim($cert['name']);
                if (empty($cTitle)) continue;

                $isCertMatch = false;
                $normTitle = strtolower($cTitle);
                foreach ($existingCertificates as $ec) {
                    if (strtolower($ec['title']) === $normTitle) {
                        $isCertMatch = true;
                        break;
                    }
                }

                if (!$isCertMatch) {
                    $certId = 'cert_' . bin2hex(random_bytes(8));
                    $insCert->execute([
                        $certId,
                        $studentId,
                        $cTitle,
                        $cert['issuer'] ?: 'Verified Issuer',
                        $cert['issue_date'] ?? '',
                        $cert['credential_url'] ?? ''
                    ]);
                    $summary['certifications_added']++;
                }
            }

            // H. Record in Resume Processing History
            $historyId = 'rph_' . bin2hex(random_bytes(8));
            $insHist = $db->prepare('
                INSERT INTO resume_processing_history (
                    id, resume_id, student_id, storage_key, content_hash,
                    processing_status, extraction_status, sync_status,
                    summary, conflicts, parser_version
                ) VALUES (?, ?, ?, ?, ?, \'synced\', \'extracted\', \'completed\', ?, ?, \'3.0\')
            ');
            $insHist->execute([
                $historyId,
                $resumeId,
                $studentId,
                $storageKey,
                $contentHash,
                json_encode($summary),
                json_encode($conflicts)
            ]);

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            error_log('Resume Auto-Sync transaction failed: ' . $e->getMessage());
            return [
                'success'    => false,
                'error'      => 'Database error during resume auto-sync: ' . $e->getMessage(),
                'error_code' => 'DATABASE_ERROR'
            ];
        }

        // 7. Post-Transaction Signal Triggers:
        // A. Run Non-punitive Skill Integrity Audits
        foreach ($finalMatchedSkills as $sk) {
            try {
                SkillIntegrityService::auditStudentSkill($studentId, $sk['id']);
            } catch (\Throwable $e) {
                error_log("Non-blocking audit failed for skill {$sk['id']}: " . $e->getMessage());
            }
        }

        // B. Trigger Career Evolution / Readiness Recalculation
        $careerGoal = null;
        try {
            $careerGoal = CareerEvolutionService::getCareerGoal($studentId);
            if ($careerGoal && !empty($careerGoal['target_role'])) {
                $readiness = CareerEvolutionService::calculateReadiness($studentId, $careerGoal['target_role']);
                CareerEvolutionService::recordReadinessSnapshot(
                    $studentId,
                    $careerGoal['target_role'],
                    (int)($readiness['readiness_score'] ?? 0),
                    $readiness['readiness_tier'] ?? 'Developing',
                    $readiness
                );
            }
        } catch (\Throwable $e) {
            error_log('Career intelligence recalculation error: ' . $e->getMessage());
        }

        return [
            'success'              => true,
            'resume_id'            => $resumeId,
            'content_hash'         => $contentHash,
            'summary'              => $summary,
            'conflicts'            => $conflicts,
            'skills_detected'      => $skillsDetected,
            'structured_data'      => $structuredData,
            'format'               => $textResult['format'],
            'word_count'           => $textResult['word_count'],
            'matched_skills_count' => count($skillsDetected),
            'matched_skills'       => array_column($skillsDetected, 'name')
        ];
    }

    /**
     * Legacy adapter for processResumeEvidence
     */
    public static function processResumeEvidence(string $studentId, string $storageKey): array {
        return self::processResumeAutoSync($studentId, $storageKey);
    }
}
