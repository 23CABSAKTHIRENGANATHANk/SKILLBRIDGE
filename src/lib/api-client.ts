/**
 * SkillBridge Unified Frontend API Client
 * 
 * Offline Fallback Policy:
 * - In Development (import.meta.env.DEV): Falls back to rich demo fixtures with a developer log.
 * - In Production (!import.meta.env.DEV): Throws errors for the UI Error/Retry state, never faking production data.
 */

import {
  demoJobs,
  demoStats,
  demoCompany,
  demoCandidates,
  demoProgress,
  demoPipeline,
  demoApplications,
} from "@/data/demo";
import type {
  Job,
  Company,
  Candidate,
  PlatformStats,
  CareerProgress,
  PipelineCounts,
  Application,
} from "@/types/skillbridge";

const API_BASE_URL =
  import.meta.env["VITE_API_URL"] || "http://localhost:8000/api";

const IS_DEV = import.meta.env.DEV;

export class ApiClient {
  private static getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("sb_auth_token");
  }

  public static setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("sb_auth_token", token);
    }
  }

  public static removeToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sb_auth_token");
    }
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {},
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

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          errorBody.error || `HTTP error! status: ${response.status}`,
        );
      }

      return await response.json();
    } catch (err) {
      if (IS_DEV) {
        console.warn(`[SkillBridge API Dev Fallback] Request to ${url} failed; using dev mock:`, err);
      }
      throw err;
    }
  }

  // --- Platform Stats ---
  public static async getPlatformStats(): Promise<PlatformStats> {
    try {
      const res = await this.request<{ success: boolean; stats: PlatformStats }>("/admin/stats");
      return res.stats;
    } catch (err) {
      if (IS_DEV) return demoStats;
      throw err;
    }
  }

  // --- Jobs ---
  public static async getJobs(params?: {
    search?: string;
    skill?: string;
    type?: string;
    location?: string;
  }): Promise<Job[]> {
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.skill && params.skill !== "All") query.set("skill", params.skill);
      if (params?.type && params.type !== "All Types") query.set("type", params.type);
      if (params?.location) query.set("location", params.location);

      const qs = query.toString() ? `?${query.toString()}` : "";
      const res = await this.request<{ success: boolean; jobs: Job[] }>(`/jobs${qs}`);
      return res.jobs;
    } catch (err) {
      if (IS_DEV) return demoJobs;
      throw err;
    }
  }

  public static async getJob(id: string): Promise<Job | null> {
    try {
      const res = await this.request<{ success: boolean; job: Job }>(`/jobs/${id}`);
      return res.job;
    } catch (err) {
      if (IS_DEV) return demoJobs.find((j) => j.id === id) || null;
      throw err;
    }
  }

  // --- Company ---
  public static async getCompany(id: string): Promise<{ company: Company; jobs: Job[] }> {
    try {
      const res = await this.request<{ success: boolean; company: Company; jobs: Job[] }>(`/companies/${id}`);
      return { company: res.company, jobs: res.jobs || [] };
    } catch (err) {
      if (IS_DEV) {
        return {
          company: demoCompany,
          jobs: demoJobs.filter((j) => j.company.id === id || j.company.id === "c1"),
        };
      }
      throw err;
    }
  }

  // --- Student Dashboard ---
  public static async getStudentDashboard(): Promise<{
    pipeline: PipelineCounts;
    progress: CareerProgress;
    applications: Application[];
  }> {
    try {
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
    } catch (err) {
      if (IS_DEV) {
        return {
          pipeline: demoPipeline,
          progress: demoProgress,
          applications: demoApplications,
        };
      }
      throw err;
    }
  }

  // --- Recruiter Candidates ---
  public static async getCandidates(params?: { stage?: string; search?: string }): Promise<Candidate[]> {
    try {
      const query = new URLSearchParams();
      if (params?.stage && params.stage !== "All") query.set("stage", params.stage);
      if (params?.search) query.set("search", params.search);

      const qs = query.toString() ? `?${query.toString()}` : "";
      const res = await this.request<{ success: boolean; candidates: Candidate[] }>(`/applications/candidates${qs}`);
      return res.candidates;
    } catch (err) {
      if (IS_DEV) return demoCandidates;
      throw err;
    }
  }

  // --- Application Apply ---
  public static async applyJob(jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await this.request<{ success: boolean; message: string }>("/applications/apply", {
        method: "POST",
        body: JSON.stringify({ job_id: jobId }),
      });
    } catch (err) {
      if (IS_DEV) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return { success: true, message: "Application submitted successfully (development fallback mode)." };
      }
      throw err;
    }
  }
}
