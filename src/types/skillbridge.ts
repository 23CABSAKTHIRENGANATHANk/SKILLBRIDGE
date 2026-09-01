/**
 * SkillBridge API contract types.
 * These mirror the shapes returned by the PHP API. UI components must be typed
 * against these — never against the demo fixtures in `src/data/demo.ts`.
 */

export type JobType = "Full Time" | "Internship" | "Part Time" | "Contract";

export type ApplicationStage =
  | "applied"
  | "shortlisted"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  industry: string;
  website: string | null;
  verified: boolean;
  about?: string;
  city?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface SkillMatch {
  /** 0-100, computed server-side. */
  score: number;
  matched: string[];
  missing: string[];
}

export interface Job {
  id: string;
  title: string;
  summary: string;
  company: Pick<Company, "id" | "name" | "logoUrl" | "verified">;
  location: string;
  type: JobType;
  salaryRange: string | null;
  skills: string[];
  postedAt: string;
  match: SkillMatch | null;
}

export interface Candidate {
  id: string;
  name: string;
  avatarUrl: string | null;
  college: string;
  program: string;
  experience: string;
  skills: string[];
  match: SkillMatch | null;
  stage: ApplicationStage;
  appliedAt: string;
}

export interface Application {
  id: string;
  job: Pick<Job, "id" | "title"> & { companyName: string };
  stage: ApplicationStage;
  updatedAt: string;
}

export interface CareerProgress {
  percent: number;
  steps: { id: string; label: string; complete: boolean }[];
}

export interface PlatformStats {
  students: number;
  opportunities: number;
  companies: number;
  matches: number;
}

export interface PipelineCounts {
  applied: number;
  shortlisted: number;
  interview: number;
  hired: number;
}
