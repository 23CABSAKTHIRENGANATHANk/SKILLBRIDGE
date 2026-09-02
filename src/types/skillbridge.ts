/**
 * SkillBridge API contract types.
 * These mirror the real shapes returned by the PHP REST API & PostgreSQL.
 */

export type JobType = "Full Time" | "Internship" | "Part Time" | "Contract";

export type ApplicationStage =
  "applied" | "shortlisted" | "interview" | "offer" | "hired" | "rejected";

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

export interface LearningRecommendation {
  skill: string;
  time_to_learn: string;
  key_topics: string[];
  resource: string;
  score_boost: number;
}

export interface SkillMatch {
  /** 0-100, computed server-side. */
  score: number;
  overall_match?: number;
  skill_fit?: number;
  experience_fit?: number;
  education_fit?: number;
  location_fit?: number;
  verified_confidence?: number;
  matched: string[];
  matched_skills?: string[];
  missing: string[];
  missing_skills?: string[];
  fit_level?: "Strong Fit" | "Moderate Fit" | "Developing Fit" | string;
  explanation?: string;
  why_this_match?: string;
  strengths?: string[];
  learning_paths?: LearningRecommendation[];
  what_to_improve?: LearningRecommendation[];
  role_fit_score?: number;
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
  appId?: string;
  name: string;
  avatarUrl: string | null;
  college: string;
  program: string;
  experience: string;
  skills: string[];
  match: SkillMatch | null;
  stage: ApplicationStage;
  appliedAt: string;
  jobTitle?: string;
  location?: string;
  graduationYear?: number;
  roleFitScore?: number;
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
  offer: number;
  hired: number;
}

export interface SkillProof {
  skill_id: string;
  skill_name: string;
  proficiency: string;
  confidence_score: number;
  confidence_level: string;
  is_verified: boolean;
  evidence: {
    self_declared: boolean;
    resume_evidence: boolean;
    project_evidence: boolean;
    assessment: boolean;
    assessment_score: number;
    github_evidence: boolean;
  };
}

export type UserRole = "student" | "recruiter" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  profile?: {
    id?: string;
    name?: string;
    college?: string;
    program?: string;
    company_name?: string;
    industry?: string;
    verified?: boolean;
    skills?: Array<{ skill_name: string; proficiency: number }>;
  } | null;
}

export interface AIResumeAnalysis {
  headline: string;
  summary: string;
  key_strengths: string[];
  improvement_tips: string[];
  ats_score: number | null;
  experience_level: "Fresher" | "Junior" | "Mid" | string;
}

export interface AIMatchExplanation {
  verdict: "Strong Match" | "Good Match" | "Moderate Match" | "Reach Role" | string;
  fit_paragraph: string;
  top_reasons: string[];
  gap_summary: string;
  recruiter_tip: string;
  confidence: number;
  missing_skills?: string[];
}

export interface AIRoadmapStep {
  skill: string;
  priority: "High" | "Medium" | "Low" | string;
  weeks: number;
  why_needed: string;
  resources: string[];
  quick_win: string;
}

export interface AISkillGapAnalysis {
  gap_skills: string[];
  readiness_score: number;
  time_to_ready: string;
  roadmap: AIRoadmapStep[];
  encouragement: string;
}

export interface AIRecruiterInsights {
  pipeline_health: "Healthy" | "Growing" | "Needs Attention" | string;
  summary: string;
  top_insight: string;
  action_recommendations: string[];
  conversion_tip: string;
  talent_pool_quality: "Strong" | "Moderate" | "Thin" | string;
}

export interface AIRecommendedJob extends Job {
  ai_reason?: string;
  fit_label?: "Perfect Fit" | "Great Match" | "Good Match" | "Worth Trying" | string;
  missing_count?: number;
}
