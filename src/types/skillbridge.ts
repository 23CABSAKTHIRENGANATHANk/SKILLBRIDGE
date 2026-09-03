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

export type UserRole = "student" | "recruiter" | "admin" | "college_admin";


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

// ---------------------------------------------------------------------------
// SkillBridge 3.0 — Student Career Evolution Interfaces
// ---------------------------------------------------------------------------

export interface CareerGoal {
  id?: string;
  target_role: string;
  target_industry?: string | null;
  preferred_location?: string | null;
  experience_level?: "entry" | "mid" | "senior" | string;
  target_timeline_weeks: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReadinessSkillBreakdown {
  skill: string;
  readiness: number;
  status: "verified" | "assessed" | "claimed" | "missing" | string;
  evidence_level: string;
  confidence: number;
}

export interface CareerReadiness {
  target_role: string;
  overall_readiness: number;
  required_skills_count: number;
  matched_skills_count: number;
  verified_skills_count: number;
  breakdown: ReadinessSkillBreakdown[];
}

export interface SkillGapItem {
  skill: string;
  readiness: number;
  status: "strong" | "needs_improvement" | "missing" | string;
  priority?: "HIGH" | "MEDIUM" | "LOW" | string;
  current_level?: string;
  target_level?: string;
  reason?: string;
  estimated_effort?: string;
  detail?: string;
}

export interface SkillGapAnalysis {
  target_role: string;
  readiness_score: number;
  strong: SkillGapItem[];
  needs_improvement: SkillGapItem[];
  missing: SkillGapItem[];
  total_gaps: number;
}

export interface NextBestAction {
  type: "complete_assessment" | "learn_skill" | "connect_github" | "apply_jobs" | string;
  badge: string;
  skill: string;
  title: string;
  reason: string;
  cta_label: string;
  cta_url: string;
  impact: string;
}

export interface CareerRoadmapStep {
  id: string;
  phase_number: number;
  title: string;
  skill_name: string;
  description?: string | null;
  resource_type: "learn" | "practice" | "build" | "assess" | "verify" | string;
  estimated_hours: number;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface CareerRoadmap {
  id: string;
  student_id: string;
  target_role: string;
  total_weeks: number;
  progress_pct: number;
  status: "active" | "completed" | "archived" | string;
  created_at: string;
}

export interface CareerRoadmapResponse {
  roadmap: CareerRoadmap;
  steps: CareerRoadmapStep[];
  completed_steps: number;
  total_steps: number;
  progress_pct: number;
}

export interface WeeklyPlanTask {
  id: string;
  day_of_week: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" | string;
  title: string;
  task_type: "learn" | "practice" | "video" | "project" | "assess" | "github" | "review" | string;
  duration_minutes: number;
  skill?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface WeeklyCareerPlanResponse {
  plan: {
    id: string;
    student_id: string;
    week_start_date: string;
    target_hours: number;
    completed_hours: number;
    status: string;
  };
  tasks: WeeklyPlanTask[];
  completed_hours: number;
  target_hours: number;
  total_tasks: number;
  completed_tasks: number;
}

export interface CareerOpportunityItem {
  job_id: string;
  title: string;
  company_name: string;
  location: string;
  type: string;
  salary_range?: string | null;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  potential_improvement?: string | null;
}

export interface CareerOpportunitiesResponse {
  ready_now: CareerOpportunityItem[];
  almost_ready: CareerOpportunityItem[];
  future_target: CareerOpportunityItem[];
  counts: {
    ready_now: number;
    almost_ready: number;
    future_target: number;
  };
}

export interface KnowledgeEvolutionEvent {
  id: number;
  event_type: "skill_learned" | "assessment_passed" | "skill_verified" | "project_added" | "github_analyzed" | "interview_completed" | "job_applied" | "passport_issued" | string;
  title: string;
  description?: string | null;
  metadata?: Record<string, any>;
  event_date: string;
}

export interface StudentAchievement {
  badge_key: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

export interface LearningResource {
  id: string;
  skill: string;
  title: string;
  provider: string;
  resource_type: "course" | "video" | "playlist" | "documentation" | "article" | "practice";
  level: "beginner" | "intermediate" | "advanced";
  url: string;
  duration?: string | null;
  is_free: boolean;
  relevance_reason?: string | null;
  verified_at: string;
}

export interface CareerDashboardAggregated {
  student: {
    id: string;
    name: string;
    college: string;
    program: string;
    experience: string;
  };
  goal: CareerGoal | null;
  readiness: CareerReadiness;
  gaps: SkillGapAnalysis;
  next_action: NextBestAction;
  roadmap: CareerRoadmapResponse;
  weekly_plan: WeeklyCareerPlanResponse;
  opportunities: CareerOpportunitiesResponse;
  evolution: {
    events: KnowledgeEvolutionEvent[];
    total_events: number;
  };
  achievements: {
    achievements: StudentAchievement[];
    total_unlocked: number;
    learning_streak_days: number;
  };
}

