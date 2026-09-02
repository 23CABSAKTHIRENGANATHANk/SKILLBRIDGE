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
} from "lucide-react";
import { useState, useEffect } from "react";
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
import { OpportunityModal } from "@/components/opportunity-modal";
import { SkillAssessmentModal } from "@/components/proof-of-skill/skill-assessment-modal";
import { CareerSimulatorCard } from "@/components/career/career-simulator-card";
import { SkillPassportModal } from "@/components/career/skill-passport-modal";
import { AIInterviewModal } from "@/components/interview/ai-interview-modal";
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
    "overview" | "ai" | "profile" | "applications" | "trust" | "interviews"
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

  // Resume upload state
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeFilename, setResumeFilename] = useState("");

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
      activeTab === "profile" &&
      profile?.student.hasResume &&
      !resumeAnalysis &&
      !resumeAnalysisLoading
    ) {
      void generateResumeAnalysis();
    }
  }, [
    activeTab,
    profile?.student.hasResume,
    resumeAnalysis,
    resumeAnalysisLoading,
    generateResumeAnalysis,
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

    if (file.type !== "application/pdf") {
      toast.error("Only PDF format resumes are accepted for secure parsing.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume file size must be less than 5MB.");
      return;
    }

    setIsUploadingResume(true);
    try {
      await ApiClient.uploadResume(file);
      setResumeFilename(file.name);
      toast.success("Resume securely uploaded, SHA-256 validated, and verified!");
      await Promise.all([refetchProfile(), refetchDashboard()]);
      void generateResumeAnalysis();
    } catch {
      toast.error("Resume upload failed. Please try again.");
    } finally {
      setIsUploadingResume(false);
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
    if (!githubUsername.trim()) {
      toast.error("GitHub username is required.");
      return;
    }
    setIsConnectingGithub(true);
    try {
      const res = await ApiClient.connectGitHub(githubUsername.trim());
      toast.success(res.message || "GitHub profile analyzed!");
      await Promise.all([refetchProfile(), refetchDashboard(), refetchJobs()]);
    } catch {
      toast.error("Failed to analyze GitHub repositories.");
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

                  {/* Resume Score Summary */}
                  <div className="rounded-2xl border border-success/30 bg-success-soft/20 p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-foreground">Resume Quality Score</h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success text-success-foreground text-xs font-extrabold">
                        {profile?.student.hasResume && resumeAnalysis ? `${resumeAnalysis.ats_score}%` : "Not scored"}
                      </span>
                    </div>
                    {profile?.student.hasResume && resumeAnalysis ? (
                      <>
                        <div className="space-y-2 mb-3">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Strengths:
                            </p>
                            <ul className="space-y-1">
                              {(resumeAnalysis?.key_strengths || []).map((str, i) => (
                                <li key={i} className="text-xs text-foreground flex items-start gap-2">
                                  <CheckCircle2 className="size-3 mt-0.5 text-success shrink-0" />
                                  {str}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Next Steps:
                          </p>
                          <ul className="space-y-1">
                            {(resumeAnalysis?.improvement_tips || []).map((imp, i) => (
                              <li key={i} className="text-xs text-foreground flex items-start gap-2">
                                <AlertCircle className="size-3 mt-0.5 text-warning-foreground shrink-0" />
                                {imp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Upload your resume to unlock analysis
                      </p>
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
      </main>

      <BottomNav />
    </div>
  );
}
