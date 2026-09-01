<?php
declare(strict_types=1);

/**
 * Intelligent Skill Matching & Career Recommendation Engine
 * Computes deterministic match scores, explains match depth, generates targeted learning paths,
 * and ranks candidates by multi-factor role fit.
 */
class MatchingService {
    /**
     * Skill roadmap knowledge base for actionable learning paths
     */
    private static array $skillRoadmaps = [
        'react' => [
            'skill' => 'React',
            'time_to_learn' => '2-3 weeks',
            'key_topics' => ['Hooks & Custom Hooks', 'State Architecture (Zustand/Redux)', 'Component Lifecycle & Memoization'],
            'resource' => 'React Official Docs & Hands-on Projects',
            'score_boost' => 20
        ],
        'typescript' => [
            'skill' => 'TypeScript',
            'time_to_learn' => '1-2 weeks',
            'key_topics' => ['Type Inference & Generics', 'Discriminated Unions', 'Utility Types (Pick, Omit, Record)'],
            'resource' => 'TypeScript Handbook & Practical Drills',
            'score_boost' => 18
        ],
        'node.js' => [
            'skill' => 'Node.js',
            'time_to_learn' => '2 weeks',
            'key_topics' => ['RESTful API Architecture', 'Async/Await & Event Loop', 'JWT Authentication & Middleware'],
            'resource' => 'Node.js Design Patterns & Backend Labs',
            'score_boost' => 18
        ],
        'postgresql' => [
            'skill' => 'PostgreSQL',
            'time_to_learn' => '2 weeks',
            'key_topics' => ['Relational Schema Design', 'Indexes & Query Optimization', 'Transactions & Constraints'],
            'resource' => 'PostgreSQL Official Docs & SQL Interactive Exercises',
            'score_boost' => 15
        ],
        'python' => [
            'skill' => 'Python',
            'time_to_learn' => '2-3 weeks',
            'key_topics' => ['Data Structures & OOP', 'FastAPI / Django Frameworks', 'Asynchronous Programming'],
            'resource' => 'RealPython Tutorials & Backend Guides',
            'score_boost' => 20
        ],
        'cloud' => [
            'skill' => 'Cloud (AWS/GCP)',
            'time_to_learn' => '3-4 weeks',
            'key_topics' => ['Cloud Fundamentals', 'IAM Security & S3 Storage', 'Serverless Functions & Deployments'],
            'resource' => 'AWS Cloud Practitioner & Cloud Architecture Sandboxes',
            'score_boost' => 22
        ],
        'aws' => [
            'skill' => 'AWS',
            'time_to_learn' => '3-4 weeks',
            'key_topics' => ['EC2 & S3 Basics', 'IAM Roles & Policies', 'Lambda Serverless Architecture'],
            'resource' => 'AWS Certified Cloud Practitioner Roadmap',
            'score_boost' => 22
        ],
        'docker' => [
            'skill' => 'Docker',
            'time_to_learn' => '1-2 weeks',
            'key_topics' => ['Containerization Basics', 'Dockerfile Best Practices', 'Docker Compose Multi-Container Setup'],
            'resource' => 'Docker Official Getting Started Guide',
            'score_boost' => 15
        ],
        'css' => [
            'skill' => 'CSS & Modern Layouts',
            'time_to_learn' => '1 week',
            'key_topics' => ['Flexbox & Grid Systems', 'Responsive Breakpoints & Fluid Typography', 'Design Tokens & OKLCH/HSL'],
            'resource' => 'MDN Web Docs & Modern CSS Solutions',
            'score_boost' => 12
        ],
        'php' => [
            'skill' => 'PHP 8+',
            'time_to_learn' => '1-2 weeks',
            'key_topics' => ['PHP 8.x Modern Features', 'PDO Prepared Statements', 'REST API Architecture'],
            'resource' => 'PHP: The Right Way & Clean Architecture Guides',
            'score_boost' => 15
        ],
        'ai' => [
            'skill' => 'AI & LLM Integration',
            'time_to_learn' => '2-3 weeks',
            'key_topics' => ['Prompt Engineering & System Instructions', 'Embeddings & Vector Search', 'Streaming API Integration'],
            'resource' => 'DeepLearning.AI & Hands-on LLM Projects',
            'score_boost' => 20
        ],
        'mysql' => [
            'skill' => 'MySQL',
            'time_to_learn' => '1-2 weeks',
            'key_topics' => ['Relational Modeling', 'Indexes & Query Plans', 'Normalization'],
            'resource' => 'MySQL Documentation & Practical Query Labs',
            'score_boost' => 15
        ],
        'java' => [
            'skill' => 'Java',
            'time_to_learn' => '3 weeks',
            'key_topics' => ['Core OOP & Collections', 'Spring Boot Microservices', 'Dependency Injection & REST'],
            'resource' => 'Spring Guides & Java Masterclass',
            'score_boost' => 18
        ]
    ];

    /**
     * Compare candidate's skills against job required skills with deep reasoning
     *
     * @param string[] $studentSkills List of student skills
     * @param string[] $jobSkills     List of job required skills
     * @param array    $extraContext  Optional experience or graduation context
     * @return array
     */
    public static function calculateMatch(array $studentSkills, array $jobSkills, array $extraContext = []): array {
        if (empty($jobSkills)) {
            return [
                'score'          => 100,
                'matched'        => $studentSkills,
                'missing'        => [],
                'fit_level'      => 'Strong Fit',
                'explanation'    => 'Complete role qualification: All required competencies are matched.',
                'strengths'      => $studentSkills,
                'learning_paths' => [],
                'role_fit_score' => 98
            ];
        }

        // Normalize skills for case-insensitive matching
        $studentMap = [];
        foreach ($studentSkills as $skill) {
            $studentMap[strtolower(trim($skill))] = trim($skill);
        }

        $matched = [];
        $missing = [];

        foreach ($jobSkills as $jobSkill) {
            $cleanJobSkill = trim($jobSkill);
            $normalized = strtolower($cleanJobSkill);

            if (isset($studentMap[$normalized])) {
                $matched[] = $studentMap[$normalized];
            } else {
                $missing[] = $cleanJobSkill;
            }
        }

        $totalRequired = count($jobSkills);
        $totalMatched = count($matched);

        $rawScore = (int)round(($totalMatched / $totalRequired) * 100);

        // Determine Fit Level & Natural Language Explanation
        $fitLevel = 'Developing Fit';
        $explanation = '';

        if ($rawScore >= 85) {
            $fitLevel = 'Strong Fit';
            if (empty($missing)) {
                $explanation = "Outstanding match (100%): You possess all required technical competencies for this opportunity.";
            } else {
                $missingList = implode(', ', $missing);
                $matchedList = implode(', ', array_slice($matched, 0, 3));
                $explanation = "Strong candidate match ({$rawScore}%): Core competencies in {$matchedList} align with role requirements. Adding {$missingList} will complete your profile.";
            }
        } elseif ($rawScore >= 50) {
            $fitLevel = 'Moderate Fit';
            $missingList = implode(', ', $missing);
            $explanation = "Solid foundation ({$rawScore}%): You demonstrate essential capabilities in " . implode(', ', $matched) . ". Acquiring skills in {$missingList} will significantly increase hiring probability.";
        } else {
            $fitLevel = 'Developing Fit';
            $missingList = implode(', ', $missing);
            $explanation = "Growth opportunity ({$rawScore}%): Role requires additional specialization in {$missingList}. Follow the recommended learning paths below to qualify.";
        }

        // Generate tailored learning recommendations for missing skills
        $learningPaths = [];
        foreach ($missing as $mSkill) {
            $normKey = strtolower($mSkill);
            if (isset(self::$skillRoadmaps[$normKey])) {
                $learningPaths[] = self::$skillRoadmaps[$normKey];
            } else {
                $learningPaths[] = [
                    'skill' => $mSkill,
                    'time_to_learn' => '2 weeks',
                    'key_topics' => ["Core {$mSkill} Concepts", "Practical Implementation", "Architecture & Testing"],
                    'resource' => "Curated {$mSkill} Technical Documentation & Exercises",
                    'score_boost' => (int)max(10, round(100 / max(1, $totalRequired)))
                ];
            }
        }

        // Compute multi-factor Role-Fit Index (Skills 60%, Breadth 25%, Experience 15%)
        $breadthBonus = min(25, count($studentSkills) * 3);
        $experienceBonus = isset($extraContext['experience']) && str_contains(strtolower($extraContext['experience']), '2+') ? 15 : 10;
        $roleFitScore = min(99, (int)round(($rawScore * 0.60) + $breadthBonus + $experienceBonus));

        return [
            'score'          => $rawScore,
            'matched'        => array_values($matched),
            'missing'        => array_values($missing),
            'fit_level'      => $fitLevel,
            'explanation'    => $explanation,
            'strengths'      => array_values($matched),
            'learning_paths' => $learningPaths,
            'role_fit_score' => $roleFitScore
        ];
    }
}
