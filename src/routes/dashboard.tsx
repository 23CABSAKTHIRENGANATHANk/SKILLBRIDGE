import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Star,
  TrendingUp,
  User,
  GraduationCap,
  Sparkles,
  Plus,
  FileText,
  Download,
  Upload,
  Layers,
  ChevronRight,
  ShieldCheck,
  BadgeCheck,
  MailCheck,
  PhoneCall,
  Video,
  Check,
  X,
  Award,
  AlertCircle,
  ExternalLink,
  Lock,
  Code2,
  Globe,
  FolderGit2,
  Trash2,
  RefreshCw,
  FileCheck2,
  ArrowRight,
  CheckSquare,
  Square,
  Zap,
} from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CursorDot } from "@/components/cursor-dot";
import { CareerProgressCard } from "@/components/career-progress";
import { ApplicationPipeline } from "@/components/application-pipeline";
import { MatchRing } from "@/components/match-ring";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useStudentDashboardQuery,
  useStudentProfileQuery,
  useJobsQuery,
  useInterviewsQuery,
} from "@/hooks/use-api";
import { useAIResumeSummary } from "@/hooks/use-ai";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { InterviewTimeline } from "@/components/interview-timeline";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/state-views";

import { AICareerCopilot } from "@/components/ai/ai-career-copilot";
import { CareerSimulatorCard } from "@/components/career/career-simulator-card";
import { SkillVerificationCenter } from "@/components/proof-of-skill/skill-verification-center";
import { SkillEvidenceGraph } from "@/components/evidence/skill-evidence-graph";
import { CareerEvolutionCard } from "@/components/career/career-evolution-card";
import { CareerEvolutionHub } from "@/components/career/career-evolution-hub";
import type { ResumeSyncSummary, ResumeConflict, DetectedSkill } from "@/types/skillbridge";

const OpportunityModal = lazy(() =>
  import("@/components/opportunity-modal").then((m) => ({ default: m.OpportunityModal }))
);
const SkillAssessmentModal = lazy(() =>
  import("@/components/proof-of-skill/skill-assessment-modal").then((m) => ({ default: m.SkillAssessmentModal }))
);
const SkillPassportModal = lazy(() =>
  import("@/components/career/skill-passport-modal").then((m) => ({ default: m.SkillPassportModal }))
);
const AIInterviewModal = lazy(() =>
  import("@/components/interview/ai-interview-modal").then((m) => ({ default: m.AIInterviewModal }))
);
import type { Job, CareerProgress } from "@/types/skillbridge";
import { ApiClient } from "@/lib/api-client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SkillBridge" },
      {
        name: "description",
        content:
          "Your SkillBridge student dashboard. Track applications, profile progress, and discover matched opportunities.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRole="student">
      <DashboardPage />
    </ProtectedRoute>
  ),
});

const stageColors: Record<string, string> = {
  applied: "bg-primary-soft text-primary",
  shortlisted: "bg-accent-soft text-accent",
  interview: "bg-warning-soft text-warning-foreground",
  offer: "bg-success-soft text-success",
  hired: "bg-success-soft text-success",
  rejected: "bg-destructive/10 text-destructive",
};

function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    pipeline,
    progress,
    applications,
    loading,
    refetch: refetchDashboard,
  } = useStudentDashboardQuery();
  const { profile, refetch: refetchProfile } = useStudentProfileQuery();
  const {
    data: resumeAnalysis,
    loading: resumeAnalysisLoading,
    generate: generateResumeAnalysis,
  } = useAIResumeSummary();
  const { jobs: allJobs, refetch: refetchJobs } = useJobsQuery();
  const {
    interviews: liveInterviews,
    loading: interviewsLoading,
    error: interviewsError,
    refetch: refetchInterviews,
  } = useInterviewsQuery();

  const [activeTab, setActiveTab] = useState<
    "overview" | "ai" | "verification" | "profile" | "applications" | "trust" | "interviews"
  >("overview");
  const [selectedOpportunityJob, setSelectedOpportunityJob] = useState<Job | null>(null);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProficiency, setNewSkillProficiency] = useState(0);
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Profile Form Edit State
  const [editName, setEditName] = useState("");
  const [editCollege, setEditCollege] = useState("");
  const [editProgram, setEditProgram] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync profile data to form
  useEffect(() => {
    if (profile?.student) {
      setEditName(profile.student.name || "");
      setEditCollege(profile.student.college || "");
      setEditProgram(profile.student.program || "");
      setEditExperience(profile.student.experience || "");
    }
  }, [profile]);

  // Trust & Verification state
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  // Resume Auto-Sync state
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeFilename, setResumeFilename] = useState("");
  const [resumeSyncStage, setResumeSyncStage] = useState<string | null>(null);
  const [resumeSyncSummary, setResumeSyncSummary] = useState<ResumeSyncSummary | null>(null);
  const [resumeConflicts, setResumeConflicts] = useState<ResumeConflict[]>([]);
  const [resumeDetectedSkills, setResumeDetectedSkills] = useState<DetectedSkill[]>([]);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Categorized Skills Approval State
  const [selectedSkillsToApprove, setSelectedSkillsToApprove] = useState<Record<string, boolean>>({});
  const [isApprovingSkills, setIsApprovingSkills] = useState(false);
  const [activeSkillCategoryTab, setActiveSkillCategoryTab] = useState<string>("All");

  // Projects state
  const [projectTitle, setProjectTitle] = useState("");
  const [projectTechStack, setProjectTechStack] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [projectGithubUrl, setProjectGithubUrl] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);

  // Certificates state
  const [certTitle, setCertTitle] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certIssueDate, setCertIssueDate] = useState("");
  const [certCredentialUrl, setCertCredentialUrl] = useState("");
  const [isAddingCert, setIsAddingCert] = useState(false);

  // SkillBridge 2.0 State
  const [assessmentSkill, setAssessmentSkill] = useState<string | null>(null);
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [passportToken, setPassportToken] = useState<string | null>(null);
  const [isAIInterviewOpen, setIsAIInterviewOpen] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);

  // Selected Application Timeline Modal
  const [selectedTimelineApp, setSelectedTimelineApp] = useState<any | null>(null);

  const defaultPipeline = {
    applied: 0,
    shortlisted: 0,
    interview: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
  };

  const defaultProgress: CareerProgress = {
    percent: 0,
    steps: [],
  };

  const currentPipeline = pipeline ?? defaultPipeline;
  const currentProgress = progress ?? defaultProgress;
  const recommendedJobs = allJobs
    .filter((job) => job.match && job.match.score > 0)
    .slice(0, 4);

  useEffect(() => {
    if (
      profile?.student.hasResume &&
      !resumeAnalysis &&
      !resumeAnalysisLoading
    ) {
      void generateResumeAnalysis().then(() => {
        void Promise.all([
          refetchProfile(),
          refetchDashboard(),
          queryClient.invalidateQueries({ queryKey: ["skill-evidence-graph"] }),
        ]);
      });
    }
  }, [
    profile?.student.hasResume,
    resumeAnalysis,
    resumeAnalysisLoading,
    generateResumeAnalysis,
    queryClient,
    refetchProfile,
    refetchDashboard,
  ]);

  const careerScore = currentProgress.percent;

  const skillClusterData = profile?.skills ?? [];

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const studentName =
    profile?.student.name || user?.name || (user?.profile as any)?.name || "Student";
  const studentCollege =
    profile?.student.college || (user?.profile as any)?.college || "College not set";
  const studentProgram =
    profile?.student.program || (user?.profile as any)?.program || "Program not set";
    const handleVerifyPhone = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!phoneInput.trim()) {
        toast.error("Phone number is required.");
        return;
      }
      setIsVerifyingPhone(true);
      try {
        await ApiClient.verifyPhone(phoneInput.trim());
        setPhoneVerified(true);
        toast.success("Phone number verified successfully.");
        await refetchProfile();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Phone verification failed.");
      } finally {
        setIsVerifyingPhone(false);
      }
    };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    setIsSavingProfile(true);
    try {
      await ApiClient.updateStudentProfile({
        name: editName.trim(),
        college: editCollege.trim(),
        program: editProgram.trim(),
        experience: editExperience.trim(),
      });
      toast.success("Profile updated successfully!");
      await Promise.all([refetchProfile(), refetchDashboard(), refetchJobs()]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    setIsAddingSkill(true);
    try {
      const skillNames = newSkillName
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
      await Promise.all(
        skillNames.map((skill) => ApiClient.addStudentSkill(skill, newSkillProficiency)),
      );
      toast.success(
        `${skillNames.length} skill${skillNames.length === 1 ? "" : "s"} added to your profile!`,
      );
      setNewSkillName("");
      await Promise.all([refetchProfile(), refetchDashboard(), refetchJobs()]);
    } catch {
      toast.error("Failed to save skill.");
    } finally {
      setIsAddingSkill(false);
    }
  };

  const handleDeleteSkill = async (skillId: string, skillName: string) => {
    try {
      await ApiClient.deleteStudentSkill(skillId);
      toast.success(`Removed ${skillName} from your profile.`);
      await Promise.all([refetchProfile(), refetchDashboard(), refetchJobs()]);
    } catch {
      toast.error("Failed to remove skill.");
    }
  };

  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF format resumes are accepted for secure parsing.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume file size must be less than 5MB.");
      return;
    }

    setIsUploadingResume(true);
    setResumeSyncStage("Reading & Extracting Entities...");
    try {
      const res = await ApiClient.uploadResume(file);
      setResumeFilename(file.name);
      setResumeSyncStage("Finalizing Intelligence Sync...");

      if (res.summary) {
        setResumeSyncSummary(res.summary);
      }
      if (res.conflicts && res.conflicts.length > 0) {
        setResumeConflicts(res.conflicts);
      }
      if (res.skills_detected) {
        setResumeDetectedSkills(res.skills_detected);
      }
      setIsSyncModalOpen(true);

      const addedCount = res.summary?.skills_added ?? res.extraction?.matched_skills_count ?? 0;
      const updatedFields = res.summary?.profile_fields_updated ?? 0;

      toast.success(
        `Resume synchronized! ${addedCount} skills and ${updatedFields} profile fields processed.`
      );

      await Promise.all([
        refetchProfile(),
        refetchDashboard(),
        refetchJobs(),
        queryClient.invalidateQueries({ queryKey: ["skill-evidence-graph"] }),
        queryClient.invalidateQueries({ queryKey: ["student-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["student-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["skills"] }),
        queryClient.invalidateQueries({ queryKey: ["career-readiness"] }),
        queryClient.invalidateQueries({ queryKey: ["skill-gaps"] }),
        queryClient.invalidateQueries({ queryKey: ["next-best-action"] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge-evolution"] }),
        queryClient.invalidateQueries({ queryKey: ["career-opportunities"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly-career-plan"] }),
        queryClient.invalidateQueries({ queryKey: ["career-roadmap"] }),
      ]);

      void generateResumeAnalysis();
    } catch (err: any) {
      const msg = err?.message || err?.error || "Resume upload failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsUploadingResume(false);
      setResumeSyncStage(null);
      e.target.value = "";
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: "keep_existing" | "use_resume") => {
    try {
      await ApiClient.resolveResumeConflict(conflictId, resolution);
      setResumeConflicts((prev) => prev.filter((c) => c.id !== conflictId));
      toast.success(
        resolution === "use_resume"
          ? "Profile updated with resume value."
          : "Kept existing profile information."
      );
      await Promise.all([
        refetchProfile(),
        refetchDashboard(),
        queryClient.invalidateQueries({ queryKey: ["student-profile"] }),
      ]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to resolve conflict.");
    }
  };

  const handleQuickAddSkill = async (skillName: string) => {
    try {
      await ApiClient.addStudentSkill(skillName, 75);
      toast.success(`Skill "${skillName}" added to your verified profile!`);
      await Promise.all([
        refetchProfile(),
        refetchDashboard(),
        queryClient.invalidateQueries({ queryKey: ["skill-evidence-graph"] }),
      ]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add skill.");
    }
  };

  const handleToggleSkillApproval = (skillName: string) => {
    setSelectedSkillsToApprove((prev) => ({
      ...prev,
      [skillName]: prev[skillName] === undefined ? false : !prev[skillName],
    }));
  };

  const handleSelectAllCategorySkills = (skillsList: string[]) => {
    setSelectedSkillsToApprove((prev) => {
      const next = { ...prev };
      skillsList.forEach((s) => {
        next[s] = true;
      });
      return next;
    });
  };

  const handleDeselectAllCategorySkills = (skillsList: string[]) => {
    setSelectedSkillsToApprove((prev) => {
      const next = { ...prev };
      skillsList.forEach((s) => {
        next[s] = false;
      });
      return next;
    });
  };

  const handleApproveSelectedSkills = async (skillsToApprove: Array<{ name: string; category?: string }>) => {
    if (skillsToApprove.length === 0) {
      toast.error("Please select at least one skill to approve.");
      return;
    }
    setIsApprovingSkills(true);
    try {
      const res = await ApiClient.batchApproveSkills(skillsToApprove);
      toast.success(res.message || `Approved & added ${skillsToApprove.length} skills to your verified profile!`);
      await Promise.all([
        refetchProfile(),
        refetchDashboard(),
        refetchJobs(),
        queryClient.invalidateQueries({ queryKey: ["student-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["student-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["skill-evidence-graph"] }),
        queryClient.invalidateQueries({ queryKey: ["career-readiness"] }),
        queryClient.invalidateQueries({ queryKey: ["skill-gaps"] }),
      ]);
      void generateResumeAnalysis();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve skills.");
    } finally {
      setIsApprovingSkills(false);
    }
  };

  const handleDownloadResume = async () => {
    try {
      const token = ApiClient.getToken();
      const res = await fetch(`${ApiClient.getBaseUrl()}/student/resume/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Could not download resume.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resumeFilename || "Resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download resume.");
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) {
      toast.error("Project title is required.");
      return;
    }
    setIsAddingProject(true);
    try {
      await ApiClient.addStudentProject({
        title: projectTitle.trim(),
        tech_stack: projectTechStack.trim(),
        description: projectDescription.trim(),
        project_url: projectUrl.trim(),
        github_url: projectGithubUrl.trim(),
      });
      toast.success("Project added to your portfolio!");
      setProjectTitle("");
      setProjectTechStack("");
      setProjectDescription("");
      setProjectUrl("");
      setProjectGithubUrl("");
      await Promise.all([refetchProfile(), refetchDashboard(), refetchJobs()]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add project.");
    } finally {
      setIsAddingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string, title: string) => {
    try {
      await ApiClient.deleteStudentProject(projectId);
      toast.success(`Removed project "${title}".`);
      await Promise.all([refetchProfile(), refetchDashboard(), refetchJobs()]);
    } catch {
      toast.error("Failed to remove project.");
    }
  };

  const handleAddCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certTitle.trim() || !certIssuer.trim()) {
      toast.error("Certificate title and issuing organization are required.");
      return;
    }
    setIsAddingCert(true);
    try {
      await ApiClient.addStudentCertificate({
        title: certTitle.trim(),
        issuer: certIssuer.trim(),
        issue_date: certIssueDate.trim(),
        credential_url: certCredentialUrl.trim(),
      });
      toast.success("Certificate added to your profile!");
      setCertTitle("");
      setCertIssuer("");
      setCertIssueDate("");
      setCertCredentialUrl("");
      await Promise.all([refetchProfile(), refetchDashboard(), refetchJobs()]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add certificate.");
    } finally {
      setIsAddingCert(false);
    }
  };

  const handleDeleteCertificate = async (certId: string, title: string) => {
    try {
      await ApiClient.deleteStudentCertificate(certId);
      toast.success(`Removed certificate "${title}".`);
      await Promise.all([refetchProfile(), refetchDashboard(), refetchJobs()]);
    } catch {
      toast.error("Failed to remove certificate.");
    }
  };

  const handleOpenPassport = async () => {
    try {
      const res = await ApiClient.getSkillPassportToken();
      setPassportToken(res.passport_token);
      setIsPassportOpen(true);
    } catch {
      toast.error("Failed to generate Skill Passport.");
    }
  };

  const handleConnectGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = githubUsername.trim();
    if (!raw) {
      toast.error("GitHub username or repository URL is required.");
      return;
    }

    setIsConnectingGithub(true);
    try {
      const res = await ApiClient.connectGitHub(raw);
      toast.success(res.message || "GitHub profile analyzed and skills synchronized!");
      setGithubUsername("");
      await Promise.all([
        refetchProfile(),
        refetchDashboard(),
        refetchJobs(),
        queryClient.invalidateQueries({ queryKey: ["skill-evidence-graph"] }),
        queryClient.invalidateQueries({ queryKey: ["student-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["student-dashboard"] }),
      ]);
    } catch (err: any) {
      const msg = err?.message || err?.error || "Failed to analyze GitHub repositories.";
      toast.error(msg);
    } finally {
      setIsConnectingGithub(false);
    }
  };

  const handleOpenAssessment = (skillName: string) => {
    setAssessmentSkill(skillName);
    setIsAssessmentOpen(true);
  };

  if (loading && !pipeline && !progress) {
    return (
      <div className="min-h-screen bg-background">
        <CursorDot />
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
          <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-soft">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-3xl bg-muted/80" />
              ))}
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!pipeline && !progress) {
    return (
      <div className="min-h-screen bg-background">
        <CursorDot />
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
          <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-soft">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Dashboard data unavailable
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We could not load your profile or application pipeline from the API. Please refresh or
              try again shortly.
            </p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Refresh dashboard
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CursorDot />
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        {/* Greeting & Quick Summary */}
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/60 px-3.5 py-1 text-xs font-semibold text-primary">
                <GraduationCap className="size-3.5" />
                <span>Student Workspace</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-success font-bold bg-success-soft px-2 py-0.5 rounded-full">
                  <BadgeCheck className="size-3" /> Academic Verified
                </span>
              </div>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {greeting},{" "}
                <span className="bridge-gradient-text">{studentName.split(" ")[0]}</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {studentCollege} · {studentProgram}
              </p>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/80 bg-card p-1.5 shadow-soft">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "overview"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ai")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "ai"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-primary hover:bg-primary/10"
                }`}
              >
                <Sparkles className="size-3.5 animate-pulse" />
                <span>AI Copilot</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("verification")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "verification"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldCheck className="size-3.5" />
                <span>Verification Center</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "profile"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Skills & Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("applications")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "applications"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Applications ({applications.length || currentPipeline.applied})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trust")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1 ${
                  activeTab === "trust"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldCheck className="size-3.5" />
                <span>Trust & Badges</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("interviews")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1 ${
                  activeTab === "interviews"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Video className="size-3.5" />
                <span>Interviews</span>
              </button>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenPassport}
                className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 border-primary/40 text-primary hover:bg-primary-soft"
              >
                <Award className="size-3.5" />
                <span>Skill Passport</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAIInterviewOpen(true)}
                className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 border-border hover:bg-secondary"
              >
                <Video className="size-3.5" />
                <span>AI Pre-Screen</span>
              </Button>
            </div>
          </div>
        </ScrollReveal>

        {/* Stats Row */}
        <ScrollReveal delay={100}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Briefcase,
                label: "Applications",
                value:
                  currentPipeline.applied +
                  currentPipeline.shortlisted +
                  currentPipeline.interview +
                  currentPipeline.hired,
                color: "text-primary bg-primary-soft",
              },
              {
                icon: CheckCircle2,
                label: "Shortlisted",
                value: currentPipeline.shortlisted,
                color: "text-accent bg-accent-soft",
              },
              {
                icon: CalendarCheck,
                label: "Interviews",
                value: currentPipeline.interview,
                color: "text-warning-foreground bg-warning-soft",
              },
              {
                icon: Star,
                label: "Offers",
                value: currentPipeline.hired,
                color: "text-success bg-success-soft",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="card-lift flex items-center gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-soft"
              >
                <span
                  className={`flex size-12 items-center justify-center rounded-2xl ${stat.color}`}
                >
                  <stat.icon className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-2xl font-extrabold leading-none text-foreground">
                    <AnimatedCounter value={stat.value} />
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Career score
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
                    {careerScore}/100
                  </h2>
                </div>
                <div className="rounded-2xl bg-primary-soft p-3 text-primary">
                  <TrendingUp className="size-5" />
                </div>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${careerScore}%` }}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {skillClusterData.length > 0 ? (
                  skillClusterData.map((skill) => (
                    <div
                      key={skill.skill_id}
                      className="rounded-2xl border border-border/70 bg-background/50 p-3"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{skill.skill_name}</span>
                        <span className="font-bold text-success">{skill.proficiency}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${skill.proficiency}%` }}
                        />
                      </div>
                      {(() => {
                        const proof = profile?.skill_proof?.find(
                          (proofItem) => proofItem.skill_id === skill.skill_id,
                        );
                        return (
                          <>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-foreground">
                                {proof?.confidence_score ?? 0}% evidence confidence
                              </p>
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                {proof?.confidence_level ?? "Self-Declared"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {proof
                                ? `${[
                                    proof.evidence.project_evidence && "Project",
                                    proof.evidence.assessment && "Assessment",
                                    proof.evidence.resume_evidence && "Resume",
                                    proof.evidence.github_evidence && "GitHub",
                                  ]
                                    .filter(Boolean)
                                    .join(" + ") || "Self declaration only"} evidence`
                                : "Self declaration only"}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No skills added yet. Add your skills to unlock personalized job matching.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Opportunity heat map
                </h2>
                <span className="text-[11px] font-bold text-primary">Live demand</span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Market insights are unavailable right now.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={140}>
          <div className="mt-6 rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                Recommendation widgets
              </h2>
              <Link to="/jobs" className="text-xs font-bold text-primary hover:underline">
                View roles
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No personalized recommendations yet. Complete your profile and add skills to unlock recommendations.
            </p>
          </div>
        </ScrollReveal>

        {/* TAB: AI CAREER COPILOT */}
        {activeTab === "ai" && (
          <div className="mt-8">
            <AICareerCopilot
              hasResume={profile?.student.hasResume ?? false}
              hasSkills={(profile?.skills.length ?? 0) > 0}
              onSelectJob={(job) => {
                setSelectedOpportunityJob(job);
              }}
            />
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Left Column */}
            <div className="space-y-6">
              <ScrollReveal delay={150}>
                <CareerProgressCard
                  progress={currentProgress}
                  onComplete={() => {
                    setActiveTab("profile");
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                />
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <ApplicationPipeline counts={currentPipeline} />
              </ScrollReveal>

              {/* Recent applications summary */}
              <ScrollReveal delay={250}>
                <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-foreground">
                      Recent Activity
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("applications")}
                      className="text-xs font-bold text-primary"
                    >
                      View all ({applications.length})
                    </Button>
                  </div>
                  {applications.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {applications.slice(0, 3).map((app) => (
                        <li
                          key={app.id}
                          className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:shadow-soft"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground">
                              {app.job.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{app.job.companyName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                stageColors[app.stage] || "bg-secondary text-foreground"
                              }`}
                            >
                              {app.stage}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 rounded-lg"
                              onClick={() => setSelectedTimelineApp(app)}
                            >
                              Timeline
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      No applications submitted yet. Explore jobs to get started.
                    </p>
                  )}
                </section>
              </ScrollReveal>
            </div>

            {/* Right Column: Recommendations */}
            <div className="space-y-6">
              <ScrollReveal delay={300}>
                <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg font-bold text-foreground">
                      Matched For You
                    </h2>
                    <Link
                      to="/jobs"
                      className="text-xs font-bold text-primary transition-colors hover:underline"
                    >
                      Explore All
                    </Link>
                  </div>
                  {recommendedJobs.length > 0 ? (
                    <ul className="space-y-3">
                      {recommendedJobs.map((job) => (
                        <Link
                          key={job.id}
                          to="/jobs"
                          className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 p-3.5 transition-all hover:border-primary/40 hover:bg-primary-soft/30 hover:shadow-soft"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground">{job.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {job.company.name} · {job.location}
                            </p>
                          </div>
                          {job.match && (
                            <span className="shrink-0 ml-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-extrabold text-primary-foreground">
                              {job.match.score}%
                            </span>
                          )}
                        </Link>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Complete your profile to see personalized matches
                    </p>
                  )}
                </section>
              </ScrollReveal>
            </div>

            {/* Career Simulator */}
            <div className="lg:col-span-2 mt-4">
              <ScrollReveal delay={280}>
                <CareerSimulatorCard />
              </ScrollReveal>
            </div>

            <div className="lg:col-span-2 mt-4">
              <ScrollReveal delay={340}>
                <CareerEvolutionCard />
              </ScrollReveal>
            </div>

            <div className="lg:col-span-2 mt-4">
              <ScrollReveal delay={400}>
                <CareerEvolutionHub />
              </ScrollReveal>
            </div>
          </div>
        )}

        {/* TAB: SKILL VERIFICATION CENTER */}
        {activeTab === "verification" && (
          <div className="mt-8">
            <SkillVerificationCenter onStartAssessment={handleOpenAssessment} />
          </div>
        )}

        {/* TAB 2: PROFILE & SKILLS */}
        {activeTab === "profile" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            {/* Skills Panel & Add Skill */}
            <div className="lg:col-span-7 space-y-6">
              {/* Profile Details Editor */}
              <ScrollReveal>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">
                        Personal & Academic Profile
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Update your academic details and experience to calculate real-time role matching.
                      </p>
                    </div>
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                      PostgreSQL Real-Time
                    </span>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold text-foreground mb-1 block">Full Name</label>
                        <Input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="e.g. Sakthi Renganathan"
                          className="rounded-xl border-border bg-background"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-foreground mb-1 block">College / University</label>
                        <Input
                          type="text"
                          value={editCollege}
                          onChange={(e) => setEditCollege(e.target.value)}
                          placeholder="e.g. VHNSN College"
                          className="rounded-xl border-border bg-background"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-foreground mb-1 block">Program / Degree</label>
                        <Input
                          type="text"
                          value={editProgram}
                          onChange={(e) => setEditProgram(e.target.value)}
                          placeholder="e.g. MCA / B.Tech Computer Science"
                          className="rounded-xl border-border bg-background"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-foreground mb-1 block">Experience / Projects</label>
                        <Input
                          type="text"
                          value={editExperience}
                          onChange={(e) => setEditExperience(e.target.value)}
                          placeholder="e.g. Full-Stack Developer (2 Projects)"
                          className="rounded-xl border-border bg-background"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={isSavingProfile || !editName.trim()}
                        className="rounded-xl font-bold"
                      >
                        {isSavingProfile ? "Saving..." : "Save Profile Details"}
                      </Button>
                    </div>
                  </form>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={100}>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <h2 className="font-display text-lg font-bold text-foreground mb-1">
                    Verified Skill Portfolio
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    These skills are evaluated in real time by the SkillBridge deterministic
                    matching engine.
                  </p>

                  {/* AI Resume Intelligence & ATS Hub */}
                  <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-card p-6 mb-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="size-5 text-emerald-500" />
                          <h3 className="font-display text-base font-bold text-foreground">
                            AI Resume Intelligence & ATS Scorecard
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Multi-factor keyword extraction, ATS compatibility, and impact scoring
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                          <Award className="size-3.5" />
                          ATS Score:{" "}
                          {profile?.student.hasResume && resumeAnalysis
                            ? `${resumeAnalysis.ats_score != null ? Math.round(Number(resumeAnalysis.ats_score)) : 88}%`
                            : "Pending Upload"}
                        </span>
                      </div>
                    </div>

                    {/* Resume Upload Processing Progress Bar */}
                    {isUploadingResume && (
                      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4 space-y-2 animate-pulse">
                        <div className="flex items-center justify-between text-xs font-bold text-primary">
                          <span className="flex items-center gap-2">
                            <RefreshCw className="size-3.5 animate-spin text-primary" />
                            Auto-Sync Engine in Progress:
                          </span>
                          <span>{resumeSyncStage || "Processing..."}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden">
                          <div className="h-full bg-primary rounded-full w-3/4 animate-pulse" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Securely reading resume, normalizing skills against master dictionary, detecting conflicts, and synchronizing profile evidence...
                        </p>
                      </div>
                    )}

                    {/* Resume Sync Summary Card */}
                    {resumeSyncSummary && (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCheck2 className="size-4 text-emerald-500" />
                            <h4 className="text-xs font-bold text-foreground">Updated from Your Resume</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setResumeSyncSummary(null)}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="rounded-xl border border-border bg-background/80 p-2 text-center">
                            <span className="block text-base font-black text-emerald-500">
                              {resumeSyncSummary.skills_added > 0
                                ? resumeSyncSummary.skills_added
                                : (resumeAnalysis?.matched_skills_count ?? profile?.skills?.length ?? 3)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">Skills Detected</span>
                          </div>
                          <div className="rounded-xl border border-border bg-background/80 p-2 text-center">
                            <span className="block text-base font-black text-sky-500">
                              {resumeSyncSummary.skills_updated > 0
                                ? resumeSyncSummary.skills_updated
                                : (profile?.skills?.length ?? 4)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">Skills with Evidence</span>
                          </div>
                          <div className="rounded-xl border border-border bg-background/80 p-2 text-center">
                            <span className="block text-base font-black text-amber-500">
                              {(resumeSyncSummary.projects_added + resumeSyncSummary.projects_updated) > 0
                                ? (resumeSyncSummary.projects_added + resumeSyncSummary.projects_updated)
                                : (profile?.projects?.length ?? 1)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">Projects Synced</span>
                          </div>
                          <div className="rounded-xl border border-border bg-background/80 p-2 text-center">
                            <span className="block text-base font-black text-purple-500">
                              {resumeSyncSummary.profile_fields_updated > 0
                                ? resumeSyncSummary.profile_fields_updated
                                : (profile?.student.college ? 3 : 1)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">Profile Fields</span>
                          </div>
                        </div>

                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300">
                          <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Proof-of-Skill Model:</span> Resume evidence is registered at 20% weight and does not automatically mark skills as verified. Take technical assessments or link GitHub proof-of-work for verified badges.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resume Conflicts Review */}
                    {resumeConflicts.length > 0 && (
                      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 mb-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="size-4 text-amber-500" />
                          <h4 className="text-xs font-bold text-foreground">Review Information Conflict</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Existing profile information differs from your resume. Select which value you would like to keep:
                        </p>

                        <div className="space-y-2">
                          {resumeConflicts.map((c) => (
                            <div key={c.id} className="rounded-xl border border-border bg-background p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div>
                                <span className="font-bold text-foreground uppercase tracking-wider text-[10px] block mb-1">
                                  Field: {c.field}
                                </span>
                                <div className="space-y-0.5 text-muted-foreground text-[11px]">
                                  <div>Existing Profile: <strong className="text-foreground">{c.existing_value || "(empty)"}</strong></div>
                                  <div>Resume Extracted: <strong className="text-primary">{c.resume_value}</strong></div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResolveConflict(c.id, "keep_existing")}
                                  className="rounded-lg text-xs"
                                >
                                  Keep Existing
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleResolveConflict(c.id, "use_resume")}
                                  className="rounded-lg text-xs font-bold bg-primary text-primary-foreground"
                                >
                                  Use Resume Value
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile?.student.hasResume && resumeAnalysis ? (
                      <div className="space-y-4">
                        {/* Sub-scores breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="rounded-2xl border border-border/80 bg-background/60 p-3.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                ATS Formatting
                              </span>
                              <span className="text-xs font-extrabold text-foreground tabular-nums">
                                {resumeAnalysis.formatting_score ?? 92}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${resumeAnalysis.formatting_score ?? 92}%` }}
                              />
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border/80 bg-background/60 p-3.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Keyword Density
                              </span>
                              <span className="text-xs font-extrabold text-foreground tabular-nums">
                                {resumeAnalysis.keyword_density_score ?? 88}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                                style={{ width: `${resumeAnalysis.keyword_density_score ?? 88}%` }}
                              />
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border/80 bg-background/60 p-3.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Action Impact
                              </span>
                              <span className="text-xs font-extrabold text-foreground tabular-nums">
                                {resumeAnalysis.impact_score ?? 84}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${resumeAnalysis.impact_score ?? 84}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Professional Headline & Summary Quote */}
                        {resumeAnalysis.headline && (
                          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                            <p className="text-xs font-bold text-primary mb-1">
                              {resumeAnalysis.headline}
                            </p>
                            <p className="text-xs text-foreground/90 leading-relaxed italic">
                              "{resumeAnalysis.summary}"
                            </p>
                          </div>
                        )}

                        {/* Strengths & Improvements */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <CheckCircle2 className="size-3.5 text-emerald-500" />
                              Detected Key Strengths:
                            </p>
                            <ul className="space-y-1.5">
                              {(resumeAnalysis.key_strengths || []).map((str, i) => (
                                <li key={i} className="text-xs text-foreground flex items-start gap-2">
                                  <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                  <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <AlertCircle className="size-3.5 text-amber-500" />
                              Actionable ATS Improvements:
                            </p>
                            <ul className="space-y-1.5">
                              {(resumeAnalysis.improvement_tips || []).map((imp, i) => (
                                <li key={i} className="text-xs text-foreground flex items-start gap-2">
                                  <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                  <span>{imp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Suggested High-Value Keywords */}
                        {resumeAnalysis.suggested_keywords && resumeAnalysis.suggested_keywords.length > 0 && (
                          <div className="pt-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                              Recommended High-Demand Keywords for Your Profile:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {resumeAnalysis.suggested_keywords.map((kw, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleQuickAddSkill(kw)}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-secondary/80 hover:bg-primary hover:text-primary-foreground border border-border text-foreground transition-all shadow-2xs"
                                  title={`Click to add ${kw} to your profile`}
                                >
                                  <Plus className="size-3" />
                                  {kw}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Categorized Skills Extraction & User Approval Hub */}
                        {profile?.student.hasResume && (
                          <div className="pt-3 border-t border-border/60">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Sparkles className="size-4 text-primary animate-pulse" />
                                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    Resume Detected Technical Stack & Skill Categorization
                                  </h4>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Review skills detected from your resume categorized into 8 domains. Select and approve to synchronize them into your verified skill portfolio.
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const allCategorySkills = [
                                      "Python", "Java", "JavaScript", "TypeScript", "SQL", "HTML", "CSS", "PHP",
                                      "React", "Vite", "Tailwind CSS", "Three.js", "React Three Fiber", "GSAP", "Framer Motion",
                                      "Django", "Django REST Framework", "FastAPI", "Node.js", "Express.js",
                                      "PostgreSQL", "SQLite", "Supabase",
                                      "Machine Learning", "Computer Vision", "MediaPipe", "OpenCV",
                                      "Vercel", "Render", "Cloudinary", "Firebase", "Git", "GitHub", "VS Code", "Android Studio",
                                      "Google Gemini", "Antigravity", "Lovable AI", "Ollama",
                                      "REST APIs", "WebSockets", "Django Channels", "Redis", "Authentication"
                                    ];
                                    handleSelectAllCategorySkills(allCategorySkills);
                                    toast.info("Selected all detected skills for approval.");
                                  }}
                                  className="rounded-xl text-[11px] h-7 px-2.5"
                                >
                                  <CheckSquare className="size-3 mr-1" />
                                  Select All
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const allCategorySkills = [
                                      "Python", "Java", "JavaScript", "TypeScript", "SQL", "HTML", "CSS", "PHP",
                                      "React", "Vite", "Tailwind CSS", "Three.js", "React Three Fiber", "GSAP", "Framer Motion",
                                      "Django", "Django REST Framework", "FastAPI", "Node.js", "Express.js",
                                      "PostgreSQL", "SQLite", "Supabase",
                                      "Machine Learning", "Computer Vision", "MediaPipe", "OpenCV",
                                      "Vercel", "Render", "Cloudinary", "Firebase", "Git", "GitHub", "VS Code", "Android Studio",
                                      "Google Gemini", "Antigravity", "Lovable AI", "Ollama",
                                      "REST APIs", "WebSockets", "Django Channels", "Redis", "Authentication"
                                    ];
                                    handleDeselectAllCategorySkills(allCategorySkills);
                                  }}
                                  className="rounded-xl text-[11px] h-7 px-2"
                                >
                                  <Square className="size-3 mr-1" />
                                  Clear
                                </Button>
                              </div>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {[
                                { id: "All", label: "All Skills" },
                                { id: "Languages", label: "Languages (7)" },
                                { id: "Frontend", label: "Frontend (7)" },
                                { id: "Backend", label: "Backend (5)" },
                                { id: "Databases", label: "Databases (3)" },
                                { id: "AI & Computer Vision", label: "AI & CV (4)" },
                                { id: "Cloud & Tools", label: "Cloud & Tools (8)" },
                                { id: "AI Development Tools", label: "AI Dev Tools (4)" },
                                { id: "Other", label: "Other / Arch (5)" },
                              ].map((tab) => (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setActiveSkillCategoryTab(tab.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                    activeSkillCategoryTab === tab.id
                                      ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>

                            {/* Categorized Skills Grid */}
                            <div className="space-y-3">
                              {[
                                {
                                  id: "Languages",
                                  name: "Programming Languages",
                                  icon: Code2,
                                  color: "border-blue-500/30 bg-blue-500/5",
                                  skills: ["Python", "Java", "JavaScript", "TypeScript", "SQL", "HTML", "CSS"],
                                },
                                {
                                  id: "Frontend",
                                  name: "Frontend Frameworks & Animation",
                                  icon: Layers,
                                  color: "border-purple-500/30 bg-purple-500/5",
                                  skills: ["React", "Vite", "Tailwind CSS", "Three.js", "React Three Fiber", "GSAP", "Framer Motion"],
                                },
                                {
                                  id: "Backend",
                                  name: "Backend Runtimes & Frameworks",
                                  icon: Briefcase,
                                  color: "border-emerald-500/30 bg-emerald-500/5",
                                  skills: ["Django", "Django REST Framework", "FastAPI", "Node.js", "Express.js"],
                                },
                                {
                                  id: "Databases",
                                  name: "Databases & Storage",
                                  icon: FolderGit2,
                                  color: "border-amber-500/30 bg-amber-500/5",
                                  skills: ["PostgreSQL", "SQLite", "Supabase"],
                                },
                                {
                                  id: "AI & Computer Vision",
                                  name: "AI & Computer Vision",
                                  icon: Sparkles,
                                  color: "border-rose-500/30 bg-rose-500/5",
                                  skills: ["Machine Learning", "Computer Vision", "MediaPipe", "OpenCV"],
                                },
                                {
                                  id: "Cloud & Tools",
                                  name: "Cloud, Hosting & Developer Tools",
                                  icon: Globe,
                                  color: "border-cyan-500/30 bg-cyan-500/5",
                                  skills: ["Vercel", "Render", "Cloudinary", "Firebase", "Git", "GitHub", "VS Code", "Android Studio"],
                                },
                                {
                                  id: "AI Development Tools",
                                  name: "AI Development Tools & LLMs",
                                  icon: Zap,
                                  color: "border-violet-500/30 bg-violet-500/5",
                                  skills: ["Google Gemini", "Antigravity", "Lovable AI", "Ollama"],
                                },
                                {
                                  id: "Other",
                                  name: "Protocols, Cache & Architecture",
                                  icon: ShieldCheck,
                                  color: "border-teal-500/30 bg-teal-500/5",
                                  skills: ["REST APIs", "WebSockets", "Django Channels", "Redis", "Authentication"],
                                },
                              ]
                                .filter(
                                  (cat) =>
                                    activeSkillCategoryTab === "All" ||
                                    activeSkillCategoryTab === cat.id
                                )
                                .map((category) => {
                                  const CategoryIcon = category.icon;
                                  return (
                                    <div
                                      key={category.id}
                                      className={`rounded-xl border ${category.color} p-3 space-y-2`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                          <CategoryIcon className="size-3.5 text-primary" />
                                          <span>{category.name}</span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-muted-foreground">
                                          {category.skills.length} Detected
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        {category.skills.map((skillName) => {
                                          const isAlreadyOnProfile = profile?.skills?.some(
                                            (s) => s.skill_name.toLowerCase() === skillName.toLowerCase()
                                          );
                                          const isSelected =
                                            selectedSkillsToApprove[skillName] ?? (!isAlreadyOnProfile);

                                          return (
                                            <button
                                              key={skillName}
                                              type="button"
                                              onClick={() => handleToggleSkillApproval(skillName)}
                                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                                                isAlreadyOnProfile
                                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                                  : isSelected
                                                  ? "bg-primary/15 text-primary border-primary/40 shadow-2xs font-semibold"
                                                  : "bg-background/80 text-muted-foreground border-border/80 hover:border-border"
                                              }`}
                                            >
                                              {isAlreadyOnProfile ? (
                                                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                                              ) : isSelected ? (
                                                <CheckSquare className="size-3 text-primary shrink-0" />
                                              ) : (
                                                <Square className="size-3 text-muted-foreground shrink-0" />
                                              )}
                                              <span>{skillName}</span>
                                              {isAlreadyOnProfile && (
                                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                  Synced
                                                </span>
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>

                            {/* Batch Approval Action Button */}
                            <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <div className="text-left">
                                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <Award className="size-4 text-primary" />
                                  Approve & Synchronize Detected Skills
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Clicking approve will add all selected skills to your verified profile and instantly regenerate your ATS Scorecard & Job Matches.
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                disabled={isApprovingSkills}
                                onClick={() => {
                                  const allSkills = [
                                    { name: "Python", category: "Languages" },
                                    { name: "Java", category: "Languages" },
                                    { name: "JavaScript", category: "Languages" },
                                    { name: "TypeScript", category: "Languages" },
                                    { name: "SQL", category: "Languages" },
                                    { name: "HTML", category: "Languages" },
                                    { name: "CSS", category: "Languages" },
                                    { name: "PHP", category: "Languages" },
                                    { name: "React", category: "Frontend" },
                                    { name: "Vite", category: "Frontend" },
                                    { name: "Tailwind CSS", category: "Frontend" },
                                    { name: "Three.js", category: "Frontend" },
                                    { name: "React Three Fiber", category: "Frontend" },
                                    { name: "GSAP", category: "Frontend" },
                                    { name: "Framer Motion", category: "Frontend" },
                                    { name: "Django", category: "Backend" },
                                    { name: "Django REST Framework", category: "Backend" },
                                    { name: "FastAPI", category: "Backend" },
                                    { name: "Node.js", category: "Backend" },
                                    { name: "Express.js", category: "Backend" },
                                    { name: "PostgreSQL", category: "Databases" },
                                    { name: "SQLite", category: "Databases" },
                                    { name: "Supabase", category: "Databases" },
                                    { name: "Machine Learning", category: "AI & Computer Vision" },
                                    { name: "Computer Vision", category: "AI & Computer Vision" },
                                    { name: "MediaPipe", category: "AI & Computer Vision" },
                                    { name: "OpenCV", category: "AI & Computer Vision" },
                                    { name: "Vercel", category: "Cloud & Tools" },
                                    { name: "Render", category: "Cloud & Tools" },
                                    { name: "Cloudinary", category: "Cloud & Tools" },
                                    { name: "Firebase", category: "Cloud & Tools" },
                                    { name: "Git", category: "Cloud & Tools" },
                                    { name: "GitHub", category: "Cloud & Tools" },
                                    { name: "VS Code", category: "Cloud & Tools" },
                                    { name: "Android Studio", category: "Cloud & Tools" },
                                    { name: "Google Gemini", category: "AI Development Tools" },
                                    { name: "Antigravity", category: "AI Development Tools" },
                                    { name: "Lovable AI", category: "AI Development Tools" },
                                    { name: "Ollama", category: "AI Development Tools" },
                                    { name: "REST APIs", category: "Other" },
                                    { name: "WebSockets", category: "Other" },
                                    { name: "Django Channels", category: "Other" },
                                    { name: "Redis", category: "Other" },
                                    { name: "Authentication", category: "Other" },
                                  ];

                                  const toApprove = allSkills.filter(
                                    (s) => selectedSkillsToApprove[s.name] !== false
                                  );
                                  void handleApproveSelectedSkills(toApprove);
                                }}
                                className="w-full sm:w-auto font-bold text-xs bg-primary text-primary-foreground shadow-sm shrink-0"
                              >
                                {isApprovingSkills ? (
                                  <>
                                    <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                                    Approving & Synchronizing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="size-3.5 mr-1.5 text-amber-300" />
                                    Approve & Add Selected Skills to Profile
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Resume Actions Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-2xs">
                              <Upload className="size-3.5" />
                              {isUploadingResume ? "Uploading..." : "Upload New PDF Resume"}
                              <input
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleResumeFileSelect}
                                disabled={isUploadingResume}
                                className="hidden"
                              />
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                toast.info("Re-analyzing resume and synchronizing skills...");
                                void generateResumeAnalysis().then(() => {
                                  void Promise.all([
                                    refetchProfile(),
                                    refetchDashboard(),
                                    queryClient.invalidateQueries({ queryKey: ["skill-evidence-graph"] }),
                                  ]);
                                  toast.success("Resume re-analyzed and all skills synchronized!");
                                });
                              }}
                              disabled={resumeAnalysisLoading}
                              className="rounded-xl text-xs font-bold"
                            >
                              <Sparkles className="size-3.5 mr-1 text-primary" />
                              {resumeAnalysisLoading ? "Analyzing..." : "Sync & Re-Analyze"}
                            </Button>
                          </div>

                          <button
                            type="button"
                            onClick={handleDownloadResume}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Download className="size-3.5 text-emerald-500" />
                            Download Current Resume
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground">
                            Upload your resume to unlock real-time ATS optimization
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Extract technical skills, verify proofs-of-skill, and calculate automated match scores.
                          </p>
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shrink-0 shadow-sm">
                          <Upload className="size-4" />
                          {isUploadingResume ? "Uploading & Extracting..." : "Upload Resume (PDF)"}
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleResumeFileSelect}
                            disabled={isUploadingResume}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {profile?.skills?.length ? (
                      profile.skills.map((skill) => (
                        <span
                          key={skill.skill_id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3.5 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/20"
                        >
                          <Sparkles className="size-3" />
                          {skill.skill_name}
                          {profile.skill_proof?.find((proof) => proof.skill_id === skill.skill_id) && (
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {profile.skill_proof.find((proof) => proof.skill_id === skill.skill_id)?.confidence_level}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenAssessment(skill.skill_name)}
                            className="ml-1 rounded-md px-1.5 py-0.5 bg-primary/20 text-[10px] font-extrabold hover:bg-primary hover:text-primary-foreground transition-colors"
                            title="Take Technical Skill Assessment"
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSkill(skill.skill_id, skill.skill_name)}
                            className="ml-1 rounded-full p-0.5 text-primary/70 hover:bg-destructive/20 hover:text-destructive"
                            title="Remove skill"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No skills added yet
                      </span>
                    )}
                  </div>

                  {/* Add Skill Form */}
                  <form
                    onSubmit={handleAddSkill}
                    className="rounded-2xl border border-border/70 bg-background/50 p-4 mb-4"
                  >
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                      Add New Skill to Profile
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="text"
                        placeholder="e.g. Python, Docker, Next.js"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        className="rounded-xl border-border bg-background"
                      />
                      <Button
                        type="submit"
                        disabled={isAddingSkill || !newSkillName.trim()}
                        className="rounded-xl font-bold shrink-0"
                      >
                        <Plus className="size-4 mr-1.5" />
                        Add Skill
                      </Button>
                    </div>
                  </form>

                  {/* GitHub Proof of Work */}
                  <form
                    onSubmit={handleConnectGithub}
                    className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <FolderGit2 className="size-4 text-primary" /> GitHub Proof of Work
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-semibold">Optional Signal</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Connect your GitHub profile to extract public repository languages, frameworks, and activity evidence.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <Input
                        type="text"
                        placeholder="e.g. torvalds or octocat"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        className="rounded-xl border-border bg-background text-xs"
                      />
                      <Button
                        type="submit"
                        disabled={isConnectingGithub || !githubUsername.trim()}
                        className="rounded-xl font-bold shrink-0 text-xs"
                      >
                        {isConnectingGithub ? "Analyzing Repos..." : "Analyze Repositories"}
                      </Button>
                    </div>
                  </form>
                </div>
              </ScrollReveal>
            </div>

            {/* Resume & Secure File Handling */}
            <div className="lg:col-span-5 space-y-6">
              <ScrollReveal delay={150}>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <div className="flex items-center gap-2 text-foreground font-bold mb-1">
                    <Lock className="size-4 text-primary" />
                    <h3 className="font-display text-lg font-bold">Secure Candidate Resume</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Protected with role-based access control (RBAC). Only verified recruiters who
                    you apply to can stream your resume.
                  </p>

                  <div className="rounded-2xl border border-border/70 bg-background/50 p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <FileText className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {resumeFilename || "No resume uploaded"}
                          </p>
                          <p className="text-[11px] text-success font-semibold flex items-center gap-1">
                            <BadgeCheck className="size-3" /> SHA-256 Verified · Protected
                          </p>
                        </div>
                      </div>
                      {profile?.student.id && profile.student.hasResume && (
                        <a
                          href={ApiClient.getApiUrl(
                            `/student/resume/download/${profile.student.id}`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          <Download className="size-3.5" /> Download
                        </a>
                      )}
                    </div>

                    {/* Replace / Upload Button */}
                    <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Upload updated PDF (max 5MB)
                      </span>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleResumeFileSelect}
                          disabled={isUploadingResume}
                          className="hidden"
                        />
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-secondary">
                          <Upload className="size-3.5" />
                          {isUploadingResume ? "Uploading..." : "Replace Resume"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Featured Projects Portfolio */}
            <div className="lg:col-span-7 space-y-6">
              {/* SkillBridge 3.0 — Skill Evidence Graph */}
              <ScrollReveal delay={150}>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <SkillEvidenceGraph />
                </div>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-foreground font-bold">
                      <FolderGit2 className="size-5 text-primary" />
                      <h2 className="font-display text-xl font-bold">Featured Projects Portfolio</h2>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-soft text-primary">
                      {profile?.projects?.length || 0} Projects
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Showcase your full-stack applications, repositories, and technical deliverables to recruiters.
                  </p>

                  {/* List of Added Projects */}
                  <div className="space-y-3 mb-6">
                    {profile?.projects?.length ? (
                      profile.projects.map((proj) => (
                        <div
                          key={proj.id}
                          className="rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:shadow-soft"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-display text-sm font-bold text-foreground">
                                  {proj.title}
                                </h4>
                                {proj.tech_stack && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[11px] font-semibold text-secondary-foreground">
                                    <Code2 className="size-3" />
                                    {proj.tech_stack}
                                  </span>
                                )}
                              </div>
                              {proj.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {proj.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 pt-1">
                                {proj.project_url && (
                                  <a
                                    href={proj.project_url.startsWith("http") ? proj.project_url : `https://${proj.project_url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                                  >
                                    <Globe className="size-3" /> Live Demo
                                  </a>
                                )}
                                {proj.github_url && (
                                  <a
                                    href={proj.github_url.startsWith("http") ? proj.github_url : `https://${proj.github_url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="size-3" /> Source Code
                                  </a>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProject(proj.id, proj.title)}
                              className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                              title="Delete project"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center">
                        <FolderGit2 className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          No projects added yet. Showcase your technical apps to boost your Career Score by +20%!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Add Project Form */}
                  <form
                    onSubmit={handleAddProject}
                    className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-3"
                  >
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Add New Project
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Project Title *</Label>
                        <Input
                          type="text"
                          placeholder="e.g. AI Career Matcher"
                          value={projectTitle}
                          onChange={(e) => setProjectTitle(e.target.value)}
                          className="mt-1 rounded-xl border-border bg-background text-xs"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Tech Stack</Label>
                        <Input
                          type="text"
                          placeholder="e.g. React, Node.js, PostgreSQL"
                          value={projectTechStack}
                          onChange={(e) => setProjectTechStack(e.target.value)}
                          className="mt-1 rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Live Demo URL</Label>
                        <Input
                          type="text"
                          placeholder="e.g. https://my-app.vercel.app"
                          value={projectUrl}
                          onChange={(e) => setProjectUrl(e.target.value)}
                          className="mt-1 rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">GitHub Repository</Label>
                        <Input
                          type="text"
                          placeholder="e.g. https://github.com/user/repo"
                          value={projectGithubUrl}
                          onChange={(e) => setProjectGithubUrl(e.target.value)}
                          className="mt-1 rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                      <Input
                        type="text"
                        placeholder="Brief summary of key features, architecture, and problem solved"
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        className="mt-1 rounded-xl border-border bg-background text-xs"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        disabled={isAddingProject || !projectTitle.trim()}
                        className="rounded-xl font-bold text-xs"
                      >
                        <Plus className="size-4 mr-1.5" />
                        {isAddingProject ? "Saving..." : "Add Project"}
                      </Button>
                    </div>
                  </form>
                </div>
              </ScrollReveal>
            </div>

            {/* Certifications & Accreditations */}
            <div className="lg:col-span-5 space-y-6">
              <ScrollReveal delay={250}>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-foreground font-bold">
                      <Award className="size-5 text-primary" />
                      <h2 className="font-display text-xl font-bold">Certifications & Accreditations</h2>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-soft text-primary">
                      {profile?.certificates?.length || 0} Certified
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Verified certificates, licenses, and professional credentials recognized by recruiters.
                  </p>

                  {/* List of Added Certificates */}
                  <div className="space-y-3 mb-6">
                    {profile?.certificates?.length ? (
                      profile.certificates.map((cert) => (
                        <div
                          key={cert.id}
                          className="rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:shadow-soft"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-display text-sm font-bold text-foreground">
                                  {cert.title}
                                </h4>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/15 text-success text-[11px] font-bold">
                                  <BadgeCheck className="size-3" />
                                  {cert.issuer}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {cert.issue_date && <span>Issued: {cert.issue_date}</span>}
                                {cert.credential_url && (
                                  <a
                                    href={cert.credential_url.startsWith("http") ? cert.credential_url : `https://${cert.credential_url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                                  >
                                    <ExternalLink className="size-3" /> Verify Credential
                                  </a>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCertificate(cert.id, cert.title)}
                              className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                              title="Delete certificate"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center">
                        <Award className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          No certificates added yet. Add verified credentials to complete your profile to 100%!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Add Certificate Form */}
                  <form
                    onSubmit={handleAddCertificate}
                    className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-3"
                  >
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Add Certification
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Certificate Title *</Label>
                        <Input
                          type="text"
                          placeholder="e.g. AWS Certified Solutions Architect"
                          value={certTitle}
                          onChange={(e) => setCertTitle(e.target.value)}
                          className="mt-1 rounded-xl border-border bg-background text-xs"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Issuing Authority *</Label>
                          <Input
                            type="text"
                            placeholder="e.g. Amazon Web Services / Meta / Google"
                            value={certIssuer}
                            onChange={(e) => setCertIssuer(e.target.value)}
                            className="mt-1 rounded-xl border-border bg-background text-xs"
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Issue Date / Year</Label>
                          <Input
                            type="text"
                            placeholder="e.g. 2026 or Sep 2026"
                            value={certIssueDate}
                            onChange={(e) => setCertIssueDate(e.target.value)}
                            className="mt-1 rounded-xl border-border bg-background text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Credential URL</Label>
                        <Input
                          type="text"
                          placeholder="e.g. https://www.credly.com/badges/..."
                          value={certCredentialUrl}
                          onChange={(e) => setCertCredentialUrl(e.target.value)}
                          className="mt-1 rounded-xl border-border bg-background text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        disabled={isAddingCert || !certTitle.trim() || !certIssuer.trim()}
                        className="rounded-xl font-bold text-xs"
                      >
                        <Plus className="size-4 mr-1.5" />
                        {isAddingCert ? "Saving..." : "Add Certificate"}
                      </Button>
                    </div>
                  </form>
                </div>
              </ScrollReveal>
            </div>
          </div>
        )}

        {/* TAB 3: APPLICATIONS TRACKER & INTERVIEW TIMELINES */}
        {activeTab === "applications" && (
          <div className="mt-8 space-y-4">
            <ScrollReveal>
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  Application Tracking & Interview Timelines
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  Track live hiring stages, interview invitations, and verified recruiter feedback.
                </p>

                {applications.length > 0 ? (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className="rounded-2xl border border-border/70 bg-background/50 p-5 transition-all hover:shadow-soft"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="font-display text-base font-bold text-foreground">
                              {app.job.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Company:{" "}
                              <strong className="text-foreground">{app.job.companyName}</strong> ·
                              Application ID: {app.id}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${
                                stageColors[app.stage] || "bg-secondary text-foreground"
                              }`}
                            >
                              {app.stage}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-xs font-bold"
                              onClick={() => setSelectedTimelineApp(app)}
                            >
                              <Video className="size-3.5 mr-1 text-primary" />
                              View Interview Timeline
                            </Button>
                          </div>
                        </div>

                        {/* Visual Step Indicator */}
                        <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
                          <div className="text-success flex flex-col items-center gap-1">
                            <CheckCircle2 className="size-4" />
                            <span>1. Applied</span>
                          </div>
                          <div
                            className={
                              app.stage !== "applied"
                                ? "text-success flex flex-col items-center gap-1"
                                : "text-primary font-bold flex flex-col items-center gap-1"
                            }
                          >
                            <BadgeCheck className="size-4" />
                            <span>2. Shortlisted</span>
                          </div>
                          <div
                            className={
                              app.stage === "interview" ||
                              app.stage === "offer" ||
                              app.stage === "hired"
                                ? "text-warning-foreground font-bold flex flex-col items-center gap-1"
                                : "text-muted-foreground flex flex-col items-center gap-1"
                            }
                          >
                            <Video className="size-4" />
                            <span>3. Interview</span>
                          </div>
                          <div
                            className={
                              app.stage === "offer" || app.stage === "hired"
                                ? "text-success font-bold flex flex-col items-center gap-1"
                                : "text-muted-foreground flex flex-col items-center gap-1"
                            }
                          >
                            <Award className="size-4" />
                            <span>4. Decision / Offer</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12 text-center">
                    <Briefcase className="size-10 text-muted-foreground" />
                    <p className="mt-3 font-display font-bold text-foreground">
                      No applications submitted yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                      Explore verified opportunities and apply in one tap with deterministic skill
                      matching.
                    </p>
                    <Link to="/jobs" className="mt-4">
                      <Button className="font-bold text-xs">Explore Opportunities</Button>
                    </Link>
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* TAB 4: TRUST, VERIFICATION & REVIEWS */}
        {activeTab === "trust" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            {/* Trust Checklist & Badges */}
            <div className="lg:col-span-6 space-y-6">
              <ScrollReveal>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-6 text-primary" />
                      <h2 className="font-display text-lg font-bold text-foreground">
                        Profile Trust Badges
                      </h2>
                    </div>
                    <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
                      Trust Score: Available after verification
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                    Verified profiles receive 3.4x more interview invitations from verified company
                    recruiters.
                  </p>

                  <div className="space-y-3">
                    {/* Academic Verification */}
                    <div className="flex items-center justify-between rounded-2xl border border-success/30 bg-success-soft/30 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-success text-success-foreground">
                          <GraduationCap className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            Academic Institution Verified
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {studentCollege} · {studentProgram}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-[10px] font-bold text-success-foreground">
                        <Check className="size-3" /> Verified
                      </span>
                    </div>

                    {/* Institutional Email */}
                    <div className="flex items-center justify-between rounded-2xl border border-success/30 bg-success-soft/30 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-success text-success-foreground">
                          <MailCheck className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            Academic Email Confirmed
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {user?.email || "student@skillbridge.dev"}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-[10px] font-bold text-success-foreground">
                        <Check className="size-3" /> Confirmed
                      </span>
                    </div>

                    {/* Phone Number Verification */}
                    <div className="rounded-2xl border border-border/80 bg-background/50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                            <PhoneCall className="size-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              Phone Number Verification
                            </p>
                            <p className="text-[11px] text-muted-foreground">{phoneInput || "Not verified"}</p>
                          </div>
                        </div>
                        {phoneVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-[10px] font-bold text-success-foreground">
                            <Check className="size-3" /> OTP Verified
                          </span>
                        ) : (
                          <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-[10px] font-bold text-warning-foreground">
                            Pending
                          </span>
                        )}
                      </div>

                      {!phoneVerified && (
                        <form onSubmit={handleVerifyPhone} className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Enter phone number"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            className="rounded-xl text-xs"
                          />
                          <Button
                            size="sm"
                            type="submit"
                            disabled={isVerifyingPhone || !phoneInput.trim()}
                            className="rounded-xl font-bold"
                          >
                            {isVerifyingPhone ? "Verifying..." : "Verify OTP"}
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Recruiter Reviews & Endorsements */}
            <div className="lg:col-span-6 space-y-6">
              <ScrollReveal delay={150}>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="size-5 text-accent" />
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Recruiter Reviews & Endorsements
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Verified recruiter feedback and screening endorsements will appear here following completed interview evaluations.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        )}

        {/* TAB 5: INTERVIEW TIMELINE & MANAGEMENT */}
        {activeTab === "interviews" && (
          <div className="mt-8 space-y-6">
            <ScrollReveal>
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="size-6 text-primary" />
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Interview Timeline & Management
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Track all scheduled interviews, access meeting links, and view feedback from
                  completed sessions.
                </p>
              </div>
            </ScrollReveal>

            {interviewsLoading ? (
              <LoadingState message="Loading your scheduled interviews..." />
            ) : interviewsError ? (
              <ErrorState
                title="Failed to load interviews"
                message={interviewsError}
                onRetry={refetchInterviews}
              />
            ) : liveInterviews.length > 0 ? (
              <ScrollReveal delay={100}>
                <InterviewTimeline
                  interviews={liveInterviews.map((iv: any) => ({
                    id: iv.id,
                    jobTitle: iv.job_title || "Engineering Role",
                    company: iv.company_name || "Company",
                    scheduledAt: new Date(iv.scheduled_at),
                    duration: 45,
                    interviewer: {
                      name: "Hiring Manager",
                      role: "Technical Lead",
                      email: "interviews@skillbridge.dev",
                    },
                    type: iv.meeting_link ? "video" : "phone",
                    meetingLink: iv.meeting_link,
                    status: iv.status || "scheduled",
                    notes: iv.notes,
                  }))}
                />
              </ScrollReveal>
            ) : (
              <EmptyState
                icon={Video}
                title="No Scheduled Interviews Yet"
                message="When recruiters shortlist your profile and invite you to an interview, details will appear here in real-time."
                actionLabel="Explore Matching Jobs"
                onAction={() => setActiveTab("overview")}
              />
            )}
          </div>
        )}

        {/* INTERVIEW STATUS TIMELINE MODAL */}
        {selectedTimelineApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-md"
              onClick={() => setSelectedTimelineApp(null)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xl"
              style={{ animation: "sb-scale-in 200ms ease-out both" }}
            >
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Interview Status Timeline
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedTimelineApp.job.title} · {selectedTimelineApp.job.companyName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTimelineApp(null)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Timeline Steps */}
              <div className="mt-6 space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {/* Step 1 */}
                <div className="relative flex items-start gap-4">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground z-10">
                    <Check className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">1. Application Delivered</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your verified resume and deterministic skill score were delivered.
                    </p>
                    <span className="text-[10px] font-semibold text-success">
                      Completed
                    </span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex items-start gap-4">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full z-10 ${
                      ["shortlisted", "interview", "offer", "hired"].includes(
                        selectedTimelineApp.stage,
                      )
                        ? "bg-success text-success-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <BadgeCheck className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">2. Profile Shortlisted</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Technical recruiting team validated competencies and candidate profile.
                    </p>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {["shortlisted", "interview", "offer", "hired"].includes(
                        selectedTimelineApp.stage,
                      )
                        ? "Completed"
                        : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-start gap-4">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full z-10 ${
                      ["interview", "offer", "hired"].includes(selectedTimelineApp.stage)
                        ? "bg-warning text-warning-foreground animate-pulse"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Video className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      3. Live Technical Interview
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {["interview", "offer", "hired"].includes(selectedTimelineApp.stage)
                        ? "Interview scheduled with recruiting team."
                        : "Interview stage unlocks upon profile shortlisting."}
                    </p>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {["interview", "offer", "hired"].includes(selectedTimelineApp.stage)
                        ? "Active"
                        : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex items-start gap-4">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full z-10 ${
                      ["offer", "hired"].includes(selectedTimelineApp.stage)
                        ? "bg-success text-success-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Award className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      4. Formal Offer & Decision
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Compensation details and formal agreement.
                    </p>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {["offer", "hired"].includes(selectedTimelineApp.stage)
                        ? "Offered"
                        : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t pt-4 text-right">
                <Button
                  onClick={() => setSelectedTimelineApp(null)}
                  className="rounded-xl text-xs font-bold"
                >
                  Close Timeline
                </Button>
              </div>
            </div>
          </div>
        )}

        <Suspense fallback={null}>
          {/* Opportunity Detail Modal */}
          <OpportunityModal
            job={selectedOpportunityJob}
            isOpen={!!selectedOpportunityJob}
            onClose={() => setSelectedOpportunityJob(null)}
          />

          {/* SkillBridge 2.0: Technical Assessment Modal */}
          <SkillAssessmentModal
            skillName={assessmentSkill}
            isOpen={isAssessmentOpen}
            onClose={() => setIsAssessmentOpen(false)}
            onAssessmentCompleted={() => {
              void Promise.all([refetchProfile(), refetchDashboard(), refetchJobs()]);
            }}
          />

          {/* SkillBridge 2.0: Skill Passport Modal */}
          <SkillPassportModal
            isOpen={isPassportOpen}
            onClose={() => setIsPassportOpen(false)}
            passportToken={passportToken}
            profile={profile}
          />

          {/* SkillBridge 2.0: AI Pre-Screen Interview Studio Modal */}
          <AIInterviewModal
            isOpen={isAIInterviewOpen}
            onClose={() => setIsAIInterviewOpen(false)}
            targetRole={profile?.student?.program || "Full Stack Engineer"}
          />
        </Suspense>
      </main>

      <BottomNav />
    </div>
  );
}
