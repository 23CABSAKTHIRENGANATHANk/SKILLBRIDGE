<?php
declare(strict_types=1);

/**
 * SkillBridge Gemini AI Service
 *
 * Wraps the Google Gemini 1.5 Flash API for all AI features:
 *  - Resume summarisation
 *  - Candidate-to-job match explanation
 *  - Personalised job recommendations
 *  - Skill gap analysis with learning paths
 *  - Recruiter pipeline insights
 *
 * Falls back to deterministic on-device responses if the API key is missing
 * or the request fails, so the app never breaks.
 */
class GeminiService {
    private const API_URL  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    private const TIMEOUT  = 12; // seconds

    // -----------------------------------------------------------------------
    // Core generation helper
    // -----------------------------------------------------------------------

    private static function generate(string $prompt, float $temperature = 0.4): string {
        $apiKey = getenv('GEMINI_API_KEY') ?: '';
        if (empty($apiKey)) {
            return ''; // trigger deterministic fallback
        }

        $payload = json_encode([
            'contents' => [[
                'parts' => [['text' => $prompt]]
            ]],
            'generationConfig' => [
                'temperature'     => $temperature,
                'maxOutputTokens' => 512,
                'topP'            => 0.8,
            ],
            'safetySettings' => [
                ['category' => 'HARM_CATEGORY_HARASSMENT', 'threshold' => 'BLOCK_NONE'],
                ['category' => 'HARM_CATEGORY_HATE_SPEECH', 'threshold' => 'BLOCK_NONE'],
            ]
        ]);

        $ch = curl_init(self::API_URL . '?key=' . $apiKey);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_TIMEOUT        => self::TIMEOUT,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($payload),
            ],
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $raw  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false || $code !== 200) {
            return '';
        }

        $data = json_decode($raw, true);
        return $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
    }

    // -----------------------------------------------------------------------
    // 1. Resume Summary
    // -----------------------------------------------------------------------

    /**
     * Generate a concise professional summary from resume text.
     * Returns an array with headline, summary, strengths, and improvement tips.
     */
    public static function summariseResume(
        string $resumeText,
        string $studentName,
        string $program,
        array  $skills
    ): array {
        $skillList = implode(', ', $skills);
        $prompt = <<<PROMPT
You are a professional career coach reviewing a student's resume for tech/engineering internships.

Student: {$studentName}
Program: {$program}
Known skills: {$skillList}

Resume text (extracted):
{$resumeText}

Provide a structured JSON analysis with EXACTLY these fields:
{
  "headline": "One-line professional headline for LinkedIn/profile (max 12 words)",
  "summary": "3-sentence professional summary for their profile (write in first person)",
  "key_strengths": ["strength1", "strength2", "strength3"],
  "improvement_tips": ["tip1", "tip2"],
  "ats_score": <integer 1-100 estimated ATS friendliness>,
  "experience_level": "Fresher|Junior|Mid"
}

Respond with ONLY valid JSON, no markdown, no extra text.
PROMPT;

        $raw = self::generate($prompt, 0.3);

        if (!empty($raw)) {
            $decoded = json_decode(self::extractJson($raw), true);
            if (is_array($decoded) && isset($decoded['headline'])) {
                return $decoded;
            }
        }

        // Deterministic fallback
        return self::fallbackResumeSummary($studentName, $program, $skills);
    }

    // -----------------------------------------------------------------------
    // 2. Candidate-to-Job Match Explanation
    // -----------------------------------------------------------------------

    /**
     * AI-generated natural language explanation of why a candidate matches (or not) a job.
     */
    public static function explainMatch(
        string $studentName,
        array  $studentSkills,
        string $experience,
        string $jobTitle,
        string $companyName,
        array  $jobSkills,
        int    $matchScore
    ): array {
        $sSkills  = implode(', ', $studentSkills);
        $jSkills  = implode(', ', $jobSkills);
        $missing  = array_values(array_diff(
            array_map('strtolower', $jobSkills),
            array_map('strtolower', $studentSkills)
        ));
        $missingStr = implode(', ', $missing);

        $prompt = <<<PROMPT
You are an AI career advisor explaining a job match to a student.

Student: {$studentName} | Experience: {$experience}
Student skills: {$sSkills}
Target job: {$jobTitle} at {$companyName}
Job requires: {$jSkills}
Missing skills: {$missingStr}
Computed match score: {$matchScore}%

Write a JSON response with:
{
  "verdict": "Strong Match|Good Match|Moderate Match|Reach Role",
  "fit_paragraph": "2-3 sentence personalised explanation of why they match (first person, encouraging tone)",
  "top_reasons": ["reason1", "reason2", "reason3"],
  "gap_summary": "1 sentence about the main skill gaps",
  "recruiter_tip": "1-sentence insight for the recruiter about this candidate",
  "confidence": <integer 1-100>
}

Be specific, reference actual skill names. Respond with ONLY valid JSON.
PROMPT;

        $raw = self::generate($prompt, 0.5);

        if (!empty($raw)) {
            $decoded = json_decode(self::extractJson($raw), true);
            if (is_array($decoded) && isset($decoded['verdict'])) {
                return array_merge($decoded, ['missing_skills' => $missing]);
            }
        }

        return self::fallbackMatchExplanation($matchScore, $missing, $jobTitle);
    }

    // -----------------------------------------------------------------------
    // 3. Personalized Job Recommendations
    // -----------------------------------------------------------------------

    /**
     * Return a ranked + annotated list of jobs most relevant to the student.
     */
    public static function recommendJobs(
        string $studentName,
        string $program,
        array  $studentSkills,
        string $experience,
        array  $jobs // [{id, title, company, skills[], location, type}]
    ): array {
        if (empty($jobs)) return [];

        $skillList = implode(', ', $studentSkills);
        $jobList   = json_encode(array_slice($jobs, 0, 20));

        $prompt = <<<PROMPT
You are a smart job recommendation engine for a career platform.

Student: {$studentName} | Program: {$program} | Experience: {$experience}
Student skills: {$skillList}

Available jobs (JSON):
{$jobList}

Rank the top 5 most suitable jobs and explain WHY each is recommended.
Respond with JSON array ONLY:
[
  {
    "job_id": "<id from the list>",
    "reason": "2-sentence personalised recommendation reason mentioning specific matching skills",
    "fit_label": "Perfect Fit|Great Match|Good Match|Worth Trying",
    "missing_count": <integer: number of required skills student doesn't have>
  }
]

Order by suitability (best first). Respond with ONLY valid JSON array.
PROMPT;

        $raw = self::generate($prompt, 0.4);

        if (!empty($raw)) {
            $decoded = json_decode(self::extractJson($raw), true);
            if (is_array($decoded) && !empty($decoded)) {
                return $decoded;
            }
        }

        // Fallback: return first 5 jobs with generic labels
        return array_map(fn($job, $i) => [
            'job_id'        => $job['id'],
            'reason'        => "This {$job['type']} role at {$job['company']} aligns with your {$program} background.",
            'fit_label'     => $i === 0 ? 'Great Match' : 'Good Match',
            'missing_count' => 0,
        ], array_slice($jobs, 0, 5), range(0, 4));
    }

    // -----------------------------------------------------------------------
    // 4. Skill Gap Analysis
    // -----------------------------------------------------------------------

    /**
     * Detailed skill gap + learning path for a target job.
     */
    public static function analyseSkillGap(
        array  $studentSkills,
        string $targetJobTitle,
        array  $jobSkills,
        string $program
    ): array {
        $sSkills = implode(', ', $studentSkills);
        $jSkills = implode(', ', $jobSkills);

        $prompt = <<<PROMPT
You are a career development coach helping a {$program} student bridge skill gaps.

Student skills: {$sSkills}
Target role: {$targetJobTitle}
Required skills: {$jSkills}

Analyse the gap and create a personalised learning roadmap.
Respond with ONLY valid JSON:
{
  "gap_skills": ["skill1", "skill2"],
  "readiness_score": <integer 0-100>,
  "time_to_ready": "e.g. 4-6 weeks",
  "roadmap": [
    {
      "skill": "SkillName",
      "priority": "High|Medium|Low",
      "weeks": <integer>,
      "why_needed": "1 sentence on why this skill is needed for the role",
      "resources": ["Resource 1", "Resource 2"],
      "quick_win": "1 actionable thing to do this week"
    }
  ],
  "encouragement": "1 motivating sentence specific to their situation"
}

Respond with ONLY valid JSON.
PROMPT;

        $raw = self::generate($prompt, 0.3);

        if (!empty($raw)) {
            $decoded = json_decode(self::extractJson($raw), true);
            if (is_array($decoded) && isset($decoded['roadmap'])) {
                return $decoded;
            }
        }

        return self::fallbackSkillGap($studentSkills, $jobSkills, $targetJobTitle);
    }

    // -----------------------------------------------------------------------
    // 5. Recruiter Pipeline Insights
    // -----------------------------------------------------------------------

    /**
     * AI-generated summary of a recruiter's candidate pipeline.
     */
    public static function recruiterInsights(
        int    $totalCandidates,
        int    $shortlisted,
        int    $inInterview,
        array  $topSkillsInPool,
        string $topJobTitle,
        array  $recentCandidateNames
    ): array {
        $nameList  = implode(', ', array_slice($recentCandidateNames, 0, 5));
        $skillList = implode(', ', array_slice($topSkillsInPool, 0, 8));

        $prompt = <<<PROMPT
You are an AI recruitment analytics advisor.

Pipeline snapshot:
- Total applicants: {$totalCandidates}
- Shortlisted: {$shortlisted}
- In interview: {$inInterview}
- Most applied role: {$topJobTitle}
- Top skills in pool: {$skillList}
- Recent applicants: {$nameList}

Generate recruiter insights as JSON:
{
  "pipeline_health": "Healthy|Growing|Needs Attention",
  "summary": "2-sentence executive summary of the pipeline state",
  "top_insight": "The single most important observation for the recruiter right now",
  "action_recommendations": ["action1", "action2", "action3"],
  "conversion_tip": "1-sentence tip to improve shortlist-to-offer conversion",
  "talent_pool_quality": "Strong|Moderate|Thin"
}

Respond with ONLY valid JSON.
PROMPT;

        $raw = self::generate($prompt, 0.6);

        if (!empty($raw)) {
            $decoded = json_decode(self::extractJson($raw), true);
            if (is_array($decoded) && isset($decoded['pipeline_health'])) {
                return $decoded;
            }
        }

        // Deterministic fallback
        $health = $totalCandidates > 20 ? 'Healthy' : ($totalCandidates > 5 ? 'Growing' : 'Needs Attention');
        return [
            'pipeline_health'        => $health,
            'summary'                => "You have {$totalCandidates} applicants with {$shortlisted} shortlisted and {$inInterview} in interview stage.",
            'top_insight'            => "Your shortlist rate is " . ($totalCandidates > 0 ? round($shortlisted / $totalCandidates * 100) : 0) . "% — industry benchmark is 15-25%.",
            'action_recommendations' => ["Review pending applications", "Schedule interviews for shortlisted candidates", "Post more jobs to attract diverse talent"],
            'conversion_tip'         => "Send personalised rejection emails to improve employer brand.",
            'talent_pool_quality'    => $totalCandidates > 15 ? 'Strong' : 'Moderate',
        ];
    }

    // -----------------------------------------------------------------------
    // Private: JSON extraction + fallbacks
    // -----------------------------------------------------------------------

    private static function extractJson(string $text): string {
        // Strip markdown fences
        $text = preg_replace('/```(?:json)?\s*/i', '', $text);
        $text = preg_replace('/```\s*$/', '', $text);

        // Try to find JSON object or array
        if (preg_match('/(\{[\s\S]*\}|\[[\s\S]*\])/m', $text, $m)) {
            return $m[1];
        }

        return $text;
    }

    private static function fallbackResumeSummary(string $name, string $program, array $skills): array {
        $topSkills = implode(', ', array_slice($skills, 0, 3));
        return [
            'headline'        => "{$program} Graduate with expertise in {$topSkills}",
            'summary'         => "I am a motivated {$program} student with hands-on experience in {$topSkills}. I thrive in collaborative environments and enjoy solving complex technical challenges. I am actively seeking opportunities to apply my skills in a professional setting.",
            'key_strengths'   => array_slice($skills, 0, 3),
            'improvement_tips'=> ["Add quantifiable achievements (e.g. 'Reduced load time by 40%')", "Include a LinkedIn profile URL"],
            'ats_score'       => 72,
            'experience_level'=> 'Fresher',
        ];
    }

    private static function fallbackMatchExplanation(int $score, array $missing, string $jobTitle): array {
        $verdict = $score >= 85 ? 'Strong Match' : ($score >= 65 ? 'Good Match' : 'Moderate Match');
        return [
            'verdict'       => $verdict,
            'fit_paragraph' => "My skill set aligns well with the requirements for {$jobTitle}. I bring relevant technical expertise and a strong academic foundation. I am eager to close any remaining skill gaps.",
            'top_reasons'   => ["Strong technical skill alignment", "Academic background matches role requirements", "Demonstrable project experience"],
            'gap_summary'   => empty($missing) ? "No critical skill gaps identified." : "Key gaps: " . implode(', ', $missing) . ".",
            'recruiter_tip' => "Strong candidate with good fundamentals — recommend for technical screening.",
            'confidence'    => $score,
            'missing_skills'=> $missing,
        ];
    }

    private static function fallbackSkillGap(array $studentSkills, array $jobSkills, string $job): array {
        $sLower  = array_map('strtolower', $studentSkills);
        $missing = array_values(array_filter($jobSkills, fn($s) => !in_array(strtolower($s), $sLower)));
        $score   = empty($jobSkills) ? 100 : (int)((count($jobSkills) - count($missing)) / count($jobSkills) * 100);

        $roadmap = array_slice(array_map(fn($s) => [
            'skill'      => $s,
            'priority'   => 'High',
            'weeks'      => 2,
            'why_needed' => "Required for the {$job} role.",
            'resources'  => ["Official documentation", "YouTube tutorials", "Practice projects"],
            'quick_win'  => "Build a small demo project using {$s} this week.",
        ], $missing), 0, 4);

        return [
            'gap_skills'     => $missing,
            'readiness_score'=> $score,
            'time_to_ready'  => count($missing) . '-' . (count($missing) * 2) . ' weeks',
            'roadmap'        => $roadmap,
            'encouragement'  => "You already have a strong foundation — closing these gaps will make you a top candidate!",
        ];
    }
}
