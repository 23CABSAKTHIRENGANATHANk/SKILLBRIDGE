# SkillBridge 3.0 — Data Source Governance & Registry Specification

## 1. Executive Summary & Philosophy
SkillBridge 3.0 strictly mandates legitimate, legal, and ethical data acquisition. All career taxonomies, skill nodes, educational resources, project blueprints, and job listings originate from authorized open-data initiatives, official public APIs, or verified non-proprietary documentation.

**Core Principles:**
1. **Zero Scraping of Prohibited Platforms**: No web scraping of LinkedIn, Indeed, Glassdoor, or any platform with restrictive Terms of Service or anti-scraping protections.
2. **Zero Fabrication**: No synthetic courses, fake URLs, fake YouTube video IDs, or hallucinated hiring requirements.
3. **Registry-Driven Ingestion**: Every dataset ingested into SkillBridge must map to an active record in `data_source_registry` with license type, access method, endpoint URL, and verification timestamp.
4. **Isolated Staging**: External data is quarantined in staging tables (`staging_learning_resources`, `staging_projects`, `staging_jobs`) and validated against HTTPS, schema constraints, and quality scoring before promotion.

---

## 2. Master Data Source Registry

| Source ID | Provider / Organization | Access Method | Permitted Use & License | Verified Status |
|:---|:---|:---|:---|:---|
| `src_onet_esco` | European Commission (ESCO) / US Dept of Labor (O*NET) | Open Data Download / API | Open Government / CC BY 4.0 | Verified (`active`) |
| `src_official_docs` | MDN, Python, React, Go, Docker, PostgreSQL | Official Public Docs | Public Technical Reference | Verified (`active`) |
| `src_freecodecamp` | freeCodeCamp Open Curriculum | GitHub Open Data / REST API | BSD-3-Clause / CC BY-SA 4.0 | Verified (`active`) |
| `src_youtube_edu` | MIT OCW, Harvard CS50, freeCodeCamp, Traversy Media | YouTube Data API v3 (Read-Only) | YouTube Developer Terms of Service | Verified (`active`) |
| `src_github_projects` | GitHub Public Open Source Curricula | GitHub REST API v3 | MIT / Apache 2.0 / Public Domain | Verified (`active`) |
| `src_arbeitnow_jobs` | Arbeitnow Remote Job API | Public Developer REST API | Permitted API Developer Access | Verified (`active`) |
| `src_remoteok_jobs` | RemoteOK Opportunities API | Public Developer JSON Feed | Permitted Public Feed | Verified (`active`) |

---

## 3. Compliance & Security Boundaries

### 3.1 Network & Protocol Security
- **Strict HTTPS Protocol**: 100% of persisted resource URLs and video links must enforce HTTPS encryption. Non-HTTPS links are automatically rejected during staging validation.
- **SSRF Prevention**: All external HTTP requests initiated by collectors route through strict domain whitelists. Private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `169.254.169.254`) are blocked at network and application layers.

### 3.2 Terms of Service & Rate Limit Safeguards
- **Respect for `robots.txt`**: Automated collectors adhere to crawl delays and disallow directives.
- **No CAPTCHA Bypass**: SkillBridge services never attempt to solve, evade, or bypass CAPTCHA challenges or Cloudflare bot screens.
- **Exponential Backoff**: API connectors incorporate jittered exponential backoff (starting at 1.0s up to 60.0s) upon encountering HTTP 429 (Too Many Requests).

### 3.3 Data Freshness & Expiration Lifecycle
- **90-Day Freshness Window**: All resources and job postings maintain a `last_verified_at` timestamp.
- **Automated Quarantine**: Any resource unverified for >90 days is flagged as stale by `DataQualityService` and excluded from top recommendations until re-verified.
