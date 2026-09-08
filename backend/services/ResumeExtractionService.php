<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/FileUploadService.php';
require_once __DIR__ . '/SkillIntegrityService.php';

/**
 * ResumeExtractionService
 * SkillBridge 3.0 Native Resume Text & Skill Evidence Extraction Pipeline.
 * 
 * Pipeline:
 * Upload -> MIME & Magic Bytes Validation -> Private Storage -> Deep Text Extraction ->
 * Taxonomy Matching & Auto-Registration -> Student Skills Sync -> Evidence Persistence -> Integrity Audit
 */
class ResumeExtractionService {

    /**
     * Pre-defined Master Engineering & Tech Skills Taxonomy with common aliases
     */
    private const MASTER_TAXONOMY = [
        // Programming Languages
        ['name' => 'Python', 'category' => 'Language', 'aliases' => ['python', 'python3', 'py']],
        ['name' => 'Java', 'category' => 'Language', 'aliases' => ['java', 'core java', 'j2ee']],
        ['name' => 'JavaScript', 'category' => 'Language', 'aliases' => ['javascript', 'js', 'ecmascript']],
        ['name' => 'TypeScript', 'category' => 'Language', 'aliases' => ['typescript', 'ts']],
        ['name' => 'PHP', 'category' => 'Language', 'aliases' => ['php', 'php8', 'php7']],
        ['name' => 'C++', 'category' => 'Language', 'aliases' => ['c++', 'cpp']],
        ['name' => 'C', 'category' => 'Language', 'aliases' => ['c language', 'c programming']],
        ['name' => 'C#', 'category' => 'Language', 'aliases' => ['c#', 'csharp', '.net']],
        ['name' => 'Go', 'category' => 'Language', 'aliases' => ['golang', 'go language']],
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
     * Decodes Flate/LZW compressed streams, standard text operators (Tj, TJ, ', "),
     * hex strings (<...>), octal escapes, and ASCII string blocks.
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
                        // Strip potential 2-byte zlib header and try raw inflate
                        $uncompressed = @gzinflate(substr($streamData, 2));
                    }
                    if ($uncompressed !== false) {
                        $decompressed = $uncompressed;
                    }
                }

                // 1A. Match parenthesized text: (Hello) Tj, (Hello) ', (Hello) "
                if (preg_match_all('/\((.*?)\)\s*(?:Tj|\'|")/s', $decompressed, $tjMatches)) {
                    foreach ($tjMatches[1] as $tm) {
                        $extractedParts[] = self::cleanPdfString($tm);
                    }
                }

                // 1B. Match text arrays: [(H) 10 (ello)] TJ
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

                // 1C. Match hexadecimal text strings: <48656c6c6f> Tj
                if (preg_match_all('/<([0-9a-fA-F]{2,})>\s*Tj/s', $decompressed, $hexMatches)) {
                    foreach ($hexMatches[1] as $hexStr) {
                        $extractedParts[] = @hex2bin($hexStr) ?: '';
                    }
                }
            }
        }

        // Pass 2: If stream parsing yielded very little text (< 20 chars), extract raw text blocks
        $collectedText = trim(implode(' ', $extractedParts));
        if (strlen($collectedText) < 30) {
            // Extract printable strings between BT (Begin Text) and ET (End Text)
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
        // Normalize whitespace and remove unprintable control characters
        $finalText = (string)preg_replace('/[^\x20-\x7E\t\n\r]/', ' ', $finalText);
        $finalText = (string)preg_replace('/\s+/', ' ', $finalText);
        return trim($finalText);
    }

    /**
     * Clean escape sequences from PDF string literals
     */
    private static function cleanPdfString(string $raw): string {
        // Octal escape sequences (\101 -> A)
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

    /**
     * Native ZipArchive extractor for Word DOCX files.
     */
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
     * Match extracted plain text against registered master skills & comprehensive taxonomy.
     * Auto-registers any detected taxonomy skill into the database if not already present.
     */
    public static function matchSkillsInText(string $text): array {
        if (empty($text)) {
            return [];
        }

        $db = Database::getConnection();

        // 1. Fetch all existing skills from database
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

        // 2. Check existing database skills against resume text
        foreach ($dbSkills as $s) {
            $norm = strtolower(trim($s['normalized_name'] ?? $s['name']));
            if (strlen($norm) < 2) continue;

            $pattern = '/\b' . preg_quote($norm, '/') . '\b/i';
            if (preg_match($pattern, $lowerText) && !isset($matchedKeys[$norm])) {
                $matched[] = $s;
                $matchedKeys[$norm] = true;
            }
        }

        // 3. Check comprehensive taxonomy and auto-register new skills
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

            // Check if name or any alias is in the resume text
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
                // Check if already in DB
                if (isset($dbSkillMap[$taxNorm])) {
                    $matched[] = $dbSkillMap[$taxNorm];
                    $matchedKeys[$taxNorm] = true;
                } else {
                    // Auto-register into database skills table
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

                    // Retrieve registered record
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
     * Full Pipeline: Process resume, auto-sync all skills into student_skills, persist evidence & audit.
     */
    public static function processResumeEvidence(string $studentId, string $storageKey): array {
        $extracted = self::extractTextFromFile($storageKey);
        if (!$extracted['success']) {
            return [
                'success' => false,
                'error' => $extracted['error'] ?? 'Text extraction failed.',
                'format' => $extracted['format'] ?? 'unknown',
                'matched_skills' => []
            ];
        }

        $matchedSkills = self::matchSkillsInText($extracted['text']);
        $db = Database::getConnection();

        $savedSkills = [];
        $db->beginTransaction();
        try {
            $insSkill = $db->prepare('
                INSERT INTO student_skills (student_id, skill_id, proficiency)
                VALUES (?, ?, 75)
                ON CONFLICT (student_id, skill_id)
                DO UPDATE SET proficiency = GREATEST(student_skills.proficiency, 75)
            ');

            $insEv = $db->prepare('
                INSERT INTO skill_evidence (
                    id, student_id, skill_id, source, confidence, metadata, verified_at
                ) VALUES (?, ?, ?, \'resume_evidence\', ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (student_id, skill_id, source)
                DO UPDATE SET confidence = EXCLUDED.confidence,
                              metadata = EXCLUDED.metadata,
                              verified_at = CURRENT_TIMESTAMP
            ');

            foreach ($matchedSkills as $sk) {
                $insSkill->execute([$studentId, $sk['id']]);

                $evId = 'ev_res_' . bin2hex(random_bytes(6));
                $meta = json_encode([
                    'storage_key' => $storageKey,
                    'format' => $extracted['format'],
                    'detected_at' => date('c'),
                    'source_label' => 'Extracted from uploaded resume'
                ]);

                // High confidence for direct resume-backed skills
                $confidence = 75.0;
                $insEv->execute([$evId, $studentId, $sk['id'], $confidence, $meta]);
                $savedSkills[] = $sk['name'];
            }

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }

        // Run integrity audits for detected skills
        foreach ($matchedSkills as $sk) {
            try {
                SkillIntegrityService::auditStudentSkill($studentId, $sk['id']);
            } catch (\Throwable $e) {
                // Non-blocking audit log
                error_log("Resume audit trigger failed for skill {$sk['id']}: " . $e->getMessage());
            }
        }

        return [
            'success' => true,
            'format' => $extracted['format'],
            'text' => $extracted['text'],
            'word_count' => $extracted['word_count'],
            'matched_skills_count' => count($savedSkills),
            'matched_skills' => $savedSkills
        ];
    }
}
