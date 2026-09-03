<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/FileUploadService.php';
require_once __DIR__ . '/SkillIntegrityService.php';

/**
 * ResumeExtractionService
 * SkillBridge 2.0 Native Resume Text & Skill Evidence Extraction Pipeline.
 * 
 * Pipeline:
 * Upload -> MIME Validation -> Private Storage -> Text Extraction -> Skill Detection -> Evidence Persistence -> Integrity Audit
 */
class ResumeExtractionService {

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
            'error' => empty($text) ? 'No extractable text layer found (file may be scanned image or empty).' : null
        ];
    }

    /**
     * Pure PHP stream decoder for text-based PDF documents.
     */
    public static function extractTextFromPdf(string $filePath): string {
        if (!file_exists($filePath)) {
            return '';
        }
        $content = file_get_contents($filePath);
        if ($content === false || empty($content)) {
            return '';
        }

        $text = '';
        if (preg_match_all('/stream\r?\n([\s\S]*?)\r?\nendstream/m', $content, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[1] as $streamMatch) {
                $streamData = $streamMatch[0];
                $streamOffset = $streamMatch[1];
                $headerChunk = substr($content, max(0, $streamOffset - 300), 300);
                $isFlate = str_contains($headerChunk, '/FlateDecode');

                $decompressed = $streamData;
                if ($isFlate) {
                    $uncompressed = @gzuncompress($streamData);
                    if ($uncompressed !== false) {
                        $decompressed = $uncompressed;
                    }
                }

                // Match (text) Tj
                if (preg_match_all('/\((.*?)\)\s*Tj/s', $decompressed, $tjMatches)) {
                    $text .= ' ' . implode(' ', $tjMatches[1]);
                }
                // Match [(t1) 10 (t2)] TJ
                if (preg_match_all('/\[(.*?)\]\s*TJ/s', $decompressed, $tjArrMatches)) {
                    foreach ($tjArrMatches[1] as $tjArr) {
                        if (preg_match_all('/\((.*?)\)/s', $tjArr, $innerMatches)) {
                            $text .= ' ' . implode('', $innerMatches[1]);
                        }
                    }
                    $text .= ' ';
                }
            }
        }

        // Decode escaped characters
        $text = preg_replace('/\\\([0-7]{3})/', '', $text);
        $text = str_replace(['\\(', '\\)', '\\\\'], ['(', ')', '\\'], $text);
        return trim((string)preg_replace('/\s+/', ' ', $text));
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
     * Match extracted plain text against registered master skills.
     */
    public static function matchSkillsInText(string $text): array {
        if (empty($text)) {
            return [];
        }

        $db = Database::getConnection();
        $stmt = $db->query('SELECT id, name, normalized_name FROM skills');
        $skills = $stmt->fetchAll();

        $matched = [];
        $lowerText = ' ' . strtolower($text) . ' ';

        foreach ($skills as $s) {
            $norm = strtolower($s['normalized_name']);
            if (strlen($norm) < 2) continue;

            $pattern = '/\b' . preg_quote($norm, '/') . '\b/i';
            if (preg_match($pattern, $lowerText)) {
                $matched[] = $s;
            }
        }

        return $matched;
    }

    /**
     * Full Pipeline: Process resume, persist evidence to skill_evidence, and trigger audit.
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
                $evId = 'ev_res_' . bin2hex(random_bytes(6));
                $meta = json_encode([
                    'storage_key' => $storageKey,
                    'format' => $extracted['format'],
                    'detected_at' => date('c'),
                    'source_label' => 'Extracted from uploaded resume'
                ]);

                // Base confidence for keyword match in resume document
                $confidence = 65.0;
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
            'word_count' => $extracted['word_count'],
            'matched_skills_count' => count($savedSkills),
            'matched_skills' => $savedSkills
        ];
    }
}
