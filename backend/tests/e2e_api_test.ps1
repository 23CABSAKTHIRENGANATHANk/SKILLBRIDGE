# SkillBridge End-to-End API Test Suite
$ErrorActionPreference = "Stop"
$BaseUrl = "http://localhost:8000/api"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SKILLBRIDGE PRODUCTION API TEST SUITE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

function Assert-Success($name, $condition, $details = "") {
    if ($condition) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $name - $details" -ForegroundColor Red
    }
}

# 1. Health Probe
try {
    $h = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    Assert-Success "1. Health Endpoint" ($h.status -eq "healthy" -or $h.database -eq "connected")
} catch {
    Assert-Success "1. Health Endpoint" $false $_.Exception.Message
}

# 2. Ping Probe
try {
    $p = Invoke-RestMethod -Uri "$BaseUrl/ping" -Method Get
    Assert-Success "2. Ping Liveness Probe" ($p.status -eq "pong")
} catch {
    Assert-Success "2. Ping Liveness Probe" $false $_.Exception.Message
}

# 3. Student Registration
$rand = (Get-Random -Minimum 1000 -Maximum 9999)
$studentEmail = "test_student_$rand@skillbridge.dev"
$studentPass = "StrongPassword123!"
$studentToken = ""

try {
    $regBody = @{
        email = $studentEmail
        password = $studentPass
        name = "Arjun Test Kumar"
        role = "student"
        college = "Anna University"
        program = "B.Tech Computer Science"
    } | ConvertTo-Json
    
    $regRes = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json"
    $studentToken = $regRes.token
    Assert-Success "3. Student Registration" ($regRes.success -eq $true -and $studentToken.Length -gt 10)
} catch {
    Assert-Success "3. Student Registration" $false $_.Exception.Message
}

# 4. Student Login
try {
    $loginBody = @{
        email = $studentEmail
        password = $studentPass
    } | ConvertTo-Json
    
    $loginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $studentToken = $loginRes.token
    Assert-Success "4. Student Login" ($loginRes.success -eq $true -and $loginRes.user.role -eq "student")
} catch {
    Assert-Success "4. Student Login" $false $_.Exception.Message
}

# 5. Recruiter Registration
$recruiterEmail = "test_recruiter_$rand@techcorp.com"
$recruiterPass = "StrongRecruiter123!"
$recruiterToken = ""

try {
    $recBody = @{
        email = $recruiterEmail
        password = $recruiterPass
        name = "Priya Sharma"
        role = "recruiter"
        company_name = "AcroTech AI"
        industry = "Enterprise SaaS"
    } | ConvertTo-Json
    
    $recRes = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -Body $recBody -ContentType "application/json"
    $recruiterToken = $recRes.token
    Assert-Success "5. Recruiter Registration" ($recRes.success -eq $true -and $recRes.user.role -eq "recruiter")
} catch {
    Assert-Success "5. Recruiter Registration" $false $_.Exception.Message
}

# 6. Recruiter Updates Company Profile with Geocoding
try {
    $headers = @{ Authorization = "Bearer $recruiterToken" }
    $compBody = @{
        name = "AcroTech AI"
        industry = "Artificial Intelligence"
        address = "100 Feet Road, Indiranagar"
        city = "Bengaluru"
        state = "Karnataka"
        pincode = "560038"
        country = "India"
        about = "Building next-gen AI career matching systems."
    } | ConvertTo-Json

    $compRes = Invoke-RestMethod -Uri "$BaseUrl/companies/profile" -Method Post -Body $compBody -Headers $headers -ContentType "application/json"
    Assert-Success "6. Company Profile & Geocoding" ($compRes.success -eq $true)
} catch {
    Assert-Success "6. Company Profile & Geocoding" $false $_.Exception.Message
}

# 7. Recruiter Creates a Job
$createdJobId = ""
try {
    $headers = @{ Authorization = "Bearer $recruiterToken" }
    $jobBody = @{
        title = "AI Systems Engineer"
        summary = "Build scalable LLM inference pipelines and React dashboards."
        description = "We are seeking a talented full-stack engineer with React & Python skills."
        location = "Bengaluru, India (Hybrid)"
        type = "Full Time"
        salary_range = "₹16 LPA - ₹24 LPA"
        skills = @("React", "TypeScript", "Python", "Docker")
    } | ConvertTo-Json

    $jobRes = Invoke-RestMethod -Uri "$BaseUrl/jobs" -Method Post -Body $jobBody -Headers $headers -ContentType "application/json"
    $createdJobId = $jobRes.jobId
    Assert-Success "7. Job Creation with Skills" ($jobRes.success -eq $true -and $createdJobId.Length -gt 0)
} catch {
    Assert-Success "7. Job Creation with Skills" $false $_.Exception.Message
}

# 8. List Jobs (Public / Authenticated with match scores)
try {
    $headers = @{ Authorization = "Bearer $studentToken" }
    $jobsRes = Invoke-RestMethod -Uri "$BaseUrl/jobs" -Method Get -Headers $headers
    Assert-Success "8. Jobs Listing with Skill Matching" ($jobsRes.success -eq $true -and $jobsRes.jobs.Count -ge 1)
} catch {
    Assert-Success "8. Jobs Listing with Skill Matching" $false $_.Exception.Message
}

# 9. Student Applies to Job
$appId = ""
if ($createdJobId) {
    try {
        $headers = @{ Authorization = "Bearer $studentToken" }
        $appBody = @{ job_id = $createdJobId } | ConvertTo-Json
        $appRes = Invoke-RestMethod -Uri "$BaseUrl/applications/apply" -Method Post -Body $appBody -Headers $headers -ContentType "application/json"
        $appId = $appRes.applicationId
        Assert-Success "9. Student Job Application" ($appRes.success -eq $true -and $appId.Length -gt 0)
    } catch {
        Assert-Success "9. Student Job Application" $false $_.Exception.Message
    }

    # 10. Duplicate Application Guard (Expect 409 Conflict)
    try {
        $headers = @{ Authorization = "Bearer $studentToken" }
        $appBody = @{ job_id = $createdJobId } | ConvertTo-Json
        $dupRes = Invoke-RestMethod -Uri "$BaseUrl/applications/apply" -Method Post -Body $appBody -Headers $headers -ContentType "application/json"
        Assert-Success "10. Duplicate Application Guard (409)" $false "Allowed duplicate application!"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Assert-Success "10. Duplicate Application Guard (409)" ($statusCode -eq 409) "Got code: $statusCode"
    }
}

# 11. Recruiter Views Candidate Pipeline
try {
    $headers = @{ Authorization = "Bearer $recruiterToken" }
    $candRes = Invoke-RestMethod -Uri "$BaseUrl/applications/candidates" -Method Get -Headers $headers
    Assert-Success "11. Recruiter Candidates Pipeline" ($candRes.success -eq $true -and $candRes.candidates.Count -ge 1)
} catch {
    Assert-Success "11. Recruiter Candidates Pipeline" $false $_.Exception.Message
}

# 12. Recruiter Schedules Interview
$interviewId = ""
if ($appId) {
    try {
        $headers = @{ Authorization = "Bearer $recruiterToken" }
        $futureDate = (Get-Date).AddDays(3).ToString("yyyy-MM-dd HH:mm:ss")
        $intBody = @{
            application_id = $appId
            scheduled_at = $futureDate
            meeting_link = "https://meet.google.com/skillbridge-live-$rand"
            notes = "Pairing round on React hooks and API integration."
        } | ConvertTo-Json

        $intRes = Invoke-RestMethod -Uri "$BaseUrl/interviews/schedule" -Method Post -Body $intBody -Headers $headers -ContentType "application/json"
        $interviewId = $intRes.interview.id
        Assert-Success "12. Recruiter Schedules Interview" ($intRes.success -eq $true -and $interviewId.Length -gt 0)
    } catch {
        Assert-Success "12. Recruiter Schedules Interview" $false $_.Exception.Message
    }
}

# 13. Student Lists Interviews
try {
    $headers = @{ Authorization = "Bearer $studentToken" }
    $sIntRes = Invoke-RestMethod -Uri "$BaseUrl/interviews" -Method Get -Headers $headers
    Assert-Success "13. Student View Scheduled Interviews" ($sIntRes.success -eq $true)
} catch {
    Assert-Success "13. Student View Scheduled Interviews" $false $_.Exception.Message
}

# 14. Recruiter Updates Candidate Stage
if ($appId) {
    try {
        $headers = @{ Authorization = "Bearer $recruiterToken" }
        $stBody = @{
            application_id = $appId
            stage = "offer"
            notes = "Excellent technical demo. Extended formal offer."
        } | ConvertTo-Json

        $stRes = Invoke-RestMethod -Uri "$BaseUrl/applications/stage" -Method Put -Body $stBody -Headers $headers -ContentType "application/json"
        Assert-Success "14. Recruiter Stage Transition (Offer)" ($stRes.success -eq $true)
    } catch {
        Assert-Success "14. Recruiter Stage Transition (Offer)" $false $_.Exception.Message
    }
}

# 15. Student Checks Real Notifications
try {
    $headers = @{ Authorization = "Bearer $studentToken" }
    $notifRes = Invoke-RestMethod -Uri "$BaseUrl/notifications" -Method Get -Headers $headers
    Assert-Success "15. Notifications Generated" ($notifRes.success -eq $true -and $notifRes.notifications.Count -ge 1)
} catch {
    Assert-Success "15. Notifications Generated" $false $_.Exception.Message
}

# 16. AI Resume Summary
try {
    $headers = @{ Authorization = "Bearer $studentToken" }
    $aiRes = Invoke-RestMethod -Uri "$BaseUrl/ai/resume-summary" -Method Post -Body "{}" -Headers $headers -ContentType "application/json"
    Assert-Success "16. AI Resume Summary & ATS Score" ($aiRes.success -eq $true -and $aiRes.resume_analysis.headline.Length -gt 0)
} catch {
    Assert-Success "16. AI Resume Summary & ATS Score" $false $_.Exception.Message
}

# 17. AI Match Explanation
if ($createdJobId) {
    try {
        $headers = @{ Authorization = "Bearer $studentToken" }
        $aiMatchBody = @{ job_id = $createdJobId } | ConvertTo-Json
        $aiMatchRes = Invoke-RestMethod -Uri "$BaseUrl/ai/match-explain" -Method Post -Body $aiMatchBody -Headers $headers -ContentType "application/json"
        Assert-Success "17. AI Candidate-Job Match Explanation" ($aiMatchRes.success -eq $true -and $aiMatchRes.explanation.verdict.Length -gt 0)
    } catch {
        Assert-Success "17. AI Candidate-Job Match Explanation" $false $_.Exception.Message
    }
}

# 18. AI Job Recommendations
try {
    $headers = @{ Authorization = "Bearer $studentToken" }
    $aiRecs = Invoke-RestMethod -Uri "$BaseUrl/ai/recommendations" -Method Get -Headers $headers
    Assert-Success "18. AI Personalized Job Recommendations" ($aiRecs.success -eq $true)
} catch {
    Assert-Success "18. AI Personalized Job Recommendations" $false $_.Exception.Message
}

# 19. AI Recruiter Insights
try {
    $headers = @{ Authorization = "Bearer $recruiterToken" }
    $aiInsights = Invoke-RestMethod -Uri "$BaseUrl/ai/recruiter-insights" -Method Get -Headers $headers
    Assert-Success "19. AI Recruiter Pipeline Insights" ($aiInsights.success -eq $true -and $aiInsights.insights.pipeline_health.Length -gt 0)
} catch {
    Assert-Success "19. AI Recruiter Pipeline Insights" $false $_.Exception.Message
}

# 20. OpenAPI Swagger Spec Route
try {
    $spec = Invoke-RestMethod -Uri "$BaseUrl/openapi.yaml" -Method Get
    Assert-Success "20. OpenAPI 3.1 Documentation Route" ($spec.Length -gt 500)
} catch {
    Assert-Success "20. OpenAPI 3.1 Documentation Route" $false $_.Exception.Message
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "E2E API TEST SUITE FINISHED" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
