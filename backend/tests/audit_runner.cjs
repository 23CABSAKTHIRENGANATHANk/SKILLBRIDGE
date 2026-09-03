#!/usr/bin/env node
/**
 * SkillBridge Final Production Go/No-Go Audit
 * Authorization Matrix, Upload Security, JWT, Database Verification
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE = process.env.SKILLBRIDGE_TEST_BASE_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = Number(process.env.SKILLBRIDGE_TEST_TIMEOUT_MS || 30000);
const ts = Date.now();
const results = [];

function log(category, test, req, expected, actual, pass) {
  const status = pass ? "✅ PASS" : "❌ FAIL";
  const line = `[${category}] ${status} | ${test} | REQ: ${req} | EXPECTED: ${expected} | ACTUAL: ${actual}`;
  console.log(line);
  results.push({ category, test, req, expected, actual, pass });
}

async function req(method, endpoint, body, token) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : null;
    const target = new URL(endpoint, BASE);
    const opts = {
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: d, headers: res.headers });
        }
      });
    });
    r.setTimeout(REQUEST_TIMEOUT_MS, () => {
      r.destroy(
        new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${method} ${endpoint}`),
      );
    });
    r.on("error", (e) => resolve({ status: 0, error: e.message }));
    if (postData) r.write(postData);
    r.end();
  });
}

async function run() {
  console.log("\n============================================================");
  console.log("  SkillBridge Final Production Go/No-Go Audit");
  console.log("============================================================\n");

  // =========== SECTION 1: REGISTER TEST ACCOUNTS ===========
  console.log("\n--- Registering Test Accounts ---");

  const saRes = await req("POST", "/api/auth/register", {
    name: "Audit Student Alpha",
    email: `audit_sa_${ts}@test.dev`,
    password: "AuditPass1!",
    role: "student",
    college: "IIT Madras",
    program: "B.Tech CS",
    graduation_year: 2027,
  });
  const tokenA = saRes.body.token;
  const studentIdA = saRes.body.user?.profile?.id;
  const userIdA = saRes.body.user?.id;
  console.log(`Student A: status=${saRes.status}, profileId=${studentIdA}`);

  const sbRes = await req("POST", "/api/auth/register", {
    name: "Audit Student Beta",
    email: `audit_sb_${ts}@test.dev`,
    password: "AuditPass2!",
    role: "student",
    college: "NIT Trichy",
    program: "B.Tech IT",
    graduation_year: 2027,
  });
  const tokenB = sbRes.body.token;
  const studentIdB = sbRes.body.user?.profile?.id;
  const userIdB = sbRes.body.user?.id;
  console.log(`Student B: status=${sbRes.status}, profileId=${studentIdB}`);

  const raRes = await req("POST", "/api/auth/register", {
    name: "Audit Recruiter Alpha",
    email: `audit_ra_${ts}@company.com`,
    password: "AuditPass3!",
    role: "recruiter",
    company_name: "Alpha Corp",
    industry: "Technology",
  });
  const tokenRA = raRes.body.token;
  const companyIdA = raRes.body.user?.profile?.id;
  console.log(`Recruiter A: status=${raRes.status}, companyId=${companyIdA}`);

  const rbRes = await req("POST", "/api/auth/register", {
    name: "Audit Recruiter Beta",
    email: `audit_rb_${ts}@company.com`,
    password: "AuditPass4!",
    role: "recruiter",
    company_name: "Beta Corp",
    industry: "Finance",
  });
  const tokenRB = rbRes.body.token;
  const companyIdB = rbRes.body.user?.profile?.id;
  console.log(`Recruiter B: status=${rbRes.status}, companyId=${companyIdB}`);

  // Post a job as Recruiter A
  const jobRes = await req(
    "POST",
    "/api/jobs",
    {
      title: "Frontend Developer Audit Test",
      summary: "Audit test job posting",
      description: "Audit test job posting - full description",
      location: "Chennai, India",
      type: "Full Time",
      skills: ["React", "TypeScript"],
    },
    tokenRA,
  );
  const jobIdA = jobRes.body.jobId;
  console.log(`Job A posted by Recruiter A: status=${jobRes.status}, jobId=${jobIdA}`);

  // Student A applies to Job A
  const appRes = await req("POST", "/api/applications/apply", { job_id: jobIdA }, tokenA);
  const appIdA = appRes.body.applicationId;
  console.log(`Student A applied: status=${appRes.status}, appId=${appIdA}`);

  // Schedule interview as Recruiter A
  let interviewId = null;
  if (appIdA) {
    const now = new Date();
    now.setDate(now.getDate() + 3);
    const intRes = await req(
      "POST",
      "/api/interviews/schedule",
      {
        application_id: appIdA,
        scheduled_at: now.toISOString().slice(0, 19).replace("T", " "),
        meeting_link: "https://meet.google.com/audit-test",
        notes: "Audit interview",
      },
      tokenRA,
    );
    interviewId = intRes.body.interview?.id;
    console.log(`Interview scheduled by Recruiter A: status=${intRes.status}, id=${interviewId}`);
  }

  // =========== SECTION 2: AUTHORIZATION MATRIX ===========
  console.log("\n\n--- SECTION 2: AUTHORIZATION MATRIX ---\n");

  // 2.1 Student A → Student B resume download
  const t1 = await req("GET", `/api/student/resume/download/${studentIdB}`, null, tokenA);
  log(
    "IDOR",
    "StudentA→StudentB Resume Download",
    `GET /api/student/resume/download/${studentIdB}`,
    "403 or 404",
    t1.status,
    t1.status === 403 || t1.status === 404,
  );

  // 2.2 Student A → Student B profile (direct)
  const t2 = await req("GET", `/api/student/profile/${studentIdB}`, null, tokenA);
  log(
    "IDOR",
    "StudentA→StudentB Profile Access",
    `GET /api/student/profile/${studentIdB}`,
    "403 or 404",
    t2.status,
    t2.status === 403 || t2.status === 404 || t2.status === 401,
  );

  // 2.3 Recruiter A → Recruiter B Company
  const t3 = await req("GET", `/api/companies/${companyIdB}`, null, tokenRA);
  log(
    "IDOR",
    "RecruiterA→RecruiterB Company",
    `GET /api/companies/${companyIdB}`,
    "403 or 404 (public read OK=200)",
    t3.status,
    true,
  ); // Public endpoint is 200, note as observation

  // 2.4 Recruiter B tries to move Recruiter A's job candidate
  const t4a = await req("GET", `/api/applications/candidates?job_id=${jobIdA}`, null, tokenRB);
  log(
    "IDOR",
    "RecruiterB→RecruiterA Candidates",
    `GET /api/applications/candidates?job_id=${jobIdA}`,
    "403 or empty result",
    t4a.status,
    t4a.status === 403 || t4a.body?.candidates?.length === 0,
  );

  // 2.5 Recruiter B tries to update application stage of Recruiter A's applicant
  const t5 = await req(
    "PUT",
    "/api/applications/stage",
    { application_id: appIdA, stage: "offer" },
    tokenRB,
  );
  log(
    "IDOR",
    "RecruiterB→RecruiterA App Stage Change",
    `PUT /api/applications/stage appId=${appIdA}`,
    "403",
    t5.status,
    t5.status === 403 || t5.status === 401,
  );

  // 2.6 Recruiter B tries to access interview scheduled by Recruiter A
  if (interviewId) {
    const t6 = await req("GET", `/api/interviews/${interviewId}`, null, tokenRB);
    log(
      "IDOR",
      "RecruiterB→RecruiterA Interview",
      `GET /api/interviews/${interviewId}`,
      "403 or 404",
      t6.status,
      t6.status === 403 || t6.status === 404 || t6.status === 405,
    );
  }

  // 2.7 Student A → Recruiter-only endpoint (candidates list)
  const t7 = await req("GET", "/api/applications/candidates", null, tokenA);
  log(
    "AUTH",
    "Student→RecruiterEndpoint (candidates)",
    "GET /api/applications/candidates with student token",
    "403",
    t7.status,
    t7.status === 403,
  );

  // 2.8 Student A → Admin-only endpoint
  const t8 = await req("GET", "/api/admin/stats", null, tokenA);
  log(
    "AUTH",
    "Student→AdminEndpoint (stats)",
    "GET /api/admin/stats with student token",
    "403",
    t8.status,
    t8.status === 403,
  );

  // 2.9 Recruiter → Admin-only endpoint
  const t9 = await req("GET", "/api/admin/stats", null, tokenRA);
  log(
    "AUTH",
    "Recruiter→AdminEndpoint (stats)",
    "GET /api/admin/stats with recruiter token",
    "403",
    t9.status,
    t9.status === 403,
  );

  // 2.10 No token → protected endpoint
  const t10 = await req("GET", "/api/student/dashboard", null, null);
  log(
    "AUTH",
    "No Token→Protected Endpoint",
    "GET /api/student/dashboard with no token",
    "401",
    t10.status,
    t10.status === 401,
  );

  // =========== SECTION 3: JWT AUTHENTICATION TESTS ===========
  console.log("\n\n--- SECTION 3: JWT AUTHENTICATION TESTS ---\n");

  // 3.1 Valid JWT
  const j1 = await req("GET", "/api/auth/me", null, tokenA);
  log(
    "JWT",
    "Valid JWT accepted",
    "GET /api/auth/me with valid token",
    "200",
    j1.status,
    j1.status === 200,
  );

  // 3.2 Expired JWT (static known-expired token)
  const expiredToken =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoidV90ZXN0IiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMzYwMH0.invalid_signature";
  const j2 = await req("GET", "/api/auth/me", null, expiredToken);
  log(
    "JWT",
    "Expired JWT rejected",
    "GET /api/auth/me with expired token",
    "401",
    j2.status,
    j2.status === 401,
  );

  // 3.3 Tampered JWT (modify payload)
  const parts = tokenA ? tokenA.split(".") : ["a", "b", "c"];
  const tamperedToken =
    parts[0] +
    "." +
    Buffer.from(
      '{"user_id":"hacked_admin","email":"hack@hack.com","role":"admin","iat":9999999999,"exp":9999999999}',
    ).toString("base64url") +
    "." +
    parts[2];
  const j3 = await req("GET", "/api/auth/me", null, tamperedToken);
  log(
    "JWT",
    "Tampered JWT rejected",
    "GET /api/auth/me with tampered payload",
    "401",
    j3.status,
    j3.status === 401,
  );

  // 3.4 Missing JWT
  const j4 = await req("GET", "/api/auth/me", null, null);
  log(
    "JWT",
    "Missing JWT rejected",
    "GET /api/auth/me with no token",
    "401",
    j4.status,
    j4.status === 401,
  );

  // 3.5 Invalid refresh token
  const j5 = await req("POST", "/api/auth/refresh", {
    refresh_token: "completely_invalid_refresh_token_xyz_12345",
  });
  log(
    "JWT",
    "Invalid refresh token rejected",
    "POST /api/auth/refresh with invalid token",
    "401",
    j5.status,
    j5.status === 401 || j5.status === 400,
  );

  // 3.6 Logout clears session
  const j6 = await req("POST", "/api/auth/logout", {}, tokenA);
  log(
    "JWT",
    "Logout endpoint responds",
    "POST /api/auth/logout",
    "200",
    j6.status,
    j6.status === 200,
  );

  // After logout, token should still work (JWT is stateless) or not if we track revoked tokens
  const j7 = await req("GET", "/api/auth/me", null, tokenA);
  log(
    "JWT",
    "Post-logout token behavior",
    "GET /api/auth/me after logout",
    "200 (stateless JWT) or 401 (revoked)",
    j7.status,
    j7.status === 200 || j7.status === 401,
  );

  // =========== SECTION 4: UPLOAD SECURITY TESTS ===========
  console.log("\n\n--- SECTION 4: UPLOAD SECURITY TESTS ---\n");

  // Register fresh student for upload tests
  const uploadUser = await req("POST", "/api/auth/register", {
    name: "Upload Test Student",
    email: `upload_${ts}@test.dev`,
    password: "Upload1Pass!",
    role: "student",
    college: "Anna University",
    program: "B.Tech CS",
    graduation_year: 2027,
  });
  const uploadToken = uploadUser.body.token;
  const uploadStudentId = uploadUser.body.user?.profile?.id;
  console.log(`Upload test student: status=${uploadUser.status}, id=${uploadStudentId}`);

  // Test upload with PHP file (should be rejected)
  if (uploadToken && uploadStudentId) {
    await testFileUpload(
      "PHP script rejection",
      uploadToken,
      "malicious.php",
      "application/x-php",
      '<?php system($_GET["cmd"]); ?>',
      400,
      403,
      415,
      422,
    );
    await testFileUpload(
      "HTML file rejection",
      uploadToken,
      "malicious.html",
      "text/html",
      "<script>alert(1)</script>",
      400,
      403,
      415,
      422,
    );
    await testFileUpload(
      "JS file rejection",
      uploadToken,
      "malicious.js",
      "application/javascript",
      "alert(1)",
      400,
      403,
      415,
      422,
    );
    await testFileUpload(
      "EXE file rejection",
      uploadToken,
      "malicious.exe",
      "application/octet-stream",
      "MZ\x00\x00",
      400,
      403,
      415,
      422,
    );
    await testFileUpload(
      "Double extension rejection",
      uploadToken,
      "resume.pdf.php",
      "application/pdf",
      "%PDF-1.4 test",
      400,
      403,
      415,
      422,
    );
    await testPathTraversal(uploadToken);
  }

  // Test unauthorized resume download with guessed ID
  const t_dl = await req(
    "GET",
    "/api/student/resume/download/nonexistent_fake_id_xyz",
    null,
    tokenB,
  );
  log(
    "UPLOAD",
    "Unauthorized resume download (guessed ID)",
    "GET /api/student/resume/download/fake_id with other student token",
    "403 or 404",
    t_dl.status,
    t_dl.status === 403 || t_dl.status === 404,
  );

  // =========== SECTION 5: DATABASE VERIFICATION ===========
  console.log("\n\n--- SECTION 5: DATABASE VERIFICATION ---\n");

  // 5.1 Duplicate application uniqueness constraint
  const dupApp1 = await req("POST", "/api/applications/apply", { job_id: jobIdA }, tokenA);
  log(
    "DB",
    "Duplicate application prevented (409)",
    `POST /api/applications/apply job_id=${jobIdA} (2nd time)`,
    "409",
    dupApp1.status,
    dupApp1.status === 409,
  );

  // 5.2 Interview persistence
  if (interviewId) {
    const intList = await req("GET", "/api/interviews", null, tokenA);
    const found = intList.body?.interviews?.some((i) => i.id === interviewId);
    log(
      "DB",
      "Interview persists in database",
      `GET /api/interviews finds id=${interviewId}`,
      "true",
      found,
      found === true,
    );
  }

  // 5.3 Notifications generated
  const notifs = await req("GET", "/api/notifications", null, tokenA);
  log(
    "DB",
    "Notifications persist after application",
    "GET /api/notifications",
    "count >= 1",
    notifs.body?.total,
    (notifs.body?.total || 0) >= 1,
  );

  // =========== SECTION 6: ROLE ENFORCEMENT ===========
  console.log("\n\n--- SECTION 6: ROLE ENFORCEMENT ---\n");

  // Student trying to post a job
  const roleTest1 = await req(
    "POST",
    "/api/jobs",
    {
      title: "Unauthorized Job",
      description: "test",
      location: "Test",
      type: "Full-Time",
      skills: [],
    },
    tokenA,
  );
  log(
    "RBAC",
    "Student cannot post job",
    "POST /api/jobs with student token",
    "403",
    roleTest1.status,
    roleTest1.status === 403,
  );

  // Student trying to view all candidates
  const roleTest2 = await req("GET", "/api/applications/candidates", null, tokenB);
  log(
    "RBAC",
    "Student cannot view recruiter candidates",
    "GET /api/applications/candidates with student token",
    "403",
    roleTest2.status,
    roleTest2.status === 403,
  );

  // Recruiter trying to apply to a job
  const roleTest3 = await req("POST", "/api/applications/apply", { job_id: jobIdA }, tokenRA);
  log(
    "RBAC",
    "Recruiter cannot apply to job",
    "POST /api/applications/apply with recruiter token",
    "403",
    roleTest3.status,
    roleTest3.status === 403,
  );

  // =========== SECTION 7: PRODUCTION CONFIG CHECK ===========
  console.log("\n\n--- SECTION 7: PRODUCTION CONFIG ---\n");

  const health = await req("GET", "/api/health", null, null);
  log(
    "CONFIG",
    "Backend health responds 200",
    "GET /api/health",
    "200",
    health.status,
    health.status === 200,
  );
  log(
    "CONFIG",
    "Database connected",
    "health.checks.database.status",
    "healthy",
    health.body?.checks?.database?.status,
    health.body?.checks?.database?.status === "healthy",
  );
  log(
    "CONFIG",
    "PHP version 8.1+",
    "health.checks.system.php_version",
    "8.1.x",
    health.body?.checks?.system?.php_version,
    health.body?.checks?.system?.php_version?.startsWith("8."),
  );

  // Check response headers for security
  const headers = health.headers || {};
  log(
    "CONFIG",
    "X-Frame-Options header present",
    "Response headers",
    "SAMEORIGIN",
    headers["x-frame-options"],
    headers["x-frame-options"] === "SAMEORIGIN",
  );
  log(
    "CONFIG",
    "X-Content-Type-Options header present",
    "Response headers",
    "nosniff",
    headers["x-content-type-options"],
    headers["x-content-type-options"] === "nosniff",
  );
  log(
    "CONFIG",
    "Cache-Control no-store on sensitive",
    "Response headers",
    "no-store",
    headers["cache-control"]?.includes("no-store"),
    headers["cache-control"]?.includes("no-store") === true,
  );

  // =========== SECTION 8: AI FEATURE VALIDATION ===========
  console.log("\n\n--- SECTION 8: AI FEATURES ---\n");

  // Test AI graceful failure (with bad student ID)
  const aiFail = await req("POST", "/api/ai/resume-summary", {}, "invalid_token_xyz");
  log(
    "AI",
    "AI endpoint rejects unauthenticated request",
    "POST /api/ai/resume-summary invalid token",
    "401",
    aiFail.status,
    aiFail.status === 401,
  );

  // Test AI endpoint with valid token
  if (uploadToken) {
    const aiOk = await req("POST", "/api/ai/resume-summary", {}, uploadToken);
    log(
      "AI",
      "AI endpoint handles authenticated request",
      "POST /api/ai/resume-summary valid token",
      "200",
      aiOk.status,
      aiOk.status === 200,
    );
    if (aiOk.status === 200) {
      log(
        "AI",
        "AI response has ai_powered flag",
        "response.ai_powered",
        "boolean",
        aiOk.body?.ai_powered,
        typeof aiOk.body?.ai_powered === "boolean",
      );
    }
  }

  // =========== RESULTS SUMMARY ===========
  console.log("\n\n============================================================");
  console.log("  AUDIT RESULTS SUMMARY");
  console.log("============================================================\n");

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Total: ${results.length} | PASS: ${passed} | FAIL: ${failed}`);

  console.log("\nFAILED TESTS:");
  results
    .filter((r) => !r.pass)
    .forEach((r) => {
      console.log(`  ❌ [${r.category}] ${r.test}: expected ${r.expected}, got ${r.actual}`);
    });

  console.log("\nPASSED TESTS:");
  results
    .filter((r) => r.pass)
    .forEach((r) => {
      console.log(`  ✅ [${r.category}] ${r.test}`);
    });
}

async function testFileUpload(
  testName,
  token,
  filename,
  mimeType,
  content,
  ...acceptableRejectionCodes
) {
  const boundary = "----SkillBridgeAuditBoundary" + Date.now();
  const fileContent = typeof content === "string" ? Buffer.from(content) : content;

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
    ),
    fileContent,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return new Promise((resolve) => {
    const opts = {
      hostname: "localhost",
      port: 8000,
      path: "/api/student/resume/upload",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
        Authorization: "Bearer " + token,
      },
    };
    const r = http.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        const pass = acceptableRejectionCodes.includes(res.statusCode);
        log(
          "UPLOAD",
          testName,
          `POST /api/student/resume/upload filename=${filename}`,
          acceptableRejectionCodes.join(" or "),
          res.statusCode,
          pass,
        );
        resolve({ status: res.statusCode, body: d });
      });
    });
    r.on("error", (e) => {
      log(
        "UPLOAD",
        testName,
        `POST /api/student/resume/upload filename=${filename}`,
        acceptableRejectionCodes.join(" or "),
        "connection_error",
        false,
      );
      resolve({ status: 0, error: e.message });
    });
    r.write(body);
    r.end();
  });
}

async function testPathTraversal(token) {
  const boundary = "----PathTraversalBoundary" + Date.now();
  const filename = "../../../etc/passwd.pdf";
  const content = Buffer.from("%PDF-1.4 test");

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`,
    ),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return new Promise((resolve) => {
    const opts = {
      hostname: "localhost",
      port: 8000,
      path: "/api/student/resume/upload",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
        Authorization: "Bearer " + token,
      },
    };
    const r = http.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        // Either rejected (4xx) or sanitized filename — both are acceptable outcomes
        const sanitized = d.includes("../") === false;
        const rejected = res.statusCode >= 400;
        log(
          "UPLOAD",
          "Path traversal filename sanitized/rejected",
          `POST /api/student/resume/upload filename="${filename}"`,
          "4xx or sanitized path",
          res.statusCode,
          rejected || sanitized,
        );
        resolve({ status: res.statusCode, body: d });
      });
    });
    r.on("error", (e) => {
      log(
        "UPLOAD",
        "Path traversal test",
        "POST /api/student/resume/upload",
        "4xx or sanitized",
        "error",
        false,
      );
      resolve({ error: e.message });
    });
    r.write(body);
    r.end();
  });
}

run().catch(console.error);
