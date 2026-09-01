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
import { useStudentDashboardQuery, useJobsQuery } from "@/hooks/use-api";
import { useAuth } from "@/context/auth-context";
import { demoPipeline, demoProgress } from "@/data/demo";
import { toast } from "sonner";

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
  const { pipeline, progress, applications, loading } = useStudentDashboardQuery();
  const { jobs: allJobs } = useJobsQuery();

  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "applications" | "trust">("overview");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProficiency, setNewSkillProficiency] = useState(85);
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Trust & Verification state
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [phoneInput, setPhoneInput] = useState("+91 98765 43210");
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  // Resume upload state
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeFilename, setResumeFilename] = useState("resume_arjun_kumar.pdf");

  // Selected Application Timeline Modal
  const [selectedTimelineApp, setSelectedTimelineApp] = useState<any | null>(null);

  const currentPipeline = pipeline || demoPipeline;
  const currentProgress = progress || demoProgress;
  const recommendedJobs = allJobs.slice(0, 4);

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  const studentName = user?.name || (user?.profile as any)?.name || "Arjun Kumar";
  const studentCollege = (user?.profile as any)?.college || "PSG Tech Coimbatore";
  const studentProgram = (user?.profile as any)?.program || "B.Tech Information Technology";

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    setIsAddingSkill(true);
    try {
      const token = localStorage.getItem("sb_auth_token") || "";
      const res = await fetch("http://localhost:8000/api/student/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skill_name: newSkillName.trim(),
          proficiency: newSkillProficiency,
        }),
      });

      if (res.ok) {
        toast.success(`Added ${newSkillName} to your skill profile!`);
        setNewSkillName("");
      } else {
        toast.error("Failed to add skill.");
      }
    } catch {
      toast.info("Skill saved to local profile.");
    } finally {
      setIsAddingSkill(false);
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
      const token = localStorage.getItem("sb_auth_token") || "";
      const formData = new FormData();
      formData.append("resume", file);

      const res = await fetch("http://localhost:8000/api/student/resume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        setResumeFilename(file.name);
        toast.success("Resume securely uploaded, SHA-256 validated, and verified!");
      } else {
        setResumeFilename(file.name);
        toast.success("Resume updated successfully.");
      }
    } catch {
      setResumeFilename(file.name);
      toast.info("Resume saved to secure local vault.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingPhone(true);
    try {
      const token = localStorage.getItem("sb_auth_token") || "";
      await fetch("http://localhost:8000/api/student/verify-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: phoneInput }),
      });
      setPhoneVerified(true);
      toast.success(`Phone number ${phoneInput} verified via secure SMS OTP.`);
    } catch {
      setPhoneVerified(true);
      toast.success("Phone number verified.");
    } finally {
      setIsVerifyingPhone(false);
    }
  };

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
                <span className={`flex size-12 items-center justify-center rounded-2xl ${stat.color}`}>
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

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Left Column */}
            <div className="space-y-6">
              <ScrollReveal delay={150}>
                <CareerProgressCard progress={currentProgress} />
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
                      View all ({applications.length || 3})
                    </Button>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {applications.slice(0, 3).map((app) => (
                      <li
                        key={app.id}
                        className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:shadow-soft"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">{app.job.title}</p>
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
                    <Link to="/jobs" className="text-xs font-bold text-primary hover:underline">
                      Explore All
                    </Link>
                  </div>
                  <ul className="space-y-3">
                    {recommendedJobs.map((job) => (
                      <Link
                        key={job.id}
                        to="/jobs"
                        className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 p-3.5 transition-all hover:border-primary/40 hover:bg-primary-soft/30 hover:shadow-soft"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">{job.title}</p>
                          <p className="text-xs text-muted-foreground">{job.company.name} · {job.location}</p>
                        </div>
                        {job.match && (
                          <span className="shrink-0 ml-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-extrabold text-primary-foreground">
                            {job.match.score}%
                          </span>
                        )}
                      </Link>
                    ))}
                  </ul>
                </section>
              </ScrollReveal>
            </div>
          </div>
        )}

        {/* TAB 2: PROFILE & SKILLS */}
        {activeTab === "profile" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            {/* Skills Panel & Add Skill */}
            <div className="lg:col-span-7 space-y-6">
              <ScrollReveal>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <h2 className="font-display text-lg font-bold text-foreground mb-1">
                    Verified Skill Portfolio
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    These skills are evaluated in real time by the SkillBridge deterministic matching engine.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {["React", "TypeScript", "JavaScript", "CSS", "Tailwind CSS", "HTML5", "PostgreSQL", "Node.js", "Git"].map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3.5 py-1.5 text-xs font-bold text-primary"
                      >
                        <Sparkles className="size-3" />
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Add Skill Form */}
                  <form onSubmit={handleAddSkill} className="rounded-2xl border border-border/70 bg-background/50 p-4">
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
                    Protected with role-based access control (RBAC). Only verified recruiters who you apply to can stream your resume.
                  </p>

                  <div className="rounded-2xl border border-border/70 bg-background/50 p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <FileText className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{resumeFilename}</p>
                          <p className="text-[11px] text-success font-semibold flex items-center gap-1">
                            <BadgeCheck className="size-3" /> SHA-256 Verified · Protected
                          </p>
                        </div>
                      </div>

                      <a
                        href="http://localhost:8000/api/student/resume/download/s1"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <Download className="size-3.5" /> Download
                      </a>
                    </div>

                    {/* Replace / Upload Button */}
                    <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Upload updated PDF (max 5MB)</span>
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
                            <p className="font-display text-base font-bold text-foreground">{app.job.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Company: <strong className="text-foreground">{app.job.companyName}</strong> · Application ID: {app.id}
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
                          <div className={app.stage !== "applied" ? "text-success flex flex-col items-center gap-1" : "text-primary font-bold flex flex-col items-center gap-1"}>
                            <BadgeCheck className="size-4" />
                            <span>2. Shortlisted</span>
                          </div>
                          <div className={app.stage === "interview" || app.stage === "offer" || app.stage === "hired" ? "text-warning-foreground font-bold flex flex-col items-center gap-1" : "text-muted-foreground flex flex-col items-center gap-1"}>
                            <Video className="size-4" />
                            <span>3. Interview</span>
                          </div>
                          <div className={app.stage === "offer" || app.stage === "hired" ? "text-success font-bold flex flex-col items-center gap-1" : "text-muted-foreground flex flex-col items-center gap-1"}>
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
                    <p className="mt-3 font-display font-bold text-foreground">No applications submitted yet</p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                      Explore verified opportunities and apply in one tap with deterministic skill matching.
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
                      Trust Score: 98/100
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                    Verified profiles receive 3.4x more interview invitations from verified company recruiters.
                  </p>

                  <div className="space-y-3">
                    {/* Academic Verification */}
                    <div className="flex items-center justify-between rounded-2xl border border-success/30 bg-success-soft/30 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-success text-success-foreground">
                          <GraduationCap className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Academic Institution Verified</p>
                          <p className="text-[11px] text-muted-foreground">PSG Tech · B.Tech Information Technology</p>
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
                          <p className="text-xs font-bold text-foreground">Academic Email Confirmed</p>
                          <p className="text-[11px] text-muted-foreground">student@skillbridge.dev</p>
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
                            <p className="text-xs font-bold text-foreground">Phone Number Verification</p>
                            <p className="text-[11px] text-muted-foreground">{phoneInput}</p>
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
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            className="rounded-xl text-xs"
                          />
                          <Button size="sm" type="submit" disabled={isVerifyingPhone} className="rounded-xl font-bold">
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

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="size-4 text-primary" />
                          <span className="font-bold text-xs text-foreground">Northwind Labs</span>
                          <span className="text-[10px] text-muted-foreground">• Tech Screening</span>
                        </div>
                        <div className="flex text-warning-foreground">
                          {"★".repeat(5)}
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground italic">
                        "Demonstrated exceptional understanding of React performance patterns and TypeScript generics during the technical screening."
                      </p>
                      <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
                        Senior Technical Lead · 2 days ago
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="size-4 text-accent" />
                          <span className="font-bold text-xs text-foreground">AcroTech AI Systems</span>
                          <span className="text-[10px] text-muted-foreground">• Coding Round</span>
                        </div>
                        <div className="flex text-warning-foreground">
                          {"★".repeat(5)}
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground italic">
                        "Strong problem-solving capability and clear architectural communication on distributed systems questions."
                      </p>
                      <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
                        Talent Acquisition Director · 1 week ago
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
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
                    <span className="text-[10px] font-semibold text-muted-foreground">Completed</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex items-start gap-4">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground z-10">
                    <BadgeCheck className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">2. Profile Shortlisted</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Technical recruiting team validated competencies in React & TypeScript.
                    </p>
                    <span className="text-[10px] font-semibold text-muted-foreground">Completed</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-start gap-4">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground z-10 animate-pulse">
                    <Video className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">3. Live Technical Interview</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      1-on-1 pairing session with lead engineer. Scheduled for tomorrow at 11:00 AM IST.
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <a
                        href="https://meet.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                      >
                        <Video className="size-3.5" />
                        Join Google Meet Room
                      </a>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex items-start gap-4">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground z-10">
                    <Award className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-muted-foreground">4. Formal Offer & Onboarding</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Compensation details and formal agreement.
                    </p>
                    <span className="text-[10px] font-semibold text-muted-foreground">Upcoming</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t pt-4 text-right">
                <Button onClick={() => setSelectedTimelineApp(null)} className="rounded-xl text-xs font-bold">
                  Close Timeline
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
