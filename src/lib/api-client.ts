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
} from "@/types/skillbridge";

const API_BASE_URL =
  import.meta.env["VITE_API_URL"] || "http://localhost:8000/api";

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

  public static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${cleanEndpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && !isRetry && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/register") && !endpoint.includes("/auth/refresh")) {
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
          else if (response.status === 403) friendlyMessage = "Your account does not currently have access.";
          else if (response.status === 429) friendlyMessage = "Too many requests. Please try again in a few moments.";
          else if (response.status >= 500) friendlyMessage = "Something went wrong on the server. Please try again.";
          else friendlyMessage = `Request failed (Status ${response.status}).`;
        }
        throw new Error(friendlyMessage);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === "TypeError" && err.message?.includes("fetch")) {
        throw new Error("Unable to connect to SkillBridge. Check your internet connection or backend server.");
      }
      throw err;
    }
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
    name?: string;
    college?: string;
    program?: string;
    company_name?: string;
    industry?: string;
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
    const res = await this.request<{ success: boolean; stats: PlatformStats }>("/admin/stats");
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
    const res = await this.request<{ success: boolean; company: Company; jobs: Job[] }>(`/companies/${id}`);
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

  // --- Recruiter Candidates ---
  public static async getCandidates(params?: { stage?: string; search?: string }): Promise<Candidate[]> {
    const query = new URLSearchParams();
    if (params?.stage && params.stage !== "All") query.set("stage", params.stage);
    if (params?.search) query.set("search", params.search);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await this.request<{ success: boolean; candidates: Candidate[] }>(`/applications/candidates${qs}`);
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
    const res = await this.request<{ success: boolean; count: number; interviews: any[] }>("/interviews");
    return res.interviews || [];
  }

  public static async scheduleInterview(params: {
    application_id: string;
    scheduled_at: string;
    meeting_link?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; interview: any }> {
    return await this.request<{ success: boolean; message: string; interview: any }>("/interviews/schedule", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  public static async updateInterviewStatus(
    interviewId: string,
    status: "scheduled" | "completed" | "cancelled" | "rescheduled"
  ): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>("/interviews/status", {
      method: "POST",
      body: JSON.stringify({ interview_id: interviewId, status }),
    });
  }
}
