# SkillBridge 3.0 — Recommendation Engine 2.0 Specification

## 1. Overview
Recommendation Engine 2.0 powers career navigation, learning resource selection, project assignments, and job reachability across SkillBridge 3.0.

The engine is built upon three non-negotiable principles:
1. **Deterministic Multi-Factor Scoring**: Recommendations rely on transparent, explainable mathematics rather than black-box AI hallucinations.
2. **Graph-First Prerequisites**: Prerequisite graph dependencies are resolved prior to recommending advanced competencies.
3. **AI as an Enhancer**: Generative AI (Gemini 3.7 Flash) provides contextual coaching explanations and synthesizes roadmap narratives, while all underlying scoring, ranking, and progression decisions remain deterministic.

---

## 2. Multi-Factor Scoring Formula

Every recommended action, course, video, or project blueprint is evaluated against a normalized $[0, 100]$ score:

$$S = \sum_{i} w_i \cdot s_i$$

### Factor Weights Breakdown:
| Factor | Notation | Weight ($w_i$) | Evaluation Criteria |
|:---|:---|:---|:---|
| **Skill Gap Coverage** | $S_{\text{gap}}$ | **30% (0.30)** | Evaluates whether the resource addresses a critical missing skill required for the student's target career role. |
| **Prerequisite Readiness** | $S_{\text{prereq}}$ | **25% (0.25)** | Evaluates whether the student has mastered all prerequisite nodes in the dependency DAG. Full credit (100) if prerequisites are verified, 20 if unmet. |
| **Career Alignment** | $S_{\text{career}}$ | **20% (0.20)** | Measures overlap between resource skill coverage and the career's core competency requirements. |
| **Difficulty Proximity** | $S_{\text{diff}}$ | **10% (0.10)** | Compares resource difficulty against the student's current proficiency level (beginner, intermediate, advanced). |
| **Resource Quality** | $S_{\text{qual}}$ | **10% (0.10)** | Objective pedagogical rating (0-100) based on provider reputation, ratings, and structure. |
| **Recency & Freshness** | $S_{\text{fresh}}$ | **5% (0.05)** | Penalizes decaying content; full credit for resources verified within the past 90 days. |

---

## 3. "What Should I Do Next?" Engine

The "What Should I Do Next?" engine resolves the single highest-leverage action a student should take today.

### Algorithmic Execution:
1. **Target Role & Goal Resolution**: Inspects student's active target role from `career_goals`.
2. **Verified Skill State**: Fetches verified skills and multi-factor confidence scores from `ProofOfSkillService`.
3. **DAG Prerequisite Traversal**:
   - Identifies top missing skills for the career role.
   - For each missing skill, examines incoming edges in `skill_dependencies`.
   - If an unverified prerequisite exists, prioritizes mastering the prerequisite node first.
   - If all prerequisites are satisfied, prioritizes the core competency.
4. **Best Matched Learning Resource**: Selects the highest scoring course/video matching the target skill.
5. **Impact Estimation**: Computes the exact percentage boost in Career Readiness (typically $+10\%$ to $+15\%$) upon completing the action.
6. **Prioritized Follow-ups**: Generates exactly 3 secondary sequential steps (e.g., project implementation, formal assessment, documentation review).

---

## 4. 4-Tier Job Reachability Engine

Instead of presenting an undifferentiated list of jobs, SkillBridge 3.0 categorizes every live opportunity into one of four actionable tiers based on verified skill match percentage:

### Tier Structure:
- **Tier 1: Ready Now ($\ge 85\%$)**
  - The student meets virtually all core qualifications.
  - Action: Immediate application recommendation.
  - Reachability: 0-7 days.
- **Tier 2: Nearly Ready ($70\% - 84\%$)**
  - The student has 1 or 2 minor skill gaps that can be closed rapidly.
  - Action: Targeted sprint on missing preferred skills.
  - Reachability: 2-4 weeks.
- **Tier 3: Skill Gap ($50\% - 69\%$)**
  - The student possesses foundational requirements but lacks key domain competencies.
  - Action: Structured multi-week learning path and project blueprint.
  - Reachability: 30-60 days.
- **Tier 4: Future Target ($< 50\%$)**
  - High-value long-term aspiration requiring progressive capability development.
  - Action: Roadmap milestone for subsequent phases.
  - Reachability: 60-120 days.

---

## 5. Cold-Start Strategy
For new students with zero verified skills:
- The engine identifies foundational Level 1 skills with in-degree 0 in the DAG (e.g., HTML/CSS, Git, Python/JavaScript Basics).
- Generates curated introductory hands-on starter projects with automated repo templates.
- Recommends baseline skill integrity assessments to establish initial confidence scores without friction.
