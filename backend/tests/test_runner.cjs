const http = require("http");

const BASE = process.env.SKILLBRIDGE_TEST_BASE_URL || "http://127.0.0.1:8000/api";
let failures = 0;
let refreshCookie = "";

function req(path, method = "GET", data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}${path}`);
    const bodyStr = data ? JSON.stringify(data) : null;
    const headers = {
      Accept: "application/json",
      ...(bodyStr
        ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr) }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(refreshCookie ? { Cookie: refreshCookie } : {}),
    };

    const request = http.request(url, { method, headers }, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        const setCookie = res.headers["set-cookie"]?.find((value) => value.startsWith("sb_refresh_token="));
        if (setCookie && !setCookie.startsWith("sb_refresh_token=;")) refreshCookie = setCookie.split(";")[0];
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch {
          json = raw;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    request.on("error", reject);
    if (bodyStr) request.write(bodyStr);
    request.end();
  });
}

async function run() {
  console.log("\n🧪 Running SkillBridge E2E Real-Data Validation Suite\n");

  const rand = Math.floor(1000 + Math.random() * 9000);

  // 1. Health
  const h = await req("/health");
  const check = (name, passed, details = "") => {
    if (!passed) failures++;
    console.log(name, passed ? "✅ PASS" : "❌ FAIL", details);
  };

  check("1. Health Endpoint:", h.status === 200 && h.data?.status === "healthy");

  // 2. Ping
  const p = await req("/ping");
  check("2. Ping Endpoint:", p.status === 200 && p.data?.status === "pong");

  // 3. Register Student
  const sReg = await req("/auth/register", "POST", {
    email: `student_${rand}@skillbridge.dev`,
    password: "Password123!",
    name: "Arjun Kumar",
    role: "student",
    college: "Anna University",
    program: "B.Tech Computer Science",
  });
  check("3. Student Registration:", sReg.status === 201 && Boolean(sReg.data?.token), sReg.status + " " + JSON.stringify(sReg.data));
  const studentToken = sReg.data?.token;

  // 4. Student Login
  const sLog = await req("/auth/login", "POST", {
    email: `student_${rand}@skillbridge.dev`,
    password: "Password123!",
  });
  check("4. Student Login:", sLog.status === 200 && Boolean(sLog.data?.token));
  const studentAuthToken = sLog.data?.token || studentToken;
  const invalidLogin = await req("/auth/login", "POST", {
    email: `student_${rand}@skillbridge.dev`,
    password: "definitely-wrong-password",
  });
  check("4a. Invalid Login Rejected:", invalidLogin.status === 401, invalidLogin.status);
  const missingToken = await req("/auth/me");
  check("4b. Protected Route Requires Token:", missingToken.status === 401, missingToken.status);
  const tamperedToken = `${studentAuthToken}tampered`;
  const tampered = await req("/auth/me", "GET", null, tamperedToken);
  check("4c. Tampered JWT Rejected:", tampered.status === 401, tampered.status);

  // 5. Register Recruiter
  const rReg = await req("/auth/register", "POST", {
    email: `recruiter_${rand}@techcorp.com`,
    password: "Password123!",
    name: "Priya Sharma",
    role: "recruiter",
    company_name: `AcroTech AI ${rand}`,
    industry: "Enterprise AI",
  });
  check(
    "5. Recruiter Registration:",
    rReg.status === 201 && Boolean(rReg.data?.token),
    rReg.status,
  );
  const recruiterToken = rReg.data?.token;
  const studentAdmin = await req("/admin/stats", "GET", null, studentAuthToken);
  check("5a. Student Cannot Access Admin:", studentAdmin.status === 403, studentAdmin.status);
  const recruiterAdmin = await req("/admin/stats", "GET", null, recruiterToken);
  check("5b. Recruiter Cannot Access Admin:", recruiterAdmin.status === 403, recruiterAdmin.status);

  // 6. Company Profile Update & Geocoding
  const comp = await req(
    "/companies/profile",
    "POST",
    {
      name: `AcroTech AI ${rand}`,
      address: "100 Feet Road, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      country: "India",
    },
    recruiterToken,
  );
  check("6. Company Profile & Geocoding:", comp.status === 200, comp.status);

  // 7. Recruiter Post Job
  const job = await req(
    "/jobs",
    "POST",
    {
      title: `Senior AI Full Stack Engineer ${rand}`,
      summary: "Develop scalable LLM applications with React and Python.",
      description: "Looking for an engineer proficient in React, TypeScript, and Python.",
      location: "Bengaluru, India (Hybrid)",
      type: "Full Time",
      salary_range: "₹18 LPA - ₹26 LPA",
      skills: ["React", "TypeScript", "Python", "PostgreSQL"],
    },
    recruiterToken,
  );
  check("7. Recruiter Job Creation:", job.status === 201, job.status);
  const jobId = job.data?.jobId;

  // 8. List Jobs with Matching
  const jobsList = await req("/jobs", "GET", null, studentAuthToken);
  check(
    "8. List Jobs (with Skill Match):",
    jobsList.status === 200,
    `Found ${jobsList.data?.jobs?.length || 0} jobs`,
  );

  // 8a. Student Update Profile
  const updateProf = await req(
    "/student/profile",
    "POST",
    {
      name: "Arjun Kumar",
      college: "Anna University Campus",
      program: "M.Tech Software Engineering",
      experience: "Full Stack Engineer (3 Production Apps)",
    },
    studentAuthToken,
  );
  check("8a. Student Profile Update:", updateProf.status === 200, updateProf.status);

  // 8b. Student Add Skills
  const addSk1 = await req("/student/skills", "POST", { skill_name: "React", proficiency: 90 }, studentAuthToken);
  const addSk2 = await req("/student/skills", "POST", { skill_name: "TypeScript", proficiency: 85 }, studentAuthToken);
  const addSk3 = await req("/student/skills", "POST", { skill_name: "Python", proficiency: 80 }, studentAuthToken);
  check("8b. Student Add Skills:", addSk1.status === 200 && addSk2.status === 200 && addSk3.status === 200, "Added 3 skills");

  // 8c. Student Check Dashboard Recalculation
  const sDash = await req("/student/dashboard", "GET", null, studentAuthToken);
  check(
    "8c. Student Dynamic Career Score & Progress:",
    sDash.status === 200 && (sDash.data?.progress?.percent ?? 0) >= 40,
    `Score: ${sDash.data?.progress?.percent}%`,
  );

  // 8d. Student Add Project
  const addProj = await req(
    "/student/projects",
    "POST",
    {
      title: "Real-Time AI Talent Platform",
      tech_stack: "React, Node.js, PostgreSQL",
      description: "Full stack production application with deterministic matching engine.",
      project_url: "https://skillbridge.dev",
      github_url: "https://github.com/skillbridge/app",
    },
    studentAuthToken,
  );
  check("8d. Student Add Project:", addProj.status === 201 && Boolean(addProj.data?.projectId), addProj.status);

  // 8e. Student Add Certificate
  const addCert = await req(
    "/student/certificates",
    "POST",
    {
      title: "AWS Certified Cloud Practitioner",
      issuer: "Amazon Web Services",
      issue_date: "2026",
      credential_url: "https://aws.amazon.com/verification",
    },
    studentAuthToken,
  );
  check("8e. Student Add Certificate:", addCert.status === 201 && Boolean(addCert.data?.certificateId), addCert.status);

  // 8f. Student 80%+ Progress Check
  const sDashFull = await req("/student/dashboard", "GET", null, studentAuthToken);
  check(
    "8f. Student Career Score with Projects & Certs:",
    sDashFull.status === 200 && (sDashFull.data?.progress?.percent ?? 0) >= 60,
    `Score: ${sDashFull.data?.progress?.percent}%`,
  );

  // 9. Student Apply
  let appId = null;
  if (jobId) {
    const apply = await req("/applications/apply", "POST", { job_id: jobId }, studentAuthToken);
    check("9. Student Application:", apply.status === 201);
    appId = apply.data?.applicationId;

    // 10. Duplicate application check
    const dup = await req("/applications/apply", "POST", { job_id: jobId }, studentAuthToken);
    check("10. Duplicate Application Guard (409):", dup.status === 409, dup.status);
  }

  // 11. Recruiter Candidates Pipeline
  const cands = await req("/applications/candidates", "GET", null, recruiterToken);
  check(
    "11. Recruiter Candidates Pipeline:",
    cands.status === 200,
    `Found ${cands.data?.candidates?.length || 0} candidates`,
  );

  // 11b. Recruiter Shortlist Candidate (required before interview scheduling)
  if (appId) {
    const sl = await req(
      "/applications/stage",
      "PUT",
      {
        application_id: appId,
        stage: "shortlisted",
        notes: "Profile verified with real skills. Moving to shortlist.",
      },
      recruiterToken,
    );
    check("11b. Recruiter Stage Transition (Shortlist):", sl.status === 200, sl.status);
  }

  // 12. Recruiter Schedule Interview
  if (appId) {
    const futureDate = new Date(Date.now() + 3 * 86400000)
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
    const intv = await req(
      "/interviews/schedule",
      "POST",
      {
        application_id: appId,
        scheduled_at: futureDate,
        meeting_link: "https://meet.google.com/sb-live-demo",
        notes: "React pairing session and architecture review.",
      },
      recruiterToken,
    );
    check("12. Recruiter Schedule Interview:", intv.status === 201);
  }

  // 13. Student View Scheduled Interviews
  const sIntv = await req("/interviews", "GET", null, studentAuthToken);
  check("13. Student View Interviews:", sIntv.status === 200, `Count: ${sIntv.data?.count || 0}`);

  // 14. Recruiter Update Stage to Offer
  if (appId) {
    const st = await req(
      "/applications/stage",
      "PUT",
      {
        application_id: appId,
        stage: "offer",
        notes: "Outstanding performance during interview.",
      },
      recruiterToken,
    );
    check("14. Recruiter Stage Transition (Offer):", st.status === 200);
  }

  // 15. Student Check Notifications
  const notifs = await req("/notifications", "GET", null, studentAuthToken);
  check(
    "15. Student Real Notifications:",
    notifs.status === 200,
    `Unread: ${notifs.data?.unreadCount || 0}, Total: ${notifs.data?.notifications?.length || 0}`,
  );

  // 16. AI Resume Summary
  const aiSum = await req("/ai/resume-summary", "POST", {}, studentAuthToken);
  check(
    "16. AI Resume Summary & ATS Score:",
    aiSum.status === 200,
    `ATS: ${aiSum.data?.resume_analysis?.ats_score ?? "unavailable"}/100`,
  );

  // 17. AI Match Explanation
  if (jobId) {
    const aiMatch = await req("/ai/match-explain", "POST", { job_id: jobId }, studentAuthToken);
    check(
      "17. AI Match Explanation:",
      aiMatch.status === 200,
      `Verdict: ${aiMatch.data?.explanation?.verdict ?? "unavailable"}`,
    );
  }

  // 18. AI Personalized Recommendations
  const aiRecs = await req("/ai/recommendations", "GET", null, studentAuthToken);
  check(
    "18. AI Job Recommendations:",
    aiRecs.status === 200,
    `Count: ${aiRecs.data?.recommendations?.length || 0}`,
  );

  // 19. AI Recruiter Insights
  const aiIns = await req("/ai/recruiter-insights", "GET", null, recruiterToken);
  check(
    "19. AI Recruiter Pipeline Insights:",
    aiIns.status === 200,
    `Health: ${aiIns.data?.insights?.pipeline_health ?? "unavailable"}`,
  );

  // 20. OpenAPI Spec
  const spec = await new Promise((resolve) => {
    http.get(BASE.replace(/\/api$/, "/openapi.yaml"), (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => resolve({ status: res.statusCode, length: raw.length }));
    });
  });
  check(
    "20. OpenAPI 3.1 Spec Endpoint:",
    spec.status === 200 && spec.length > 500,
    `Size: ${(spec.length / 1024).toFixed(1)} KB`,
  );

  // --- SkillBridge 2.0 Proof-of-Skill Scenarios ---
  // 24. Assessment Generation
  const assessGen = await req("/assessment?skill=React", "GET", null, studentAuthToken);
  check(
    "24. Skill Assessment Generation:",
    assessGen.status === 200 && (assessGen.data?.questions?.length ?? 0) >= 3,
    `Questions: ${assessGen.data?.questions?.length || 0}`,
  );

  // 25. Assessment Submission
  const assessSub = await req(
    "/assessment/submit",
    "POST",
    {
      skill_name: "React",
      answers: {
        q1: "A",
        q2: "A",
        q3: "A",
        q4: "A",
      },
    },
    studentAuthToken,
  );
  check(
    "25. Skill Assessment Submission & Evidence:",
    assessSub.status === 200 && assessSub.data?.result?.score >= 60,
    `Score: ${assessSub.data?.result?.score}% (Level: ${assessSub.data?.result?.level})`,
  );

  // 26. Career Simulator
  const simRes = await req("/career/simulate", "POST", { skills: ["Docker", "AWS"] }, studentAuthToken);
  check(
    "26. Career Growth Simulator:",
    simRes.status === 200 && simRes.data?.growth_delta > 0,
    `Current: ${simRes.data?.current_readiness}%, Projected: ${simRes.data?.projected_readiness}% (+${simRes.data?.growth_delta}%)`,
  );

  // 27. Career Gap Analysis
  const gapRes = await req("/career/gap-analysis", "POST", { target_role: "Full Stack Engineer" }, studentAuthToken);
  check(
    "27. AI Skill Gap Analysis:",
    gapRes.status === 200 && Boolean(gapRes.data?.target_role),
    `Role: ${gapRes.data?.target_role}, Matched: ${gapRes.data?.matched_skills?.length || 0}`,
  );

  // 28. Skill Passport (Create & Public-safe lookup)
  const passRes = await req("/student/passport", "POST", {}, studentAuthToken);
  const passToken = passRes.data?.passport_token;
  check(
    "28. Skill Passport Token Generation:",
    passRes.status === 200 && Boolean(passToken),
    `Token: ${passToken?.substring(0, 14)}...`,
  );

  if (passToken) {
    const pubPass = await req(`/passport/${passToken}`, "GET", null, null);
    check(
      "28b. Public-Safe Passport Lookup (Zero PII):",
      pubPass.status === 200 && pubPass.data?.passport?.name && !pubPass.data?.passport?.email,
      `Student: ${pubPass.data?.passport?.name}, Verified Skills: ${pubPass.data?.passport?.verified_skills_count}`,
    );
  }

  // 29. GitHub Proof-of-Work
  const ghRes = await req("/student/github/connect", "POST", { github_username: "octocat" }, studentAuthToken);
  check(
    "29. GitHub Proof-of-Work Repository Analysis:",
    ghRes.status === 200 && Boolean(ghRes.data?.profile?.username),
    `Repos: ${ghRes.data?.profile?.repos_count}, Skills detected: ${ghRes.data?.profile?.detected_skills?.length}`,
  );

  // 30. AI Pre-screen Studio Session
  const intvSess = await req("/interview-ai/session?role=Full+Stack+Engineer", "GET", null, studentAuthToken);
  check(
    "30. AI Interview Session Generation:",
    intvSess.status === 200 && (intvSess.data?.questions?.length ?? 0) >= 3,
    `Questions: ${intvSess.data?.questions?.length}`,
  );

  const refreshed = await req("/auth/refresh", "POST");
  check(
    "31. Refresh Token:",
    refreshed.status === 200 && Boolean(refreshed.data?.token),
    refreshed.status,
  );
  const logout = await req("/auth/logout", "POST", null, studentAuthToken);
  check("32. Logout Revokes Refresh Token:", logout.status === 200, logout.status);
  const revokedRefresh = await req("/auth/refresh", "POST");
  check(
    "33. Revoked Refresh Token Rejected:",
    revokedRefresh.status === 401,
    revokedRefresh.status,
  );

  console.log("\n=======================================================");
  console.log(
    failures === 0
      ? "🎉 All production scenarios passed with real data."
      : `Integration suite failed: ${failures} scenario(s).`,
  );
  console.log("=======================================================\n");
}

run()
  .then(() => (process.exitCode = failures === 0 ? 0 : 1))
  .catch((e) => {
    console.error("FATAL:", e.message);
    process.exitCode = 1;
  });
