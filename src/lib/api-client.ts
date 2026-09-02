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
    if (typeof window === "undefined") return null;
    return localStorage.getItem("sb_refresh_token");
  }

  public static setRefreshToken(refreshToken: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("sb_refresh_token", refreshToken);
    }
  }

  public static clearTokens(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sb_auth_token");
      localStorage.removeItem("sb_refresh_token");
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
        if (refreshToken) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            try {
              const refreshRes = await this.refreshAccessToken(refreshToken);
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
    return this.request(`/notifications/${id}/read`, { method: "PUT" });
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

  public static async refreshAccessToken(refreshToken: string): Promise<{
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
      body: JSON.stringify({ refreshToken }),
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
}
