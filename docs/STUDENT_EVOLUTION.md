# SkillBridge 3.0 — Continuous Student Career Evolution Engine

## 1. The 13-Stage Closed-Loop Evolution Flywheel

The career evolution flywheel ensures a student is never stagnant. Once a goal is established, the student progresses through a 13-stage continuous cycle:

```
MY CAREER GOAL
       ↓
CAREER READINESS
       ↓
MY SKILL GRAPH
       ↓
SKILL GAPS
       ↓
WHAT SHOULD I DO NEXT?
       ↓
LEARN
       ↓
PRACTICE
       ↓
BUILD
       ↓
ASSESS
       ↓
VERIFY
       ↓
CAREER READINESS ↑
       ↓
REACHABLE JOBS ↑
       ↓
REPEAT (Next Skill Gap)
```

---

## 2. Five Action Modalities

Each skill evolution pass engages 5 distinct modalities:

| Modality | Objective | Evidence Produced |
|---|---|---|
| **1. LEARN** | Theory & foundational engineering concepts | Resource completion record in `student_learning_progress`. |
| **2. PRACTICE** | Repetitive coding drills & algorithm implementation | Drill completion record. |
| **3. BUILD** | Portfolio capstone project with tangible code deliverables | Verified GitHub repository URL in `student_projects`. |
| **4. ASSESS** | Adaptive technical evaluation benchmark | Formal score in `student_assessments`. |
| **5. VERIFY** | Cryptographic proof-of-skill & integrity audit | Entry in `proof_of_skills` and elevated proficiency in `student_skills`. |

---

## 3. Flywheel State Transitions (`advanceEvolutionLoop`)

- Transitions are strictly evidence-guarded:
  - `learn` $\to$ `practice`: Requires marking a curated resource completed.
  - `practice` $\to$ `build`: Requires completing hands-on drills.
  - `build` $\to$ `assess`: Requires providing a valid repository URL.
  - `assess` $\to$ `verify`: Requires passing assessment score ($\ge 70\%$).
  - `verify` $\to$ `repeat`: Calculates readiness boost, upgrades reachable job tiers, unlocks subsequent DAG prerequisite nodes, and automatically selects the next highest-priority skill gap.

---

## 4. Knowledge Evolution Ledger (`knowledge_evolution_events`)

Every action creates an immutable chronological ledger event:
- Event types: `skill_learned`, `skill_practiced`, `project_completed`, `assessment_passed`, `skill_verified`, `milestone_unlocked`
- Tracks impact on overall readiness score
- Visible on the student's personal Knowledge Evolution Timeline (`/student/evolution`)
- Provides verified evidentiary basis for college placement officers and enterprise recruiters.
