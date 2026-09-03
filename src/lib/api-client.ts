/**
 * SkillBridge Unified Frontend API Client & Auth Interceptor
 *
 * Features:
 * - Automatic JWT bearer token attachment.
 * - Single-flight refresh token queue to seamlessly recover expired sessions.
 * - Centralized 401 recovery and safe redirection.
 * - Production-safe error handling without silent mock data fallback.
 */

import type {
  Job,
  Company,
  Candidate,
  PlatformStats,
  CareerProgress,
  PipelineCounts,
  Application,
  AuthUser,
  AIResumeAnalysis,
  AIMatchExplanation,
  AIRecommendedJob,
  AISkillGapAnalysis,
  AIRecruiterInsights,
  SkillProof,
  CareerGoal,
  CareerReadiness,
  SkillGapAnalysis,
  NextBestAction,
  CareerRoadmapResponse,
  WeeklyCareerPlanResponse,
  CareerOpportunitiesResponse,
  KnowledgeEvolutionEvent,
  LearningResource,
  CareerDashboardAggregated,
} from "@/types/skillbridge";


const API_BASE_URL = import.meta.env["VITE_API_URL"] || "/api";
const REQUEST_TIMEOUT_MS = 15_000;

export class ApiClient {
  private static isRefreshing = false;
  private static refreshSubscribers: Array<(token: string | null) => void> = [];

  public static getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("sb_auth_token");
  }

  public static setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("sb_auth_token", token);
    }
  }

  public static getRefreshToken(): string | null {
    return null;
  }

  public static setRefreshToken(refreshToken: string): void {
    void refreshToken;
  }

  public static clearTokens(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sb_auth_token");
      localStorage.removeItem("sb_user_cache");
    }
  }

  private static onTokenRefreshed(token: string | null): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private static addRefreshSubscriber(callback: (token: string | null) => void): void {
    this.refreshSubscribers.push(callback);
  }

  public static getApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${cleanEndpoint}`;
  }

  public static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = this.getApiUrl(cleanEndpoint);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers,
        signal: options.signal ?? controller.signal,
      });

      if (
        response.status === 401 &&
        !isRetry &&
        !endpoint.includes("/auth/login") &&
        !endpoint.includes("/auth/register") &&
        !endpoint.includes("/auth/refresh")
      ) {
        const refreshToken = this.getRefreshToken();
        if (refreshToken || endpoint.includes("/auth/")) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            try {
              const refreshRes = await this.refreshAccessToken(refreshToken ?? undefined);
              if (refreshRes && refreshRes.token) {
                this.setToken(refreshRes.token);
                this.isRefreshing = false;
                this.onTokenRefreshed(refreshRes.token);
                return this.request<T>(endpoint, options, true);
              } else {
                throw new Error("Invalid refresh response");
              }
            } catch (refreshErr) {
              this.isRefreshing = false;
              this.onTokenRefreshed(null);
              this.clearTokens();
              window.dispatchEvent(new CustomEvent("sb_auth_expired"));
              throw new Error("Your session has expired. Please sign in again.");
            }
          } else {
            // Queue duplicate concurrent requests until token refresh completes
            return new Promise<T>((resolve, reject) => {
              this.addRefreshSubscriber((newToken) => {
                if (newToken) {
                  resolve(this.request<T>(endpoint, options, true));
                } else {
                  reject(new Error("Your session has expired. Please sign in again."));
                }
              });
            });
          }
        } else {
          this.clearTokens();
          window.dispatchEvent(new CustomEvent("sb_auth_expired"));
        }
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        let friendlyMessage = errorBody.error || errorBody.message;
        if (!friendlyMessage) {
          if (response.status === 401) friendlyMessage = "Incorrect email or password.";
          else if (response.status === 403)
            friendlyMessage = "Your account does not currently have access.";
          else if (response.status === 429)
            friendlyMessage = "Too many requests. Please try again in a few moments.";
          else if (response.status >= 500)
            friendlyMessage = "Something went wrong on the server. Please try again.";
          else friendlyMessage = `Request failed (Status ${response.status}).`;
        }
        throw new Error(friendlyMessage);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("SkillBridge took too long to respond. Please try again.");
      }
      if (err.name === "TypeError" && err.message?.includes("fetch")) {
        throw new Error(
          "Unable to connect to SkillBridge. Check your internet connection or backend server.",
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  public static async getHealth(): Promise<{
    success?: boolean;
    status: string;
    database?: string;
    uptime?: string;
  }> {
    return this.request("/health");
  }

  public static async verifyCompany(
    companyId: string,
    verified: boolean,
  ): Promise<{ success: boolean }> {
    return this.request("/admin/verify-company", {
      method: "POST",
      body: JSON.stringify({ company_id: companyId, verified }),
    });
  }

  public static async addStudentSkill(
    skillName: string,
    proficiency: number,
  ): Promise<{ success: boolean }> {
    return this.request("/student/skills", {
      method: "POST",
      body: JSON.stringify({ skill_name: skillName, proficiency }),
    });
  }

  public static async uploadResume(file: File): Promise<{ success: boolean; filename?: string }> {
    const formData = new FormData();
    formData.append("resume", file);
    return this.request("/student/resume", { method: "POST", body: formData });
  }

  public static async verifyPhone(phone: string): Promise<{ success: boolean }> {
    return this.request("/student/verify-phone", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }

  public static async saveOnboarding(data: Record<string, unknown>): Promise<{ success: boolean }> {
    return this.request("/student/onboarding", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }


  public static async submitFeedback(data: {
    application_id: string;
    rating: number;
    review_text: string;
  }): Promise<{ success: boolean }> {
    return this.request("/applications/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async updateApplicationStage(
    applicationId: string,
    stage: string,
  ): Promise<{ success: boolean }> {
    return this.request("/applications/stage", {
      method: "PUT",
      body: JSON.stringify({ application_id: applicationId, stage }),
    });
  }

  public static async createJob(
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; job?: Job }> {
    return this.request("/jobs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async updateCompanyProfile(
    data: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    geocoding?: { coordinates?: { latitude: number; longitude: number } };
  }> {
    return this.request("/companies/profile", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async getNotifications(): Promise<{ notifications: any[]; unreadCount?: number }> {
    return this.request("/notifications");
  }

  public static async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return this.request("/notifications/read", { method: "POST", body: JSON.stringify({}) });
  }

  public static async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return this.request("/notifications/read", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  }

  public static async deleteNotification(id: string): Promise<{ success: boolean }> {
    return this.request(`/notifications/${id}`, { method: "DELETE" });
  }

  // --- Auth API ---
  public static async login(credentials: { email: string; password: string }): Promise<{
    success: boolean;
    token: string;
    refreshToken?: string;
    user: AuthUser;
  }> {
    const res = await this.request<{
      success: boolean;
      token: string;
      refreshToken?: string;
      user: AuthUser;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (res.token) {
      this.setToken(res.token);
    }
    if (res.refreshToken) {
      this.setRefreshToken(res.refreshToken);
    }
    return res;
  }

  public static async register(data: {
    email: string;
    password: string;
    role: "student" | "recruiter";
    name?: string | undefined;
    college?: string | undefined;
    program?: string | undefined;
    company_name?: string | undefined;
    industry?: string | undefined;
  }): Promise<{
    success: boolean;
    token: string;
    refreshToken?: string;
    user: AuthUser;
  }> {
    const res = await this.request<{
      success: boolean;
      token: string;
      refreshToken?: string;
      user: AuthUser;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.token) {
      this.setToken(res.token);
    }
    if (res.refreshToken) {
      this.setRefreshToken(res.refreshToken);
    }
    return res;
  }

  public static async me(): Promise<{ success: boolean; user: AuthUser; profile?: any }> {
    return await this.request<{ success: boolean; user: AuthUser; profile?: any }>("/auth/me");
  }

  public static async refreshAccessToken(refreshToken?: string): Promise<{
    success: boolean;
    token: string;
    user: AuthUser;
  }> {
    return await this.request<{
      success: boolean;
      token: string;
      user: AuthUser;
    }>("/auth/refresh", {
      method: "POST",
        ...(refreshToken ? { body: JSON.stringify({ refreshToken }) } : {}),
    });
  }

  public static async logout(): Promise<{ success: boolean }> {
    const refreshToken = this.getRefreshToken();
    try {
      await this.request<{ success: boolean }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore network errors during logout
    } finally {
      this.clearTokens();
    }
    return { success: true };
  }

  // --- Platform Stats ---
  public static async getPlatformStats(): Promise<PlatformStats> {
    const res = await this.request<{ success: boolean; stats: PlatformStats }>("/stats");
    return res.stats;
  }

  // --- Jobs ---
  public static async getJobs(params?: {
    search?: string;
    skill?: string;
    type?: string;
    location?: string;
  }): Promise<Job[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.skill && params.skill !== "All") query.set("skill", params.skill);
    if (params?.type && params.type !== "All Types") query.set("type", params.type);
    if (params?.location) query.set("location", params.location);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await this.request<{ success: boolean; jobs: Job[] }>(`/jobs${qs}`);
    return res.jobs;
  }

  public static async getJob(id: string): Promise<Job | null> {
    const res = await this.request<{ success: boolean; job: Job }>(`/jobs/${id}`);
    return res.job;
  }

  // --- Company ---
  public static async getCompany(id: string): Promise<{ company: Company; jobs: Job[] }> {
    const res = await this.request<{ success: boolean; company: Company; jobs: Job[] }>(
      `/companies/${id}`,
    );
    return { company: res.company, jobs: res.jobs || [] };
  }

  // --- Student Dashboard ---
  public static async getStudentDashboard(): Promise<{
    pipeline: PipelineCounts;
    progress: CareerProgress;
    applications: Application[];
  }> {
    const res = await this.request<{
      success: boolean;
      pipeline: PipelineCounts;
      progress: CareerProgress;
      applications: Application[];
    }>("/student/dashboard");
    return {
      pipeline: res.pipeline,
      progress: res.progress,
      applications: res.applications,
    };
  }

  public static async getStudentProfile(): Promise<{
    success: boolean;
    student: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      college: string;
      program: string;
      experience?: string;
      hasResume: boolean;
      phone?: string | null;
      phoneVerified?: boolean;
    };
    skills: Array<{ skill_id: string; skill_name: string; proficiency: number }>;
    skill_proof?: SkillProof[];
    projects?: Array<{
      id: string;
      title: string;
      description?: string;
      tech_stack?: string;
      project_url?: string;
      github_url?: string;
    }>;
    certificates?: Array<{
      id: string;
      title: string;
      issuer: string;
      issue_date?: string;
      credential_url?: string;
    }>;
  }> {
    return this.request("/student/profile");
  }

  public static async updateStudentProfile(data: {
    name: string;
    college?: string;
    program?: string;
    experience?: string;
    avatar_url?: string;
  }): Promise<{ success: boolean; student: any; skills: any[]; progress: any }> {
    return this.request("/student/profile", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async deleteStudentSkill(skillId: string): Promise<{ success: boolean }> {
    return this.request("/student/skills", {
      method: "DELETE",
      body: JSON.stringify({ skill_id: skillId }),
    });
  }

  // --- Student Projects ---
  public static async addStudentProject(data: {
    title: string;
    description?: string;
    tech_stack?: string;
    project_url?: string;
    github_url?: string;
  }): Promise<{ success: boolean; message: string; projectId: string }> {
    return this.request("/student/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async deleteStudentProject(projectId: string): Promise<{ success: boolean }> {
    return this.request(`/student/projects/${projectId}`, {
      method: "DELETE",
    });
  }

  // --- Student Certificates ---
  public static async addStudentCertificate(data: {
    title: string;
    issuer: string;
    issue_date?: string;
    credential_url?: string;
  }): Promise<{ success: boolean; message: string; certificateId: string }> {
    return this.request("/student/certificates", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async deleteStudentCertificate(certId: string): Promise<{ success: boolean }> {
    return this.request(`/student/certificates/${certId}`, {
      method: "DELETE",
    });
  }

  // --- Recruiter Candidates ---
  public static async getCandidates(params?: {
    stage?: string;
    search?: string;
  }): Promise<Candidate[]> {
    const query = new URLSearchParams();
    if (params?.stage && params.stage !== "All") query.set("stage", params.stage);
    if (params?.search) query.set("search", params.search);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await this.request<{ success: boolean; candidates: Candidate[] }>(
      `/applications/candidates${qs}`,
    );
    return res.candidates;
  }

  // --- Application Apply ---
  public static async applyJob(jobId: string): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>("/applications/apply", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId }),
    });
  }

  // --- AI: Resume Summary ---
  public static async getAIResumeSummary(resumeText?: string): Promise<{
    ai_powered: boolean;
    resume_analysis: AIResumeAnalysis;
  }> {
    return await this.request<{
      success: boolean;
      ai_powered: boolean;
      resume_analysis: AIResumeAnalysis;
    }>("/ai/resume-summary", {
      method: "POST",
      body: JSON.stringify({ resume_text: resumeText || "" }),
    });
  }

  // --- AI: Match Explanation ---
  public static async getAIMatchExplain(jobId: string): Promise<{
    ai_powered: boolean;
    job_title: string;
    company: string;
    match_score: number;
    explanation: AIMatchExplanation;
  }> {
    return await this.request<{
      success: boolean;
      ai_powered: boolean;
      job_title: string;
      company: string;
      match_score: number;
      explanation: AIMatchExplanation;
    }>("/ai/match-explain", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId }),
    });
  }

  // --- AI: Personalized Recommendations ---
  public static async getAIRecommendations(): Promise<{
    ai_powered: boolean;
    recommendations: AIRecommendedJob[];
    student_skills: string[];
  }> {
    return await this.request<{
      success: boolean;
      ai_powered: boolean;
      recommendations: AIRecommendedJob[];
      student_skills: string[];
    }>("/ai/recommendations");
  }

  // --- AI: Skill Gap & Learning Path ---
  public static async getAISkillGap(jobId: string): Promise<{
    ai_powered: boolean;
    job_title: string;
    student_skills: string[];
    job_skills: string[];
    gap_analysis: AISkillGapAnalysis;
  }> {
    return await this.request<{
      success: boolean;
      ai_powered: boolean;
      job_title: string;
      student_skills: string[];
      job_skills: string[];
      gap_analysis: AISkillGapAnalysis;
    }>("/ai/skill-gap", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId }),
    });
  }

  // --- AI: Recruiter Pipeline Insights ---
  public static async getAIRecruiterInsights(): Promise<{
    ai_powered: boolean;
    pipeline_stats: { total: number; shortlisted: number; interview: number };
    insights: AIRecruiterInsights;
    top_skills: string[];
  }> {
    return await this.request<{
      success: boolean;
      ai_powered: boolean;
      pipeline_stats: { total: number; shortlisted: number; interview: number };
      insights: AIRecruiterInsights;
      top_skills: string[];
    }>("/ai/recruiter-insights");
  }

  // --- Interviews System ---
  public static async getInterviews(): Promise<any[]> {
    const res = await this.request<{ success: boolean; count: number; interviews: any[] }>(
      "/interviews",
    );
    return res.interviews || [];
  }

  public static async scheduleInterview(params: {
    application_id: string;
    scheduled_at: string;
    meeting_link?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; interview: any }> {
    return await this.request<{ success: boolean; message: string; interview: any }>(
      "/interviews/schedule",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
    );
  }

  public static async updateInterviewStatus(
    interviewId: string,
    status: "scheduled" | "completed" | "cancelled" | "rescheduled",
  ): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>("/interviews/status", {
      method: "POST",
      body: JSON.stringify({ interview_id: interviewId, status }),
    });
  }

  // --- SkillBridge 2.0: Proof of Skill & Assessments ---
  public static async getSkillAssessment(skillName: string): Promise<{
    success: boolean;
    skill_name: string;
    total_questions: number;
    questions: Array<{ id: string; category: string; question: string; options: Record<string, string> }>;
  }> {
    return this.request(`/student/assessments/${encodeURIComponent(skillName)}`);
  }

  public static async submitSkillAssessment(data: {
    skill_name: string;
    answers: Record<string, string>;
  }): Promise<{
    success: boolean;
    message: string;
    result: {
      assessment_id: string;
      skill_name: string;
      score: number;
      level: string;
      knowledge_score: number;
      problem_solving_score: number;
      practical_score: number;
      summary: string;
    };
    updated_skills: any[];
  }> {
    return this.request("/student/assessments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async startSkillVerification(data: {
    skill_name: string;
    requested_level?: string;
  }): Promise<{
    success: boolean;
    is_resumed: boolean;
    attempt_id: string;
    skill_name: string;
    requested_level?: string;
    current_question_index: number;
    total_questions: number;
    message: string;
  }> {
    return this.request("/student/skill-verifications/start", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async getSkillVerificationQuestion(
    attemptId: string,
    index?: number,
  ): Promise<{
    success: boolean;
    attempt_id: string;
    skill_name: string;
    status: string;
    current_index: number;
    total_questions: number;
    question?: {
      id: string;
      index: number;
      type: string;
      category: string;
      question: string;
      code_snippet?: string | null;
      options?: Record<string, string> | null;
      points: number;
      answered: boolean;
      previous_answer?: string | null;
    };
    message?: string;
    attempt_status?: string;
  }> {
    const qs = index !== undefined ? `?index=${encodeURIComponent(String(index))}` : "";
    return this.request(`/student/skill-verifications/${encodeURIComponent(attemptId)}/question${qs}`);
  }

  public static async submitSkillVerificationAnswer(data: {
    question_id: string;
    answer: string;
  }, attemptId: string): Promise<{
    success: boolean;
    question_id: string;
    is_correct: boolean;
    next_index: number;
    is_last_question: boolean;
  }> {
    return this.request(`/student/skill-verifications/${encodeURIComponent(attemptId)}/answer`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async completeSkillVerification(attemptId: string): Promise<{
    success: boolean;
    attempt_id: string;
    skill_name: string;
    score: number;
    verified_level: string;
    confidence: number;
    passed: boolean;
    breakdown: Record<string, number>;
    integrity: any;
    message: string;
  }> {
    return this.request(`/student/skill-verifications/${encodeURIComponent(attemptId)}/complete`, {
      method: "POST",
    });
  }

  public static async getSkillVerificationHistory(): Promise<{
    success: boolean;
    count: number;
    attempts: any[];
  }> {
    return this.request("/student/skill-verifications");
  }

  public static async getSkillIntegrity(skillId?: string): Promise<any> {
    if (skillId) {
      return this.request(`/student/skill-integrity/${encodeURIComponent(skillId)}`);
    }
    return this.request("/student/skill-integrity");
  }

  // --- Career Simulator & Gap Analysis & Career Agent ---
  public static async simulateCareer(skills: string[]): Promise<{
    success: boolean;
    simulated_skills: string[];
    current_readiness: number;
    projected_readiness: number;
    growth_delta: number;
    high_fit_jobs_unlocked: number;
    potential_roles: string[];
    disclaimer: string;
  }> {
    return this.request("/career/simulate", {
      method: "POST",
      body: JSON.stringify({ skills }),
    });
  }

  public static async getCareerGapAnalysis(targetRole: string): Promise<{
    success: boolean;
    target_role: string;
    current_readiness: number;
    matched_skills: string[];
    missing_skills: string[];
    priority_sequence: Array<{ skill: string; priority: string; time_estimate: string }>;
    recommended_project: string;
  }> {
    return this.request("/career/gap-analysis", {
      method: "POST",
      body: JSON.stringify({ target_role: targetRole }),
    });
  }

  public static async chatCareerAgent(message: string): Promise<{
    success: boolean;
    agent: {
      reply: string;
      suitable_roles: string[];
      missing_competencies: string[];
      recommended_next_action: string;
    };
  }> {
    return this.request("/career/agent", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  // --- Skill Passports (Public & Private) ---
  public static async getSkillPassportToken(): Promise<{
    success: boolean;
    passport_token: string;
    share_url: string;
    is_public: boolean;
    view_count: number;
  }> {
    return this.request("/student/passport", { method: "POST" });
  }

  public static async getPublicSkillPassport(token: string): Promise<{
    success: boolean;
    passport: {
      name: string;
      institution: string;
      program: string;
      experience: string;
      verified_readiness: number;
      verified_skills_count: number;
      skills: any[];
      projects: any[];
      certificates: any[];
      verified_badge: boolean;
      public_token: string;
      verified_at: string;
      cryptographic_verification?: any;
      proof_of_work?: any;
    };
  }> {
    return this.request(`/passport/${token}`);
  }

  // --- GitHub Proof of Work ---
  public static async connectGitHub(githubUsername: string): Promise<{
    success: boolean;
    message: string;
    profile: {
      username: string;
      repos_count: number;
      languages: string[];
      detected_skills: string[];
      top_repositories: Array<{ name: string; language: string; stars: number; url: string; description: string }>;
    };
    updated_skills: any[];
  }> {
    return this.request("/student/github/connect", {
      method: "POST",
      body: JSON.stringify({ github_username: githubUsername }),
    });
  }

  // --- AI Pre-screen Interview Studio ---
  public static async getAIInterviewSession(role?: string): Promise<{
    success: boolean;
    target_role: string;
    questions: Array<{ id: string; category: string; question: string }>;
    session_instructions: string;
  }> {
    const qs = role ? `?role=${encodeURIComponent(role)}` : "";
    return this.request(`/interview-ai/session${qs}`);
  }

  public static async startAdaptiveAIInterview(data: {
    target_role?: string;
    job_id?: string | null;
  }): Promise<{
    success: boolean;
    session_id: string;
    target_role: string;
    current_stage: number;
    total_stages: number;
    current_question: {
      id: string;
      category: string;
      question: string;
      adaptive_note?: string;
    } | null;
    grounded_context: {
      verified_skills: string[];
      top_project: string | null;
    };
    instructions: string;
  }> {
    return this.request("/interview-ai/start", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async submitAdaptiveAIInterviewAnswer(
    sessionId: string,
    answer: string,
  ): Promise<{
    success: boolean;
    session_id: string;
    stage_completed: number;
    next_stage: number;
    is_complete: boolean;
    next_question: {
      id: string;
      category: string;
      question: string;
      adaptive_note?: string;
    } | null;
    message: string;
  }> {
    return this.request(`/interview-ai/${encodeURIComponent(sessionId)}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    });
  }

  public static async completeAdaptiveAIInterview(sessionId: string): Promise<{
    success: boolean;
    session_id: string;
    target_role: string;
    scorecard: {
      technical_score: number;
      problem_solving_score: number;
      communication_score: number;
      role_fit_score: number;
      overall_score: number;
      strengths: string[];
      improvements: string[];
      evaluator_notes: string;
    };
    disclaimer: string;
  }> {
    return this.request(`/interview-ai/${encodeURIComponent(sessionId)}/complete`, {
      method: "POST",
    });
  }

  public static async getAdaptiveAIInterviewScorecard(sessionId: string): Promise<{
    success: boolean;
    session_id: string;
    target_role: string;
    overall_score: number;
    scorecard: {
      technical_score: number;
      problem_solving_score: number;
      communication_score: number;
      role_fit_score: number;
      overall_score: number;
      strengths: string[];
      improvements: string[];
      evaluator_notes: string;
    };
    answers: Record<string, string>;
    question_tree: Array<{ id: string; category: string; question: string; adaptive_note?: string }>;
  }> {
    return this.request(`/interview-ai/${encodeURIComponent(sessionId)}/scorecard`);
  }

  public static async evaluateAIInterview(data: {
    role: string;
    answers: Record<string, string>;
  }): Promise<{
    success: boolean;
    session_id: string;
    target_role: string;
    scorecard: {
      technical_score: number;
      problem_solving_score: number;
      communication_score: number;
      role_fit_score: number;
      overall_score: number;
      strengths: string[];
      improvements: string[];
      evaluator_notes: string;
    };
    disclaimer: string;
  }> {
    return this.request("/interview-ai/evaluate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============================================================
  // PHASE 2: Proof-of-Work, Cryptographic Passport, Talent Search
  // ============================================================

  public static async getProofOfWork(): Promise<{
    success: boolean;
    proof_of_work: {
      has_proof_of_work: boolean;
      total_repositories: number;
      overall_pow_score: number;
      proof_of_work_level: string;
      top_technologies: string[];
      repositories: Array<{
        repo_name: string;
        repo_url: string;
        primary_language: string | null;
        overall_evidence_score: number;
        proof_strength: string;
        technologies: string[];
        signals: Record<string, any>;
        commit_count: number;
        analyzed_at: string;
      }>;
      signals_summary: string[];
    };
  }> {
    return this.request("/student/proof-of-work");
  }

  public static async reissueSkillPassport(): Promise<{
    success: boolean;
    message: string;
    credential: Record<string, any>;
  }> {
    return this.request("/student/passport/reissue", { method: "POST" });
  }

  public static async revokeSkillPassport(reason?: string): Promise<{
    success: boolean;
    message: string;
    revocation: Record<string, any>;
  }> {
    return this.request("/student/passport/revoke", {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Candidate requested revocation" }),
    });
  }

  public static async verifyPassportSignature(token: string): Promise<{
    success: boolean;
    verification: {
      valid: boolean;
      credential_status: string;
      credential_version?: string;
      issued_at?: string;
      algorithm?: string;
      key_id?: string;
      signature?: string;
      public_key?: string;
      credential_data?: Record<string, any>;
      message?: string;
    };
  }> {
    return this.request(`/passport/${encodeURIComponent(token)}/verify`);
  }

  public static async getPassportQr(token: string): Promise<{
    success: boolean;
    passport_token: string;
    verification_url: string;
    qr_code_svg_url: string;
  }> {
    return this.request(`/passport/${encodeURIComponent(token)}/qr`);
  }

  public static async searchTalent(filters: {
    role?: string | undefined;
    skills?: string[] | undefined;
    verification_level?: string | undefined;
    min_assessment?: number | undefined;
    proof_of_work?: string | undefined;
    location?: string | undefined;
    experience?: string | undefined;
    sort_by?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{
    success: boolean;
    total: number;
    limit: number;
    offset: number;
    candidates: Array<{
      student_id: string;
      name: string;
      college: string;
      program: string;
      experience: string;
      location: string;
      avatar_url: string | null;
      passport_token: string | null;
      credential_status: string;
      has_cryptographic_passport: boolean;
      precision_match_score: number;
      match_strength: string;
      matched_skills: Array<{
        skill_name: string;
        verification_level: string;
        is_verified: boolean;
        confidence_score: number;
      }>;
      missing_skills: string[];
      average_assessment_score: number;
      proof_of_work: {
        level: string;
        score: number;
        repositories_count: number;
      };
      relevant_projects_count: number;
      explainable_reasons: string[];
      gaps: string[];
    }>;
  }> {
    const params = new URLSearchParams();
    if (filters.role) params.set("role", filters.role);
    if (filters.skills && filters.skills.length > 0) params.set("skills", filters.skills.join(","));
    if (filters.verification_level) params.set("verification_level", filters.verification_level);
    if (filters.min_assessment) params.set("min_assessment", String(filters.min_assessment));
    if (filters.proof_of_work) params.set("proof_of_work", filters.proof_of_work);
    if (filters.location) params.set("location", filters.location);
    if (filters.experience) params.set("experience", filters.experience);
    if (filters.sort_by) params.set("sort_by", filters.sort_by);
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.offset) params.set("offset", String(filters.offset));

    return this.request(`/recruiter/talent-search?${params.toString()}`);
  }

  public static async getCandidateProof(studentId: string): Promise<{
    success: boolean;
    candidate: {
      student_id: string;
      name: string;
      institution: string;
      program: string;
      experience: string;
      location: string;
      avatar_url: string | null;
      passport_token: string | null;
      skills: any[];
      proof_of_work: any;
      projects: any[];
      cryptographic_verification: any;
    };
  }> {
    return this.request(`/recruiter/talent-search/${encodeURIComponent(studentId)}/proof`);
  }

  public static async shortlistCandidate(
    studentId: string,
    stage = "shortlisted",
    notes = "",
  ): Promise<{
    success: boolean;
    message: string;
    shortlist: Record<string, any>;
  }> {
    return this.request("/recruiter/shortlist", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId, stage, notes }),
    });
  }

  public static async getShortlists(): Promise<{
    success: boolean;
    shortlists: any[];
  }> {
    return this.request("/recruiter/shortlists");
  }

  public static async getSkillProof(): Promise<{
    success: boolean;
    skills: any[];
  }> {
    return this.request("/student/skill-proof");
  }

  // -------------------------------------------------------------------------
  // SkillBridge 3.0 — Skill Evidence Graph
  // -------------------------------------------------------------------------
  public static async getSkillEvidenceGraph(): Promise<{
    success: boolean;
    evidence_graph: SkillEvidenceItem[];
    total_skills: number;
  }> {
    return this.request("/student/skills/evidence");
  }

  // -------------------------------------------------------------------------
  // SkillBridge 3.0 — Skill Trust Scores
  // -------------------------------------------------------------------------
  public static async getSkillTrustScores(): Promise<{
    success: boolean;
    trust_scores: SkillTrustScore[];
    computed_at: string;
  }> {
    return this.request("/student/skills/trust-score");
  }

  // -------------------------------------------------------------------------
  // SkillBridge 3.0 — Student Career Evolution Engine
  // -------------------------------------------------------------------------
  public static async getCareerDashboard(): Promise<CareerDashboardAggregated> {
    return this.request("/student/career-dashboard");
  }

  public static async getCareerGoal(): Promise<{ goal: CareerGoal | null }> {
    return this.request("/student/career-goal");
  }

  public static async saveCareerGoal(data: {
    target_role: string;
    target_industry?: string | undefined;
    preferred_location?: string | undefined;
    experience_level?: string | undefined;
    target_timeline_weeks?: number | undefined;
  }): Promise<{ message: string; goal: CareerGoal; roadmap: CareerRoadmapResponse }> {

    return this.request("/student/career-goal", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async getCareerReadiness(role?: string): Promise<CareerReadiness> {
    const q = role ? `?role=${encodeURIComponent(role)}` : "";
    return this.request(`/student/readiness${q}`);
  }

  public static async getSkillGaps(role?: string): Promise<SkillGapAnalysis> {
    const q = role ? `?role=${encodeURIComponent(role)}` : "";
    return this.request(`/student/skill-gaps${q}`);
  }

  public static async getNextCareerAction(): Promise<{ action: NextBestAction }> {
    return this.request("/student/next-action");
  }

  public static async getCareerRoadmap(role?: string): Promise<CareerRoadmapResponse> {
    const q = role ? `?role=${encodeURIComponent(role)}` : "";
    return this.request(`/student/roadmap${q}`);
  }

  public static async completeRoadmapStep(stepId: string): Promise<{ message: string; roadmap: CareerRoadmapResponse }> {
    return this.request(`/student/roadmap/step/${encodeURIComponent(stepId)}/complete`, {
      method: "POST",
    });
  }

  public static async getLearningResources(skill?: string, type?: string): Promise<{ resources: LearningResource[]; count: number }> {
    const params = new URLSearchParams();
    if (skill) params.set("skill", skill);
    if (type) params.set("type", type);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/student/learning${qs}`);
  }

  public static async getKnowledgeEvolution(): Promise<{ events: KnowledgeEvolutionEvent[]; total_events: number }> {
    return this.request("/student/evolution");
  }

  public static async getWeeklyCareerPlan(): Promise<WeeklyCareerPlanResponse> {
    return this.request("/student/weekly-plan");
  }

  public static async toggleWeeklyCareerTask(taskId: string): Promise<{ message: string; weekly_plan: WeeklyCareerPlanResponse }> {
    return this.request(`/student/weekly-plan/task/${encodeURIComponent(taskId)}/toggle`, {
      method: "POST",
    });
  }

  public static async getCareerOpportunities(): Promise<CareerOpportunitiesResponse> {
    return this.request("/student/opportunities");
  }

  public static async getSkillDependencies(skill?: string): Promise<{ dependencies: Array<{ skill_name: string; prerequisite_name: string; relationship_type: string }> }> {
    const q = skill ? `?skill=${encodeURIComponent(skill)}` : "";
    return this.request(`/skills/dependencies${q}`);
  }

  public static async sendCareerCoachMessage(message: string): Promise<{
    reply: string;
    recommended_next_action: string;
    skills_to_focus_on: string[];
  }> {
    return this.request("/career-coach/message", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }


  // -------------------------------------------------------------------------
  // SkillBridge 3.0 — College Placement Mode
  // -------------------------------------------------------------------------
  public static async getCollegeDashboard(): Promise<{
    success: boolean;
    college: { id: string; name: string };
    total_students: number;
    verified_students: number;
    passported_students: number;
    verification_rate: number;
    active_drives: number;
    avg_trust_score: number;
    top_skills: Array<{ name: string; student_count: number }>;
    application_stages: Record<string, number>;
    placements: Record<string, number>;
  }> {
    return this.request("/college/dashboard");
  }

  public static async getCollegeStudents(
    page = 1,
    limit = 20,
    search = ""
  ): Promise<{
    success: boolean;
    students: any[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search ? { search } : {}),
    });
    return this.request(`/college/students?${params}`);
  }

  public static async getCollegeAnalytics(): Promise<{
    success: boolean;
    placement_funnel: Record<string, number>;
    skill_distribution: Array<{
      skill: string;
      category: string;
      student_count: number;
      avg_trust: number;
    }>;
    trust_distribution: Record<string, number>;
    recent_drives: any[];
  }> {
    return this.request("/college/analytics");
  }

  public static async createCollegeDrive(data: {
    title: string;
    description?: string;
    job_id?: string;
    drive_date?: string;
    min_trust_score?: number;
  }): Promise<{ success: boolean; message: string; drive_id: string }> {
    return this.request("/college/drives", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

// -------------------------------------------------------------------------
// SkillBridge 3.0 — Supplemental type exports for API responses
// -------------------------------------------------------------------------
export interface SkillEvidenceItem {
  skill_id: string;
  skill_name: string;
  proficiency: string;
  integrity_status: string;
  integrity_confidence: number;
  evidence_count: number;
  final_confidence: number;
  verification_level: string;
  evidence: EvidenceEntry[];
}

export interface EvidenceEntry {
  evidence_type: string;
  source: string;
  confidence: number;
  timestamp: string | null;
  verification_level: string;
  integrity_status: string;
  metadata: Record<string, unknown>;
}

export interface SkillTrustScore {
  skill_id: string;
  skill_name: string;
  trust_score: number;
  confidence: "low" | "medium" | "high" | "very_high";
  breakdown: TrustBreakdownItem[];
}

export interface TrustBreakdownItem {
  factor: string;
  weight: number;
  score: number;
  contribution: number;
  present: boolean;
  detail: string;
}

