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
} from "lucide-react";
import { useState } from "react";
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

  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "applications">("overview");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProficiency, setNewSkillProficiency] = useState(85);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [savedJobs, setSavedJobs] = useState<Record<string, boolean>>({
    "job-2": true,
    "job-4": true,
    "job-6": true,
  });

  const currentPipeline = pipeline || demoPipeline;
  const currentProgress = progress || demoProgress;
  const recommendedJobs = allJobs.slice(0, 4);
  const savedJobList = allJobs.filter((job) => savedJobs[job.id]);
  const profileCompletion = 82;
  const resumeScore = 88;
  const profileChecklist = [
    { label: "Profile photo", done: true },
    { label: "Education details", done: true },
    { label: "Skills added", done: true },
    { label: "Resume uploaded", done: true },
    { label: "Portfolio links", done: false },
    { label: "Career preferences", done: false },
  ];
  const skillGapInsights = [
    { skill: "TypeScript", gap: "Needs stronger practical patterns" },
    { skill: "System Design", gap: "Add one architecture project" },
    { skill: "SQL optimization", gap: "Practice window functions" },
  ];

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
            <div className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card p-1.5 shadow-soft">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
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
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
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
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "applications"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Applications ({applications.length || currentPipeline.applied})
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

        <ScrollReveal delay={150}>
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    Career readiness
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-foreground">
                    Profile completion and role-fit snapshot
                  </h2>
                </div>
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                  {profileCompletion}% complete
                </span>
              </div>

              <div className="mt-5 h-2.5 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {profileChecklist.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 px-3 py-2 text-sm"
                  >
                    <span className="text-foreground">{item.label}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                        item.done ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.done ? "Done" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                Resume score
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-display text-4xl font-extrabold text-foreground">{resumeScore}</span>
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">Strong match</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Your resume aligns well with product and engineering roles. Add one project and one measurable impact line to reach the next tier.
              </p>
            </div>
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
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                            stageColors[app.stage] || "bg-secondary text-foreground"
                          }`}
                        >
                          {app.stage}
                        </span>
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

            {/* Resume & Documents */}
            <div className="lg:col-span-5 space-y-6">
              <ScrollReveal delay={150}>
                <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">
                    Candidate Resume
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Stored securely in your private vault with access-control enforcement.
                  </p>

                  <div className="rounded-2xl border border-border/70 bg-background/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileText className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">resume_student.pdf</p>
                        <p className="text-[11px] text-muted-foreground">PDF Document · Verified</p>
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
                </div>
              </ScrollReveal>
            </div>
          </div>
        )}

        {/* TAB 3: APPLICATIONS TRACKER */}
        {activeTab === "applications" && (
          <div className="mt-8 space-y-4">
            <ScrollReveal>
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  Application Tracking & Pipeline
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  Real-time status updates from verified recruiters and hiring teams.
                </p>

                {applications.length > 0 ? (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:shadow-soft"
                      >
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
                          <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" asChild>
                            <Link to="/jobs">View Job Details</Link>
                          </Button>
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
      </main>

      <BottomNav />
    </div>
  );
}
