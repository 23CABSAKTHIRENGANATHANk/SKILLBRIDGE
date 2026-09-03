# SkillBridge Data Acquisition Report

**Report timestamp:** 2026-09-03

## A. Data sources discovered

| Source | Categories | URL | Terms/license status | Automation status |
|---|---|---|---|---|
| European Commission ESCO dataset | Career and skills taxonomy, relationships | https://esco.ec.europa.eu/en/use-esco/download | Public download; current package notice must be retained | Import after package download; no bypass of email/download flow |
| O*NET Resource Center | Career and skills taxonomy | https://www.onetcenter.org/database.html | Creative Commons database license | CSV/JSON import; current release URL recorded in source metadata |
| YouTube Data API v3 | YouTube learning resources | https://developers.google.com/youtube/v3/getting-started | YouTube API Services Terms and Developer Policies; API key required | Automated only when `YOUTUBE_API_KEY` is configured |
| Arbeitnow Job Board API | Job/opportunity data | https://www.arbeitnow.com/api/job-board-api | Public API terms require link-back; jobs update hourly | Automated JSON fetch with HTTPS and attribution |
| Remote OK API | Job/opportunity data | https://remoteok.com/api | API terms require link-back and source attribution | Automated JSON fetch with HTTPS and attribution |
| Provider-approved catalog import | Courses and project recommendations | https://github.com/freeCodeCamp/freeCodeCamp | License must be verified per record | Manual JSON import; no synthetic records |

## B. Legal and reliability decisions

Arbeitnow and Remote OK are used only through their documented public JSON endpoints, with rate limits respected. O*NET and ESCO are treated as licensed downloadable datasets and imported only after their current license/package notice is retained. YouTube uses the official API only; no page scraping, CAPTCHA bypass, private data, or unauthenticated search emulation is used. Course and project records without a verified provider/license remain manual-import-only.

## C. Data actually imported

No new records are claimed by this report. The pipeline now defaults to staging and requires provider files or configured APIs. Existing records from older migrations are legacy data and should be revalidated before production use; the recommendation service excludes records without a recent `last_verified_at` and `active = TRUE`.

## D. Run report fields

Each pipeline run reports staged, validated, rejected, duplicate, and promoted counts by category. A dry run never promotes production records. The current code has not fabricated replacement counts, URLs, courses, videos, projects, or jobs.

## E. Duplicate and invalid handling

Learning resources and projects are deduplicated by SHA-256 content hash and production identity. Jobs are deduplicated by source/external identifier and canonical URL. Required fields, HTTPS URLs, active source registration, and category-specific structure are validated in staging; rejected records retain a reason.

## F. Manual-import sources

Provider catalogues, ESCO packages requiring the provider download flow, and YouTube when no API key is available use `scripts/data/imports/` with the contract in `scripts/data/IMPORT_SCHEMA.md`. No restricted portal is scraped.

## G. Database tables affected

`data_source_registry`, `data_import_batches`, `staging_taxonomy_records`, `staging_learning_resources`, `staging_projects`, `staging_jobs`, `career_taxonomy`, `skills`, `skill_dependencies`, `learning_resources`, `project_recommendations`, and `jobs`. Migration `backend/database/migrate_v13.sql` adds provenance, freshness, and active-state controls.

## H. Refresh strategy

Jobs: daily, subject to each API's terms and rate limits. YouTube/provider resources: monthly or on provider change. ESCO/O*NET: on published release change. Before recommendation, resources/projects/jobs must be active and verified within 90 days; stale records are excluded, not silently reused.

## I. Pipeline

`SOURCE -> FETCH -> VALIDATE -> NORMALIZE -> DEDUPLICATE -> CLASSIFY -> MAP TO SKILLS -> QUALITY CHECK -> DATABASE SEED -> RECOMMENDATION ENGINE`

## J. Tests to perform

- `php -l` on all changed PHP files
- `npm run lint`
- `npx tsc --noEmit`
- Database migration in a non-production database
- `php scripts/data/pipeline_runner.php --dry-run`
- SQL assertions that no `pending`, rejected, unknown-source, insecure-URL, or stale record is promoted

The recommendation chain returns empty arrays/nulls when verified data is unavailable, preserving the required flow without fabricating content.
