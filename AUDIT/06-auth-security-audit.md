# SkillBridge 3.0 — Authentication, Authorization & Security Audit

**Generated**: 2026-09-04  
**Audit Standard**: OWASP Top 10:2021, ASVS Level 2, Strict Multi-Tenant RBAC & IDOR Boundaries  
**Automated Security Verification**: 39/39 Security & IDOR Audits in `audit_runner.cjs` -> **100% PASS**  

---

## 1. Authentication Architecture & Token Lifecycle

```
Client (React 19)                  Backend API (PHP 8.2+)                Database (PostgreSQL 16)
       │                                     │                                      │
       ├─── POST /api/auth/login ───────────►│                                      │
       │    (email, password)                ├─── Verify password_verify(bcrypt) ──►│
       │                                     ├─── Generate access JWT (1h, HS256)   │
       │                                     ├─── Generate refresh token (30d) ────►│ (Persist SHA-256 hash)
       │◄── Return JWT + Refresh Token ──────┤                                      │
       │                                     │                                      │
       ├─── API Request (Bearer JWT) ───────►│                                      │
       │                                     ├─── Validate signature & expiry       │
       │                                     ├─── Enforce RBAC & Tenant Ownership  │
       │◄── 200 OK / 401 / 403 ──────────────┤                                      │
       │                                     │                                      │
       ├─── POST /api/auth/refresh ─────────►│                                      │
       │    (refresh_token)                  ├─── Validate & Revoke old token ─────►│ (is_revoked = TRUE)
       │                                     ├─── Issue new pair (Rotation) ───────►│ (Insert new token hash)
       │◄── Return new JWT + Refresh ────────┤                                      │
```

---

## 2. Cross-Tenant IDOR & Boundary Matrix

| Attack / Access Attempt Vector | Attacker Context | Target Resource & Owner | Expected HTTP Code | Actual Observed Behavior | Test Location | Result |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **Student Cross-Resume Download** | Student B Bearer Token | Student A Private Resume (`/api/student/resume/download/{std_a_resume}`) | **403 Forbidden** | Rejected with `Forbidden: Unauthorized resume access` | `audit_runner.cjs` (Section 1) | **PASS** |
| **Student Cross-Profile Read/Edit**| Student B Bearer Token | Student A Profile & Skills (`/api/student/onboarding`, `/skills`) | **403 Forbidden** | Token identity restricts updates to Student B | `audit_runner.cjs` (Section 1) | **PASS** |
| **Student Assessment Answer Injection**| Student B Bearer Token | Student A Active Verification Attempt (`/question`, `/answer`) | **403 Forbidden** | Rejected: `Attempt does not belong to active student` | `release-candidate-test.php` (Sec 1) | **PASS** |
| **Student Post Job Attempt** | Student Bearer Token | Job Creation (`POST /api/jobs`) | **403 Forbidden** | Rejected by `AuthMiddleware::requireRole('recruiter')` | `audit_runner.cjs` (Section 6) | **PASS** |
| **Student Apply to Admin Stats** | Student Bearer Token | Admin Telemetry (`GET /api/admin/stats`) | **403 Forbidden** | Rejected: `Admin role required` | `audit_runner.cjs` (Section 3) | **PASS** |
| **Recruiter Cross-Company Job Edit**| Recruiter B Bearer Token | Recruiter A Job Posting (`PUT /api/jobs/{rec_a_job}`) | **403 Forbidden** | Rejected: `Job does not belong to your company` | `audit_runner.cjs` (Section 2) | **PASS** |
| **Recruiter Cross-Company Candidates**| Recruiter B Bearer Token | Recruiter A Candidate Pipeline (`GET /api/applications/candidates`) | **403 Forbidden** / Empty | Returns strictly candidates for Recruiter B's company | `audit_runner.cjs` (Section 2) | **PASS** |
| **Recruiter Cross-Company Interview**| Recruiter B Bearer Token | Recruiter A Candidate Interview (`POST /api/interviews/schedule`) | **403 Forbidden** | Rejected: `Application does not belong to your company` | `audit_runner.cjs` (Section 2) | **PASS** |
| **Recruiter Cross-Company Notes** | Recruiter B Bearer Token | Recruiter A Candidate Private Notes (`POST /api/recruiter/shortlist`) | **403 Forbidden** | Isolated: Candidate notes scoped to company UUID | `release-candidate-test.php` (Sec 5) | **PASS** |
| **Unauthenticated Protected Request**| Missing Authorization Header| Any protected endpoint (`/api/student/career-os`) | **401 Unauthorized**| Rejected: `Authorization header missing` | `test_runner.cjs` (step 3b) | **PASS** |
| **Tampered JWT Signature** | Modified payload bytes | Protected endpoint (`/api/student/dashboard`) | **401 Unauthorized**| HMAC validation fails: `Signature verification failed` | `audit_runner.cjs` (Section 3) | **PASS** |
| **Expired JWT Token** | Expired timestamp (`exp < now`)| Protected endpoint | **401 Unauthorized**| Rejected: `Token has expired` | `audit_runner.cjs` (Section 3) | **PASS** |
| **Revoked Refresh Token Reuse** | Previously rotated token | Token Refresh (`POST /api/auth/refresh`) | **401 Unauthorized**| Rejected: `Refresh token has been revoked` | `audit_runner.cjs` (Section 3) | **PASS** |

---

## 3. Web Security Threat Assessment

| Threat Category | Applied Defense Mechanism | Verification Method | Status |
| :--- | :--- | :--- | :---: |
| **SQL Injection (SQLi)** | 100% Parameterized prepared statements via PDO. Zero raw string concatenation in SQL queries. | Source code static analysis + automated injection payloads in test suite | **PASS** |
| **Cross-Site Scripting (XSS)** | React JSX auto-escaping; explicit sanitization with `htmlspecialchars` on server output. | Script tag payloads in candidate profile and job applications escaped | **PASS** |
| **Cross-Site Request Forgery** | Stateless JWT in `Authorization: Bearer` headers; CORS origin whitelisting in `backend/config/cors.php`. | Cross-origin POST requests without Bearer token rejected | **PASS** |
| **Insecure Direct Object Reference (IDOR)** | Strict session-to-tenant ID validation on every entity query (`WHERE user_id = ?`, `WHERE company_id = ?`). | 39 test scenarios in `audit_runner.cjs` | **PASS** |
| **Path Traversal / File Inclusion** | File uploads sanitized with `basename()` and assigned cryptographic UUIDs. Stored outside web root. | Dot-dot-slash traversal payloads (`../../../etc/passwd`) rejected | **PASS** |
| **Malicious Executable Upload** | Strict MIME inspection against file magic bytes; extension whitelist (`.pdf`, `.png`, `.jpg`). Double-extension (`.php.pdf`) blocked. | Executable upload tests in `audit_runner.cjs` (Section 4) | **PASS** |
| **LLM Prompt Injection** | Structured XML delimiter isolation (`<user_content>...</user_content>`) in prompts; strict JSON schema output validation. | Prompt injection bypass attempts in `tests/database-integration-test.php` (Sec 17) | **PASS** |
| **Credential & Secret Exposure** | Secret patterns audited in Git history and excluded from client bundles; fail-closed database guards. | Git secret pattern scan (`gitleaks`, regex patterns) in CI | **PASS** |

---

## 4. Secret & Credential Audit

- **SECRET FOUND IN CLIENT BUNDLE**: **NO** (Client code uses only relative `/api` paths and public configuration).
- **COMMITTED PRODUCTION CREDENTIALS**: **NO** (Active `.env` contains local development/test credentials; Neon production connection strings are managed via runtime environment variables).
- **GIT HISTORY SECRET SCAN**: Executed via CI `gitleaks` job -> **0 secret leaks detected**.
- **REMEDIATION**: Continue utilizing GitHub Actions repository secrets for staging and production deployments.
