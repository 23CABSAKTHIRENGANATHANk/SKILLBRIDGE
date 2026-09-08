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
        // 1. Programming Languages
        ['name' => 'Python', 'category' => 'Languages', 'aliases' => ['python', 'python3', 'py']],
        ['name' => 'Java', 'category' => 'Languages', 'aliases' => ['java', 'core java', 'j2ee']],
        ['name' => 'JavaScript', 'category' => 'Languages', 'aliases' => ['javascript', 'js', 'ecmascript', 'es6', 'vanilla js']],
        ['name' => 'TypeScript', 'category' => 'Languages', 'aliases' => ['typescript', 'ts']],
        ['name' => 'SQL', 'category' => 'Languages', 'aliases' => ['sql', 'structured query language']],
        ['name' => 'HTML', 'category' => 'Languages', 'aliases' => ['html', 'html5', 'html 5']],
        ['name' => 'CSS', 'category' => 'Languages', 'aliases' => ['css', 'css3', 'css 3']],
        ['name' => 'PHP', 'category' => 'Languages', 'aliases' => ['php', 'php8', 'php7', 'modern php']],
        ['name' => 'C++', 'category' => 'Languages', 'aliases' => ['c++', 'cpp']],
        ['name' => 'C', 'category' => 'Languages', 'aliases' => ['c language', 'c programming']],
        ['name' => 'C#', 'category' => 'Languages', 'aliases' => ['c#', 'csharp', '.net', 'dotnet']],
        ['name' => 'Go', 'category' => 'Languages', 'aliases' => ['golang', 'go language', 'go']],
        ['name' => 'Rust', 'category' => 'Languages', 'aliases' => ['rust', 'rustlang']],
        ['name' => 'Ruby', 'category' => 'Languages', 'aliases' => ['ruby', 'ruby on rails', 'rails']],
        ['name' => 'Kotlin', 'category' => 'Languages', 'aliases' => ['kotlin']],
        ['name' => 'Swift', 'category' => 'Languages', 'aliases' => ['swift', 'swiftui']],
        ['name' => 'Dart', 'category' => 'Languages', 'aliases' => ['dart', 'flutter']],
        ['name' => 'Scala', 'category' => 'Languages', 'aliases' => ['scala']],
        ['name' => 'R', 'category' => 'Languages', 'aliases' => ['r programming', 'r language']],
        ['name' => 'Bash', 'category' => 'Languages', 'aliases' => ['bash', 'shell script', 'shell scripting', 'powershell']],

        // 2. Frontend Frameworks & Libraries
        ['name' => 'React', 'category' => 'Frontend', 'aliases' => ['react', 'react.js', 'reactjs']],
        ['name' => 'Vite', 'category' => 'Frontend', 'aliases' => ['vite', 'vite.js', 'vitejs']],
        ['name' => 'Tailwind CSS', 'category' => 'Frontend', 'aliases' => ['tailwind', 'tailwind css', 'tailwindcss']],
        ['name' => 'Three.js', 'category' => 'Frontend', 'aliases' => ['three.js', 'threejs', 'three js', '3d web']],
        ['name' => 'React Three Fiber', 'category' => 'Frontend', 'aliases' => ['react three fiber', 'r3f', 'react-three-fiber', '@react-three/fiber']],
        ['name' => 'GSAP', 'category' => 'Frontend', 'aliases' => ['gsap', 'greensock', 'gsap animation', 'greensock animation']],
        ['name' => 'Framer Motion', 'category' => 'Frontend', 'aliases' => ['framer motion', 'framer-motion', 'framer']],
        ['name' => 'Next.js', 'category' => 'Frontend', 'aliases' => ['next.js', 'nextjs', 'next']],
        ['name' => 'Vue.js', 'category' => 'Frontend', 'aliases' => ['vue', 'vue.js', 'vuejs']],
        ['name' => 'Angular', 'category' => 'Frontend', 'aliases' => ['angular', 'angularjs', 'angular.js']],
        ['name' => 'Bootstrap', 'category' => 'Frontend', 'aliases' => ['bootstrap', 'bootstrap5']],
        ['name' => 'Redux', 'category' => 'Frontend', 'aliases' => ['redux', 'redux toolkit', 'rtk']],
        ['name' => 'Sass', 'category' => 'Frontend', 'aliases' => ['sass', 'scss']],

        // 3. Backend Frameworks & Runtimes
        ['name' => 'Django', 'category' => 'Backend', 'aliases' => ['django', 'django framework']],
        ['name' => 'Django REST Framework', 'category' => 'Backend', 'aliases' => ['django rest framework', 'drf', 'djangorestframework']],
        ['name' => 'FastAPI', 'category' => 'Backend', 'aliases' => ['fastapi', 'fast api']],
        ['name' => 'Node.js', 'category' => 'Backend', 'aliases' => ['node.js', 'nodejs', 'node']],
        ['name' => 'Express.js', 'category' => 'Backend', 'aliases' => ['express', 'express.js', 'expressjs']],
        ['name' => 'Spring Boot', 'category' => 'Backend', 'aliases' => ['spring boot', 'springboot', 'spring framework', 'spring']],
        ['name' => 'Flask', 'category' => 'Backend', 'aliases' => ['flask']],
        ['name' => 'Laravel', 'category' => 'Backend', 'aliases' => ['laravel']],
        ['name' => 'NestJS', 'category' => 'Backend', 'aliases' => ['nestjs', 'nest.js']],

        // 4. Databases & Storage
        ['name' => 'PostgreSQL', 'category' => 'Databases', 'aliases' => ['postgresql', 'postgres', 'psql']],
        ['name' => 'SQLite', 'category' => 'Databases', 'aliases' => ['sqlite', 'sqlite3']],
        ['name' => 'Supabase', 'category' => 'Databases', 'aliases' => ['supabase']],
        ['name' => 'MySQL', 'category' => 'Databases', 'aliases' => ['mysql']],
        ['name' => 'MongoDB', 'category' => 'Databases', 'aliases' => ['mongodb', 'mongo', 'mongoose']],
        ['name' => 'Elasticsearch', 'category' => 'Databases', 'aliases' => ['elasticsearch', 'elastic']],

        // 5. AI & Computer Vision
        ['name' => 'Machine Learning', 'category' => 'AI & Computer Vision', 'aliases' => ['machine learning', 'ml', 'deep learning']],
        ['name' => 'Computer Vision', 'category' => 'AI & Computer Vision', 'aliases' => ['computer vision', 'cv', 'image processing', 'object detection']],
        ['name' => 'MediaPipe', 'category' => 'AI & Computer Vision', 'aliases' => ['mediapipe', 'google mediapipe']],
        ['name' => 'OpenCV', 'category' => 'AI & Computer Vision', 'aliases' => ['opencv', 'cv2', 'open cv']],
        ['name' => 'Artificial Intelligence', 'category' => 'AI & Computer Vision', 'aliases' => ['artificial intelligence', 'ai', 'genai', 'generative ai']],
        ['name' => 'TensorFlow', 'category' => 'AI & Computer Vision', 'aliases' => ['tensorflow', 'tf']],
        ['name' => 'PyTorch', 'category' => 'AI & Computer Vision', 'aliases' => ['pytorch', 'torch']],
        ['name' => 'Pandas', 'category' => 'AI & Computer Vision', 'aliases' => ['pandas']],
        ['name' => 'NumPy', 'category' => 'AI & Computer Vision', 'aliases' => ['numpy']],
        ['name' => 'Scikit-Learn', 'category' => 'AI & Computer Vision', 'aliases' => ['scikit-learn', 'sklearn']],
        ['name' => 'Natural Language Processing', 'category' => 'AI & Computer Vision', 'aliases' => ['nlp', 'natural language processing']],

        // 6. Cloud & Tools
        ['name' => 'Vercel', 'category' => 'Cloud & Tools', 'aliases' => ['vercel']],
        ['name' => 'Render', 'category' => 'Cloud & Tools', 'aliases' => ['render', 'render.com']],
        ['name' => 'Cloudinary', 'category' => 'Cloud & Tools', 'aliases' => ['cloudinary']],
        ['name' => 'Firebase', 'category' => 'Cloud & Tools', 'aliases' => ['firebase', 'firestore']],
        ['name' => 'Git', 'category' => 'Cloud & Tools', 'aliases' => ['git', 'version control']],
        ['name' => 'GitHub', 'category' => 'Cloud & Tools', 'aliases' => ['github', 'github actions']],
        ['name' => 'VS Code', 'category' => 'Cloud & Tools', 'aliases' => ['vs code', 'vscode', 'visual studio code']],
        ['name' => 'Android Studio', 'category' => 'Cloud & Tools', 'aliases' => ['android studio']],
        ['name' => 'AWS', 'category' => 'Cloud & Tools', 'aliases' => ['aws', 'amazon web services', 'ec2', 's3', 'lambda']],
        ['name' => 'Google Cloud', 'category' => 'Cloud & Tools', 'aliases' => ['gcp', 'google cloud', 'google cloud platform']],
        ['name' => 'Microsoft Azure', 'category' => 'Cloud & Tools', 'aliases' => ['azure', 'microsoft azure']],
        ['name' => 'Docker', 'category' => 'Cloud & Tools', 'aliases' => ['docker', 'docker compose', 'containerization']],
        ['name' => 'Kubernetes', 'category' => 'Cloud & Tools', 'aliases' => ['kubernetes', 'k8s']],
        ['name' => 'CI/CD', 'category' => 'Cloud & Tools', 'aliases' => ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'jenkins']],
        ['name' => 'Linux', 'category' => 'Cloud & Tools', 'aliases' => ['linux', 'ubuntu', 'debian', 'centos']],
        ['name' => 'Nginx', 'category' => 'Cloud & Tools', 'aliases' => ['nginx']],

        // 7. AI Development Tools
        ['name' => 'Google Gemini', 'category' => 'AI Development Tools', 'aliases' => ['google gemini', 'gemini', 'gemini api', 'gemini 3.7', 'gemini flash']],
        ['name' => 'Antigravity', 'category' => 'AI Development Tools', 'aliases' => ['antigravity', 'google antigravity', 'agy', 'antigravity ide']],
        ['name' => 'Lovable AI', 'category' => 'AI Development Tools', 'aliases' => ['lovable ai', 'lovable', 'lovable.dev']],
        ['name' => 'Ollama', 'category' => 'AI Development Tools', 'aliases' => ['ollama', 'local llm']],
        ['name' => 'LangChain', 'category' => 'AI Development Tools', 'aliases' => ['langchain', 'lang chain']],

        // 8. Other / Architecture & Protocols
        ['name' => 'REST APIs', 'category' => 'Other', 'aliases' => ['rest apis', 'rest api', 'restful api', 'restful apis', 'rest']],
        ['name' => 'WebSockets', 'category' => 'Other', 'aliases' => ['websockets', 'websocket', 'socket.io']],
        ['name' => 'Django Channels', 'category' => 'Other', 'aliases' => ['django channels', 'channels']],
        ['name' => 'Redis', 'category' => 'Other', 'aliases' => ['redis', 'redis cache', 'in-memory cache']],
        ['name' => 'Authentication', 'category' => 'Other', 'aliases' => ['authentication', 'auth', 'jwt', 'oauth', 'oauth2', 'rbac']],
        ['name' => 'GraphQL', 'category' => 'Other', 'aliases' => ['graphql']],
        ['name' => 'Data Structures', 'category' => 'Other', 'aliases' => ['data structures', 'dsa']],
        ['name' => 'Algorithms', 'category' => 'Other', 'aliases' => ['algorithms', 'problem solving']],
        ['name' => 'Object-Oriented Programming', 'category' => 'Other', 'aliases' => ['oop', 'object-oriented programming', 'object oriented']],
        ['name' => 'System Design', 'category' => 'Other', 'aliases' => ['system design', 'distributed systems', 'microservices']],
        ['name' => 'Unit Testing', 'category' => 'Other', 'aliases' => ['unit testing', 'jest', 'phpunit', 'pytest', 'testing']],
        ['name' => 'Figma', 'category' => 'Other', 'aliases' => ['figma', 'ui/ux', 'ui design', 'ux design']],
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
    /**
     * Spoken Natural Languages blacklist - must never be treated as technical skills
     */
    public const NATURAL_LANGUAGES = [
        'english', 'tamil', 'hindi', 'spanish', 'french', 'german',
        'telugu', 'kannada', 'malayalam', 'bengali', 'marathi', 'punjabi',
        'gujarati', 'urdu', 'italian', 'russian', 'chinese', 'mandarin',
        'cantonese', 'japanese', 'korean', 'arabic', 'portuguese', 'dutch',
        'swedish', 'turkish', 'vietnamese', 'polish', 'latin', 'sanskrit'
    ];

    /**
     * Normalize a single raw skill name against Master Taxonomy and registered database catalog.
     * Prevents duplicate skills and ensures canonical naming (e.g. "React.js" -> "React", "NodeJS" -> "Node.js").
     * Separates matched canonical skills from unmatched/unknown skills without polluting the master dictionary.
     */
    public static function normalizeSkill(string $rawSkill): ?array {
        $clean = trim($rawSkill);
        if (strlen($clean) < 2) {
            return null;
        }

        $lower = strtolower($clean);

        // 1. Natural Language Filter (English, Tamil, Hindi, etc. must never be technical skills)
        if (in_array($lower, self::NATURAL_LANGUAGES, true)) {
            return null;
        }

        // 2. Check taxonomy aliases
        foreach (self::MASTER_TAXONOMY as $tax) {
            $taxNorm = strtolower(trim($tax['name']));
            if ($taxNorm === $lower) {
                return [
                    'name'            => $tax['name'],
                    'normalized_name' => $taxNorm,
                    'category'        => $tax['category'],
                    'match_status'    => 'matched',
                    'confidence'      => 0.98
                ];
            }
            foreach ($tax['aliases'] ?? [] as $alias) {
                if (strtolower(trim($alias)) === $lower) {
                    return [
                        'name'            => $tax['name'],
                        'normalized_name' => $taxNorm,
                        'category'        => $tax['category'],
                        'match_status'    => 'matched',
                        'confidence'      => 0.95
                    ];
                }
            }
        }

        // 3. Check Database directly
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare('SELECT id, name, normalized_name, category FROM skills WHERE normalized_name = ? OR LOWER(name) = ? LIMIT 1');
            $stmt->execute([$lower, $lower]);
            $row = $stmt->fetch();
            if ($row) {
                return [
                    'id'              => $row['id'],
                    'name'            => $row['name'],
                    'normalized_name' => $row['normalized_name'],
                    'category'        => $row['category'],
                    'match_status'    => 'matched',
                    'confidence'      => 0.92
                ];
            }
        } catch (\Throwable $e) {
            // DB fallback
        }

        // 4. Unknown skill: do NOT auto-create master skill to prevent pollution.
        // Return as unmatched for taxonomy review.
        return [
            'name'            => ucwords($clean),
            'normalized_name' => $lower,
            'category'        => 'Uncategorized',
            'match_status'    => 'unmatched',
            'confidence'      => 0.45
        ];
    }

    /**
     * Check if a skill alias/term matches text with symbol-safe boundaries.
     */
    public static function matchTermInText(string $term, string $lowerText): bool {
        $cleanTerm = strtolower(trim($term));
        if (strlen($cleanTerm) < 1) return false;

        $escaped = preg_quote($cleanTerm, '/');
        $pattern = '/(?:^|[\s,;:()\\[\\]\\/{}<>"\'\\*&|!+`~])' . $escaped . '(?=$|[\s,;:()\\[\\]\\/{}<>"\'\\*&|!+`~.])/i';
        return (bool)preg_match($pattern, $lowerText);
    }

    /**
     * Group an array of skills or skill names into the 8 canonical SkillBridge categories.
     */
    public static function categorizeSkills(array $skills): array {
        $categories = [
            'Languages'            => [],
            'Frontend'             => [],
            'Backend'              => [],
            'Databases'            => [],
            'AI & Computer Vision' => [],
            'Cloud & Tools'        => [],
            'AI Development Tools' => [],
            'Other'                => [],
        ];

        $categoryMap = [];
        foreach (self::MASTER_TAXONOMY as $tax) {
            $categoryMap[strtolower(trim($tax['name']))] = $tax['category'];
            foreach ($tax['aliases'] ?? [] as $alias) {
                $categoryMap[strtolower(trim($alias))] = $tax['category'];
            }
        }

        foreach ($skills as $skill) {
            $name = is_array($skill) ? ($skill['name'] ?? '') : (string)$skill;
            if (empty($name)) continue;

            $lower = strtolower(trim($name));
            $cat = is_array($skill) && !empty($skill['category']) && $skill['category'] !== 'Technical' && $skill['category'] !== 'Uncategorized'
                ? $skill['category']
                : ($categoryMap[$lower] ?? 'Other');

            if (!isset($categories[$cat])) {
                if ($cat === 'Language') $cat = 'Languages';
                elseif ($cat === 'Database') $cat = 'Databases';
                elseif ($cat === 'AI/ML' || $cat === 'Data Science') $cat = 'AI & Computer Vision';
                elseif ($cat === 'Cloud' || $cat === 'DevOps') $cat = 'Cloud & Tools';
                elseif ($cat === 'Core CS' || $cat === 'Testing' || $cat === 'UI/UX') $cat = 'Other';
                else $cat = 'Other';
            }

            $categories[$cat][] = is_array($skill) ? $skill : ['name' => $name, 'category' => $cat];
        }

        return $categories;
    }

    /**
     * Match text against master skills & taxonomy.
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
            if (in_array($norm, self::NATURAL_LANGUAGES, true)) continue;

            if (self::matchTermInText($norm, $lowerText) && !isset($matchedKeys[$norm])) {
                $matched[] = $s;
                $matchedKeys[$norm] = true;
            }
        }

        // 2. Comprehensive Taxonomy scan
        foreach (self::MASTER_TAXONOMY as $taxSkill) {
            $taxNorm = strtolower(trim($taxSkill['name']));
            if (isset($matchedKeys[$taxNorm])) {
                continue;
            }

            $isMatch = false;
            $aliases = array_merge([$taxSkill['name']], $taxSkill['aliases'] ?? []);
            foreach ($aliases as $alias) {
                if (self::matchTermInText($alias, $lowerText)) {
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
                        $insSkillStmt = $db->prepare('
                            INSERT INTO skills (id, name, normalized_name, category)
                            VALUES (?, ?, ?, ?)
                            ON CONFLICT (normalized_name) DO NOTHING
                        ');
                        $insSkillStmt->execute([
                            $skillId,
                            $taxSkill['name'],
                            $taxNorm,
                            $taxSkill['category'] ?? 'Other'
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
     * Education, Experience, Internships, Certifications, and Evidence without downgrading verified skills.
     */
    public static function processResumeAutoSync(string $studentId, string $storageKey, ?string $resumeId = null): array {
        $db = Database::getConnection();

        // 1. Validate file exists in storage and calculate content hash
        $storageRoot = realpath(FileUploadService::getStorageRoot());
        $filePath = $storageRoot === false ? false : realpath($storageRoot . '/' . ltrim($storageKey, '/'));

        if (!$filePath || !is_file($filePath)) {
            return [
                'success'    => false,
                'error'      => 'Resume file not found in secure storage.',
                'error_code' => 'INVALID_FILE'
            ];
        }

        $contentHash = hash_file('sha256', $filePath) ?: hash('sha256', $storageKey);
        $resumeId ??= 'res_' . bin2hex(random_bytes(8));

        // The processing-history row is the durable resume record for this schema.
        // Create it before extraction so failed uploads remain observable and retryable.
        $historyStmt = $db->prepare('SELECT id FROM resume_processing_history WHERE student_id = ? AND resume_id = ? ORDER BY created_at DESC LIMIT 1');
        $historyStmt->execute([$studentId, $resumeId]);
        $historyId = $historyStmt->fetchColumn();

        if (!$historyId) {
            $historyId = 'rph_' . bin2hex(random_bytes(8));
            $db->prepare('
                INSERT INTO resume_processing_history (
                    id, resume_id, student_id, storage_key, content_hash,
                    processing_status, extraction_status, sync_status, parser_version
                ) VALUES (?, ?, ?, ?, ?, \'uploaded\', \'pending\', \'pending\', \'3.0\')
            ')->execute([$historyId, $resumeId, $studentId, $storageKey, $contentHash]);
        } else {
            $db->prepare('
                UPDATE resume_processing_history
                SET storage_key = ?, content_hash = ?, processing_status = \'uploaded\',
                    extraction_status = \'pending\', sync_status = \'pending\',
                    error_code = NULL, processed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ')->execute([$storageKey, $contentHash, $historyId]);
        }

        // 2. Fetch existing student record
        $sStmt = $db->prepare('SELECT * FROM students WHERE id = ? LIMIT 1');
        $sStmt->execute([$studentId]);
        $student = $sStmt->fetch(\PDO::FETCH_ASSOC);

        if (!$student) {
            $db->prepare('UPDATE resume_processing_history SET processing_status = \'failed\', error_code = \'STUDENT_NOT_FOUND\', processed_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$historyId]);
            return [
                'success'    => false,
                'error'      => 'Student record not found.',
                'error_code' => 'STUDENT_NOT_FOUND'
            ];
        }

        // 3. Extract plain text
        $textResult = self::extractTextFromFile($storageKey);
        if (!$textResult['success'] || empty($textResult['text'])) {
            $db->prepare('
                UPDATE resume_processing_history
                SET processing_status = \'failed\', extraction_status = \'failed\', sync_status = \'failed\',
                    error_code = ?, processed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ')->execute(['EXTRACTION_FAILED', $historyId]);
            return [
                'success'    => false,
                'error'      => $textResult['error'] ?? 'No extractable text layer found in resume.',
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

        // Attach resume metadata
        $structuredData['resume_metadata'] = [
            'content_hash'    => $contentHash,
            'storage_key'     => $storageKey,
            'format'          => $textResult['format'],
            'word_count'      => $textResult['word_count'],
            'processed_at'    => date('c'),
            'pipeline_version'=> '3.0'
        ];

        // 5. Match and Normalize Skills & Unknown Skills Isolation
        $matchedTaxonomySkills = self::matchSkillsInText($resumeText);
        $extractedRawSkills = $structuredData['raw_skills'] ?? [];
        if (empty($extractedRawSkills) && !empty($structuredData['skills'])) {
            foreach ($structuredData['skills'] as $skObj) {
                if (is_array($skObj) && !empty($skObj['name'])) {
                    $extractedRawSkills[] = $skObj['name'];
                } elseif (is_string($skObj)) {
                    $extractedRawSkills[] = $skObj;
                }
            }
        }

        $allSkillNorms = [];
        $unmatchedSkills = [];

        foreach ($matchedTaxonomySkills as $s) {
            $norm = strtolower(trim($s['normalized_name'] ?? $s['name']));
            $allSkillNorms[$norm] = [
                'id'           => $s['id'] ?? null,
                'name'         => $s['name'],
                'category'     => $s['category'] ?? 'Technical',
                'match_status' => 'matched',
                'confidence'   => 0.98
            ];
        }

        foreach ($extractedRawSkills as $rawSkill) {
            $norm = self::normalizeSkill($rawSkill);
            if (!$norm) continue;

            if ($norm['match_status'] === 'matched') {
                $normKey = $norm['normalized_name'];
                if (!isset($allSkillNorms[$normKey])) {
                    $allSkillNorms[$normKey] = [
                        'id'           => $norm['id'] ?? null,
                        'name'         => $norm['name'],
                        'category'     => $norm['category'],
                        'match_status' => 'matched',
                        'confidence'   => $norm['confidence'] ?? 0.95
                    ];
                }
            } else {
                $unmatchedSkills[] = [
                    'name'         => $norm['name'],
                    'match_status' => 'unmatched',
                    'confidence'   => $norm['confidence'] ?? 0.45
                ];
            }
        }

        // Register matched canonical skills in DB if not already present
        $insSkillStmt = $db->prepare('
            INSERT INTO skills (id, name, normalized_name, category)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (normalized_name) DO NOTHING
        ');

        $finalMatchedSkills = [];
        $finalSkillIds = [];

        foreach ($allSkillNorms as $normKey => $skInfo) {
            $fetchStmt = $db->prepare('SELECT id, name, normalized_name, category FROM skills WHERE normalized_name = ? LIMIT 1');
            $fetchStmt->execute([$normKey]);
            $dbRow = $fetchStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$dbRow) {
                $newId = 'sk_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $skInfo['name']));
                try {
                    $insSkillStmt->execute([$newId, $skInfo['name'], $normKey, $skInfo['category'] ?? 'Technical']);
                } catch (\Throwable $e) {
                    // Ignore duplicate
                }
                $fetchStmt->execute([$normKey]);
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
            'profile_updated'        => 0,
            'profile_fields_updated' => 0,
            'skills_added'           => 0,
            'skills_updated'         => 0,
            'projects_added'         => 0,
            'projects_updated'       => 0,
            'education_added'        => 0,
            'education_updated'      => 0,
            'experience_added'       => 0,
            'experience_updated'     => 0,
            'certifications_added'   => 0
        ];

        $conflicts = [];
        $skillsDetected = [];

        try {
            // A. Contact / Identity Conflict Detection (Phone, Location, Social Links)
            $existingPhone = trim((string)($student['phone'] ?? ''));
            $resumePhone = trim((string)($structuredData['personal_information']['phone'] ?? $structuredData['personal']['phone'] ?? ''));

            $cleanExistingPhone = preg_replace('/\D/', '', $existingPhone);
            $cleanResumePhone = preg_replace('/\D/', '', $resumePhone);

            if (!empty($cleanExistingPhone) && !empty($cleanResumePhone) && $cleanExistingPhone !== $cleanResumePhone) {
                $conflictId = 'conf_' . bin2hex(random_bytes(8));
                $conflicts[] = [
                    'id'              => $conflictId,
                    'field'           => 'phone',
                    'existing_value'  => $existingPhone,
                    'resume_value'    => $resumePhone,
                    'requires_review' => true,
                    'status'          => 'requires_review'
                ];

                $insConf = $db->prepare('
                    INSERT INTO resume_conflicts (id, student_id, resume_id, field, existing_value, resume_value, status)
                    VALUES (?, ?, ?, ?, ?, ?, \'requires_review\')
                ');
                $insConf->execute([$conflictId, $studentId, $resumeId, 'phone', $existingPhone, $resumePhone]);
            }

            // Conflict check for GitHub link
            $existingGithub = trim((string)($student['github_url'] ?? ''));
            $resumeGithub = trim((string)($structuredData['social_links']['github'] ?? $structuredData['links']['github'] ?? ''));
            if (!empty($existingGithub) && !empty($resumeGithub) && strtolower($existingGithub) !== strtolower($resumeGithub)) {
                $conflictId = 'conf_' . bin2hex(random_bytes(8));
                $conflicts[] = [
                    'id'              => $conflictId,
                    'field'           => 'github',
                    'existing_value'  => $existingGithub,
                    'resume_value'    => $resumeGithub,
                    'requires_review' => true,
                    'status'          => 'requires_review'
                ];
                $insConf = $db->prepare('
                    INSERT INTO resume_conflicts (id, student_id, resume_id, field, existing_value, resume_value, status)
                    VALUES (?, ?, ?, ?, ?, ?, \'requires_review\')
                ');
                $insConf->execute([$conflictId, $studentId, $resumeId, 'github', $existingGithub, $resumeGithub]);
            }

            // Conflict check for LinkedIn link
            $existingLinkedin = trim((string)($student['linkedin_url'] ?? ''));
            $resumeLinkedin = trim((string)($structuredData['social_links']['linkedin'] ?? $structuredData['links']['linkedin'] ?? ''));
            if (!empty($existingLinkedin) && !empty($resumeLinkedin) && strtolower($existingLinkedin) !== strtolower($resumeLinkedin)) {
                $conflictId = 'conf_' . bin2hex(random_bytes(8));
                $conflicts[] = [
                    'id'              => $conflictId,
                    'field'           => 'linkedin',
                    'existing_value'  => $existingLinkedin,
                    'resume_value'    => $resumeLinkedin,
                    'requires_review' => true,
                    'status'          => 'requires_review'
                ];
                $insConf = $db->prepare('
                    INSERT INTO resume_conflicts (id, student_id, resume_id, field, existing_value, resume_value, status)
                    VALUES (?, ?, ?, ?, ?, ?, \'requires_review\')
                ');
                $insConf->execute([$conflictId, $studentId, $resumeId, 'linkedin', $existingLinkedin, $resumeLinkedin]);
            }

            // B. Profile Fields Intelligent Merge (Fill missing, never overwrite existing verified/manual data)
            $profileUpdates = [];
            $updateParams = [];

            if (($student['resume_storage_key'] ?? '') !== $storageKey) {
                $profileUpdates[] = 'resume_storage_key = ?';
                $updateParams[] = $storageKey;
                $summary['profile_fields_updated']++;
                $summary['profile_updated']++;
            }

            // Location
            $resumeLoc = $structuredData['personal_information']['location'] ?? $structuredData['personal']['location'] ?? '';
            if (empty($student['location']) && !empty($resumeLoc)) {
                $profileUpdates[] = 'location = ?';
                $updateParams[] = $resumeLoc;
                $summary['profile_fields_updated']++;
                $summary['profile_updated']++;
            }

            // Phone (only set if student currently has NO phone registered)
            if (empty($existingPhone) && !empty($resumePhone)) {
                $profileUpdates[] = 'phone = ?';
                $updateParams[] = $resumePhone;
                $summary['profile_fields_updated']++;
                $summary['profile_updated']++;
            }

            // Bio / Summary
            $resumeSum = $structuredData['personal_information']['professional_summary'] ?? $structuredData['personal']['summary'] ?? '';
            if (empty($student['bio']) && !empty($resumeSum)) {
                $profileUpdates[] = 'bio = ?';
                $updateParams[] = $resumeSum;
                $summary['profile_fields_updated']++;
                $summary['profile_updated']++;
            }

            // Links: GitHub
            if (empty($existingGithub) && !empty($resumeGithub)) {
                $profileUpdates[] = 'github_url = ?';
                $updateParams[] = $resumeGithub;
                $summary['profile_fields_updated']++;
                $summary['profile_updated']++;
            }

            // Links: LinkedIn
            if (empty($existingLinkedin) && !empty($resumeLinkedin)) {
                $profileUpdates[] = 'linkedin_url = ?';
                $updateParams[] = $resumeLinkedin;
                $summary['profile_fields_updated']++;
                $summary['profile_updated']++;
            }

            // Links: Portfolio
            $resumePort = trim((string)($structuredData['social_links']['portfolio'] ?? $structuredData['links']['portfolio'] ?? ''));
            if (empty($student['portfolio_url']) && !empty($resumePort)) {
                $profileUpdates[] = 'portfolio_url = ?';
                $updateParams[] = $resumePort;
                $summary['profile_fields_updated']++;
                $summary['profile_updated']++;
            }

            if (!empty($profileUpdates)) {
                $profileUpdates[] = 'updated_at = CURRENT_TIMESTAMP';
                $updateParams[] = $studentId;
                $sql = 'UPDATE students SET ' . implode(', ', $profileUpdates) . ' WHERE id = ?';
                $upStmt = $db->prepare($sql);
                $upStmt->execute($updateParams);
            }

            // C. Skill Synchronization & Evidence
            // Fetch existing student skills and keep verification separate from evidence.
            $ssStmt = $db->prepare('SELECT skill_id, proficiency FROM student_skills WHERE student_id = ?');
            $ssStmt->execute([$studentId]);
            $existingStudentSkills = [];
            foreach ($ssStmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                $existingStudentSkills[$row['skill_id']] = $row;
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

                // Register skill evidence ledger:
                // Mandatory Rule: Resume claim != verified. Verification remains false unless proof-of-skill exists.
                $evId = 'ev_res_' . bin2hex(random_bytes(6));
                $meta = json_encode([
                    'storage_key'         => $storageKey,
                    'format'              => $textResult['format'],
                    'detected_at'         => date('c'),
                    'source_label'        => 'Extracted from uploaded resume',
                    'verification_status' => 'NOT_VERIFIED',
                    'claimed_proficiency' => 'Claimed in Resume'
                ]);
                $insEvidence->execute([$evId, $studentId, $sId, 75.0, $meta]);

                $skillsDetected[] = [
                    'id'                  => $sId,
                    'name'                => $sk['name'],
                    'category'            => $sk['category'],
                    'status'              => 'evidence_available',
                    'verification_status' => 'NOT_VERIFIED',
                    'confidence'          => 0.75,
                    'source'              => 'resume'
                ];
            }

            // D. Projects Auto-Sync & Deduplication
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
                        $proj['description'] ?? '',
                        $proj['technologies'] ?? '',
                        $proj['github_url'] ?? '',
                        $proj['live_url'] ?? '',
                        $matchedProjId
                    ]);
                    $summary['projects_updated']++;
                } else {
                    $newPId = 'proj_' . bin2hex(random_bytes(8));
                    $insProject->execute([
                        $newPId,
                        $studentId,
                        $pName,
                        $proj['description'] ?? '',
                        $proj['technologies'] ?? '',
                        $proj['live_url'] ?? '',
                        $proj['github_url'] ?? ''
                    ]);
                    $summary['projects_added']++;
                }
            }

            // E. Education Auto-Sync & Deduplication
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
                        $edu['field_of_study'] ?? $edu['field'] ?? 'Computer Science',
                        $edu['start_year'] ?? $edu['start_date'] ?? '',
                        $edu['graduation_year'] ?? $edu['end_date'] ?? '',
                        $edu['grade'] ?? $edu['cgpa'] ?? ''
                    ]);
                    $summary['education_added']++;
                    $summary['education_updated']++;
                }

                // Update student college/program if empty
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

            // F. Experience & Internships Auto-Sync & Deduplication
            $expStmt = $db->prepare('SELECT id, company, job_title FROM student_experience WHERE student_id = ?');
            $expStmt->execute([$studentId]);
            $existingExperience = $expStmt->fetchAll(\PDO::FETCH_ASSOC);

            $insExp = $db->prepare('
                INSERT INTO student_experience (id, student_id, company, job_title, employment_type, start_date, end_date, description, technologies)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');

            // 1. Full-time / Part-time / Contract Experience
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

            // 2. Internships (mapped cleanly to student_experience with employment_type = 'Internship')
            if (!empty($structuredData['internships'])) {
                foreach ($structuredData['internships'] as $intern) {
                    $comp = trim($intern['company'] ?? '');
                    if (empty($comp)) continue;

                    $isInternMatch = false;
                    $normComp = strtolower($comp);
                    foreach ($existingExperience as $ee) {
                        if (strtolower($ee['company']) === $normComp) {
                            $isInternMatch = true;
                            break;
                        }
                    }

                    if (!$isInternMatch) {
                        $expId = 'exp_int_' . bin2hex(random_bytes(6));
                        $techStr = implode(', ', $intern['skills_used'] ?? []);
                        $insExp->execute([
                            $expId,
                            $studentId,
                            $comp,
                            $intern['role'] ?: 'Intern',
                            'Internship',
                            $intern['start_date'] ?? '',
                            $intern['end_date'] ?? '',
                            $intern['description'] ?? '',
                            $techStr
                        ]);
                        $summary['experience_added']++;
                    }
                }
            }

            // G. Certifications Auto-Sync & Deduplication
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
            $db->prepare('
                UPDATE resume_processing_history
                SET processing_status = \'synced\', extraction_status = \'extracted\', sync_status = \'completed\',
                    summary = ?, conflicts = ?, error_code = NULL, processed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ')->execute([json_encode($summary), json_encode($conflicts), $historyId]);

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            try {
                $db->prepare('
                    UPDATE resume_processing_history
                    SET processing_status = \'failed\', extraction_status = \'extracted\', sync_status = \'failed\',
                        error_code = \'DATABASE_ERROR\', processed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ')->execute([$historyId]);
            } catch (\Throwable $historyError) {
                error_log('Resume failure history update failed: ' . $historyError->getMessage());
            }
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
        // B. Trigger Career Evolution & Real-Time Job Matching
        $careerImpact = [
            'readiness_updated'  => false,
            'skill_gaps_updated' => false,
            'job_matches_updated'=> false,
            'next_action_updated'=> false,
            'target_role'        => 'Full Stack Developer',
            'readiness_score'    => 0,
            'readiness_tier'     => 'Developing',
            'job_opportunities'  => []
        ];

        try {
            $careerGoal = CareerEvolutionService::getCareerGoal($studentId);
            $targetRole = $careerGoal['target_role'] ?? null;

            if (empty($targetRole)) {
                // Infer or default target role
                $targetRole = 'Full Stack Developer';
                if (!empty($structuredData['experience'][0]['job_title'])) {
                    $targetRole = $structuredData['experience'][0]['job_title'];
                }
                $db->prepare('
                    INSERT INTO career_goals (id, student_id, target_role, career_domain, experience_level, target_timeline_weeks)
                    VALUES (?, ?, ?, \'Engineering\', \'entry_level\', 12)
                    ON CONFLICT (student_id) DO UPDATE SET target_role = EXCLUDED.target_role, updated_at = CURRENT_TIMESTAMP
                ')->execute(['cg_' . bin2hex(random_bytes(8)), $studentId, $targetRole]);
            }

            $readiness = CareerEvolutionService::calculateReadiness($studentId, $targetRole);
            CareerEvolutionService::recordReadinessSnapshot(
                $studentId,
                $targetRole,
                (int)($readiness['readiness_score'] ?? 0),
                $readiness['readiness_tier'] ?? 'Developing',
                $readiness
            );

            // Compute immediate active job opportunities
            $jobOpps = CareerEvolutionService::getCareerOpportunities($studentId);

            $careerImpact['readiness_updated']   = true;
            $careerImpact['skill_gaps_updated']  = true;
            $careerImpact['job_matches_updated'] = true;
            $careerImpact['next_action_updated'] = true;
            $careerImpact['target_role']        = $targetRole;
            $careerImpact['readiness_score']    = (int)($readiness['readiness_score'] ?? 0);
            $careerImpact['readiness_tier']     = $readiness['readiness_tier'] ?? 'Developing';
            $careerImpact['job_opportunities']  = $jobOpps;

            // Log knowledge evolution milestone
            try {
                $db->prepare('
                    INSERT INTO knowledge_evolution_events (id, student_id, event_type, title, description, metadata, event_date)
                    VALUES (?, ?, \'resume_uploaded\', ?, ?, ?, CURRENT_TIMESTAMP)
                ')->execute([
                    'kee_' . bin2hex(random_bytes(8)),
                    $studentId,
                    'Resume Analyzed & Profile Synced',
                    'Synchronized ' . count($skillsDetected) . ' skills, ' . ($summary['projects_added'] ?? 0) . ' projects, and ' . ($summary['education_added'] ?? 0) . ' education records.',
                    json_encode(['resume_id' => $resumeId, 'skills_count' => count($skillsDetected), 'target_role' => $targetRole])
                ]);
            } catch (\Throwable $e) {
                // Non-blocking milestone record
            }
        } catch (\Throwable $e) {
            error_log('Career intelligence recalculation error: ' . $e->getMessage());
        }

        $categorizedSkills = self::categorizeSkills($skillsDetected);

        return [
            'success'              => true,
            'resume_id'            => $resumeId,
            'content_hash'         => $contentHash,
            'analysis'             => [
                'profile'        => $structuredData['personal_information'] ?? $structuredData['personal'] ?? [],
                'skills'         => $structuredData['skills'] ?? [],
                'unmatched_skills'=> $unmatchedSkills,
                'projects'       => $structuredData['projects'] ?? [],
                'education'      => $structuredData['education'] ?? [],
                'experience'     => $structuredData['experience'] ?? [],
                'internships'    => $structuredData['internships'] ?? [],
                'certifications' => $structuredData['certifications'] ?? [],
                'achievements'   => $structuredData['achievements'] ?? [],
                'languages'      => $structuredData['languages'] ?? [],
                'courses'        => $structuredData['courses'] ?? [],
                'links'          => $structuredData['social_links'] ?? $structuredData['links'] ?? [],
                'resume_quality' => $structuredData['resume_quality'] ?? [],
                'ats_analysis'   => $structuredData['ats_analysis'] ?? []
            ],
            'sync'                 => $summary,
            'summary'              => $summary,
            'conflicts'            => $conflicts,
            'career_impact'        => $careerImpact,
            'job_matching'         => $careerImpact['job_opportunities'] ?? [],
            'skills_detected'      => $skillsDetected,
            'categorized_skills'   => $categorizedSkills,
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
