# SkillBridge 3.0 — Student Career Evolution Engine Specification

## 1. Vision & Architecture
The Student Career Evolution Engine transforms passive learning into continuous, verified career momentum. It tracks a student's journey from day one to career placement through five synchronized pillars:

```
[Target Career Role]
        │
        ▼
[Skill Gap Analysis & DAG Traversal]
        │
        ▼
[Personalized Dynamic Roadmap (8-24 Weeks)]
        │
        ▼
[Weekly Action Plan & Next Best Action]
        │
        ▼
[Multi-Factor Proof-of-Skill Verification]
        │
        ▼
[4-Tier Reachable Jobs & College Placement Integration]
```

---

## 2. Multi-Factor Career Readiness Formula

Career Readiness ($0-100\%$) provides students and recruiters with a realistic, un-gamed gauge of hiring preparedness for any specific role:

$$\text{Readiness} = (0.50 \cdot C_{\text{req}}) + (0.20 \cdot C_{\text{pref}}) + (0.15 \cdot P_{\text{bench}}) + (0.15 \cdot E_{\text{port}})$$

### Breakdown Components:
1. **Required Skills Coverage ($50\%$)**: Percentage of non-negotiable core role skills verified or mastered ($\ge 60$ confidence score).
2. **Preferred Skills Coverage ($20\%$)**: Percentage of bonus or specialized skills possessed.
3. **Proficiency Benchmark ($15\%$)**: Average confidence rating achieved across the verified skills.
4. **Portfolio & Project Evidence ($15\%$)**: Validated practical projects demonstrating tangible domain capability.

### Readiness Tiers:
- **Hiring Ready ($\ge 85\%$)**: Certified competency across core curriculum and portfolio projects.
- **Advanced Intermediate ($70-84\%$)**: Solid fundamentals with minor gaps in specialized tools.
- **Developing ($50-69\%$)**: Mid-way through structured career progression path.
- **Foundational ($< 50\%$)**: Early-stage student building baseline prerequisites.

---

## 3. Grounded AI Career Coach Integration

SkillBridge 3.0 pairs every student with an AI Career Coach powered by **Google Gemini 3.7 Flash** (`gemini-3.7-flash`):
- **Zero Hallucination Guardrails**: Prompts are strictly bound using candidate data wrappers and XML safety tags.
- **Grounding in Verifiable Facts**: The coach references the student's actual test scores, completed project deliverables, and specific DAG prerequisites.
- **Deterministic Fallback**: If network interruptions occur or Gemini API quotas are exhausted, the engine seamlessly falls back to deterministic rule-based advice without throwing user-facing errors.
