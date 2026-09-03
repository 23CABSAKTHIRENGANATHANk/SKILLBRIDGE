# SkillBridge 3.0 — Proof-of-Skill Architecture & Verification Audit

**Generated**: 2026-09-04  
**Scope**: Skill Assessments, GitHub Proof-of-Work, Multi-Source Integrity Audits, and Cryptographic Skill Passports  
**Testing & Verification**: 100% Verified in `database-integration-test.php`, `phase2-passport-test.php`, and `phase2-proof-of-work-test.php`  

---

## 1. Proof-of-Skill Evidence Tier Hierarchy

SkillBridge 3.0 strictly classifies student skills into 4 deterministic verification tiers:

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Cryptographic Passport Verified (Score >= 80% + PoW) │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: Automated Assessment Passed (Score >= 70%)           │
├─────────────────────────────────────────────────────────────┤
│ Tier 3: Project / GitHub Code Evidence Attached              │
├─────────────────────────────────────────────────────────────┤
│ Tier 4: Self-Claimed Only (Unverified / Baseline)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Assessment Lifecycle & Anti-Tampering Engine

```
Student                          Assessment Controller                      PostgreSQL 16
   │                                       │                                      │
   ├─── GET /api/assessment ──────────────►│                                      │
   │    (skill_id)                         ├─── Generate questions & UUID ───────►│ (Insert skill_assessments
   │                                       │    (Set expires_at = now + 15m)      │  status = 'in_progress')
   │◄── Return questions (No answers) ─────┤                                      │
   │                                       │                                      │
   ├─── POST /api/assessment/submit ──────►│                                      │
   │    (attempt_id, answers)              ├─── Validate attempt expiration       │
   │                                       │    (If now > expires_at -> 400 Expired)
   │                                       ├─── Validate attempt ownership        │
   │                                       │    (If student_id != token -> 403)   │
   │                                       ├─── Compute score (0-100)             │
   │                                       ├─── Atomic UPDATE attempt ───────────►│ (Set score, status='completed')
   │                                       ├─── Update student_skills ───────────►│ (Set verified = TRUE if score >= 70)
   │◄── Return score, feedback & tier ─────┤                                      │
```

### Anti-Tampering & Security Audits
1. **Answer Replay Defense**: Once submitted, `status` flips to `completed`. Any subsequent POST with the same `attempt_id` is rejected (`400 Attempt already completed`).
2. **Client Score Injection Defense**: The client transmits only the candidate's selected answer IDs. All evaluation against the ground-truth answer key is executed server-side.
3. **Question Exposure Defense**: Ground truth correct answer indices are stripped from the `GET /api/assessment` response payload.

---

## 3. GitHub Proof-of-Work Engine (`ProofOfWorkService.php`)

| Metric / Signal | Data Source | Parsing & Validation Mechanism | Evidence Score Weight |
| :--- | :--- | :--- | :---: |
| **Repository Authenticity** | GitHub Public API / Scraper | Verifies repository exists, is public, and is not an empty fork. | 25% |
| **Language Distribution** | Git linguist file breakdown | Matches declared repository technologies against verified skills. | 35% |
| **Commit Velocity & History**| Commit timestamps & authors | Filters out single-commit repo dumps; verifies multi-day author commit activity. | 25% |
| **Documentation & README** | Markdown file presence | Checks for comprehensive README, architectural diagrams, and setup instructions. | 15% |

---

## 4. Cryptographic Skill Passport (`PassportCryptoService.php`)

```
Zero-PII Public Token Structure:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdGRfMTIzNDUiLCJza2lsbHMiOlt7InNsdWciOiJyZWFjdCIsImxldmVsIjoiYWR2YW5jZWQifV0sImlzcyI6IlNraWxsQnJpZGdlIiwiaWF0IjoxNzI1NDAxNjAwLCJleHAiOjE3NTY5Mzc2MDB9.SIGNATURE
```

- **HMAC SHA-256 Signature**: Each passport token is signed with the platform's private cryptographic key.
- **Zero-PII Disclosure**: Public passport lookups expose student UUID, verified skills, and project badges, but strictly omit email, phone number, physical address, and GPA.
- **Instant Revocation**: When an assessment is flagged for integrity violations, the passport record in `skill_passports` has `is_revoked = TRUE` set, instantly invalidating public QR scans.
- **Employer QR Verification**: Verified via standard camera or browser scan resolving `GET /api/passport/{token}`, returning real-time cryptographic validity.
