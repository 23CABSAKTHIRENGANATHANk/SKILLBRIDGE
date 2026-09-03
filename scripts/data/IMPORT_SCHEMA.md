# Data import contract

Place provider-supplied files in `scripts/data/imports/` before a staging run. The pipeline reads JSON only and never treats these templates as production data.

## `taxonomy.json`

```json
{"skills":[{"id":"provider-skill-id","name":"Provider skill name","summary":"Provider-supplied summary","category":"category"}],"careers":[{"id":"provider-career-id","name":"Provider career name","summary":"Provider-supplied summary","category":"category"}]}
```

## `learning_resources.json`

An array of objects with `source_id`, `skill`, `title`, `provider`, `resource_type`, `level`, `url`, `summary`, `duration`, and `is_free`. YouTube records must come from the YouTube Data API or a provider-approved feed and retain the canonical URL.

## `projects.json`

An array of objects with `source_id`, `skill`, `title`, `description`, `deliverables`, `tech_stack`, `difficulty`, `repo_template_url`, and `estimated_hours`. A project must be an actual provider-approved blueprint or a record with a verified open-source license.

Files are fetched or supplied into staging, validated for HTTPS URLs and required fields, deduplicated by content hash, then promoted only by an explicit non-dry-run pipeline execution. Do not place resumes, emails, phone numbers, or other personal data in these files.
