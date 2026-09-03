# SkillBridge 3.0 — Deterministic Career Readiness Specification

## 1. Core Principle: Zero Mock Data, Zero Hallucination
SkillBridge calculates career readiness strictly through deterministic algorithms grounded in live relational records in PostgreSQL. Scores are never estimated, hallucinated by LLMs, or generated from hardcoded mock values.

---

## 2. Mathematical Readiness Formula

Career readiness $R \in [0, 100]$ is computed as a weighted combination of 4 evidence-backed factors:

$$R = 0.50 \cdot C_{\text{req}} + 0.20 \cdot C_{\text{pref}} + 0.15 \cdot P_{\text{bench}} + 0.15 \cdot E_{\text{port}}$$

### Factor Breakdown

| Factor | Weight | Source Tables | Calculation |
|---|---|---|---|
| **Required Skills Coverage ($C_{\text{req}}$)** | 50% | `career_skills`, `skills`, `student_skills`, `proof_of_skills` | Ratio of verified core skills ($\ge 70\%$ confidence or verified status) to total mandatory skills for the target role. |
| **Preferred Skills Coverage ($C_{\text{pref}}$)** | 20% | `career_skills`, `skills`, `student_skills` | Percentage of secondary/electives where the student has demonstrable claimed or assessed competence. |
| **Proficiency Benchmark ($P_{\text{bench}}$)** | 15% | `student_assessments`, `verification_audits` | Average performance score across formal technical assessment evaluations. |
| **Portfolio Evidence ($E_{\text{port}}$)** | 15% | `student_projects`, `student_project_progress` | Tangible proof points: GitHub repository verification, code commits, and project deliverable completions. |

---

## 3. Career Readiness Tiers

Readiness scores map directly to standardized career readiness stages:

- **Target Ready ($\ge 85\%$)**: Qualifies for high-confidence direct job matching and recruiter priority discovery.
- **Advanced Stage ($70\% - 84\%$)**: Majority of core prerequisites fulfilled; ready for final capstones and enterprise interviews.
- **Developing ($50\% - 69\%$)**: Strong foundation established; intermediate gaps remain in elective or advanced tooling.
- **Building ($25\% - 49\%$)**: Active in foundational coursework; requires structured project evidence.
- **Foundational ($0\% - 24\%$)**: Early-stage onboarding; immediate focus on primary prerequisite skill acquisition.

---

## 4. Immutable Readiness Snapshots (`career_readiness_snapshots`)

Whenever any milestone occurs:
- Goal update or timeline modification
- Formal skill verification passed
- Capstone project completed
- Weekly review executed

A point-in-time snapshot is recorded with:
- `student_id`: Student foreign key
- `target_role`: Active target role
- `readiness_score`: Quantified score
- `readiness_tier`: Standardized stage
- `breakdown`: Granular JSONB details (`required_coverage`, `preferred_coverage`, `proficiency`, `portfolio`)
- `snapshot_date`: Timestamp

This provides an immutable historical progression curve queryable via `GET /student/readiness-history`.
