# SkillBridge 3.0 — AI Career Coach Security & Safety Specification

## 1. Advisory Boundary & AI Non-Authority

SkillBridge enforces strict boundaries separating AI assistance from systemic truth:

### Forbidden for LLM:
- **Authorization & Access Control**: LLM never decides who has access to which student record.
- **Verification Truth**: LLM never generates or signs proof-of-skill certificates.
- **Readiness Scoring Truth**: LLM never computes or alters database scores or readiness tiers.
- **Job Eligibility Gates**: Hard job gates are computed strictly by PostgreSQL SQL queries.
- **Database State**: LLM has no write access to relational schema.

### Permitted for LLM:
- Pedagogical explanations of complex engineering concepts.
- Personalized study schedules and roadmap interpretation.
- Project architecture suggestions based on verified student gaps.
- Interview preparation and contextual career guidance.

---

## 2. Prompt Injection Defense & Delimiter Isolation

Student queries are strictly treated as **UNTRUSTED** input:

```markdown
<student_data>
Student Profile:
- Target Career Role: {$targetRole}
- Overall Readiness: {$readiness['overall_readiness']}%
- Strong Verified Skills: {skills}
- Skills Needing Improvement: {skills}
- Missing Skills: {skills}
- Next Best Action: {action}

STUDENT QUESTION:
{$safeQuery}
</student_data>
```

- System prompts strictly instruct Gemini 3.7 Flash to ignore any meta-instructions, role-play overrides, or jailbreak attempts embedded within `{$safeQuery}`.
- All input strings are sanitized against control characters and length-capped.

---

## 3. Deterministic Fallback Contract

If the Gemini API is unreachable, times out, rate-limited, or returns invalid JSON:
1. The engine executes a deterministic fallback generator.
2. The reply references the student's actual database gaps and readiness.
3. The recommended next action is pulled directly from the student's active roadmap.
4. Focus skills are extracted directly from `needs_improvement` or `missing` arrays in `skill_gaps`.
5. Zero runtime exceptions or 500 errors are surfaced to the student.

---

## 4. Persistent Conversation Auditing

- Sessions are recorded in `career_coach_sessions` keyed by `student_id`.
- Messages are logged in `career_coach_messages` (`session_id`, `sender`, `message`, `metadata`, `created_at`).
- College administrators and compliance officers can audit advisor quality and safety.
