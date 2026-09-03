$ErrorActionPreference = "Stop"

$composeFile = Join-Path $PSScriptRoot "..\docker-compose.test.yml"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path
$env:APP_ENV = "testing"
$env:TEST_DATABASE_URL = "postgresql://skillbridge_test:skillbridge_test_password@127.0.0.1:55432/skillbridge_test?sslmode=disable"

Push-Location $root
try {
    docker compose -f $composeFile up -d --wait
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to start isolated PostgreSQL test container."
    }
    php backend/database/migrate.php --reset --seed
    if ($LASTEXITCODE -ne 0) {
        throw "Database migration/bootstrap failed."
    }
    php scripts/data/bootstrap_test_catalog.php
    if ($LASTEXITCODE -ne 0) {
        throw "Career Intelligence catalog bootstrap failed."
    }
    php tests/career-intelligence-test.php
    if ($LASTEXITCODE -ne 0) {
        throw "Career Intelligence integration tests failed."
    }
    php tests/database-integration-test.php
    if ($LASTEXITCODE -ne 0) {
        throw "Database integration tests failed."
    }
    php tests/http-database-integration-test.php
    if ($LASTEXITCODE -ne 0) {
        throw "HTTP database integration tests failed."
    }
    php tests/personal-career-os-test.php
    if ($LASTEXITCODE -ne 0) {
        throw "Personal Career OS integration tests failed."
    }
    php tests/test-evolution-loop.php
    if ($LASTEXITCODE -ne 0) {
        throw "Evolution loop integration tests failed."
    }
} finally {
    docker compose -f $composeFile down -v
    Pop-Location
}
