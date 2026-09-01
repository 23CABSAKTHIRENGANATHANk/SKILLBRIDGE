import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Star,
  TrendingUp,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CursorDot } from "@/components/cursor-dot";
import { CareerProgressCard } from "@/components/career-progress";
import { ApplicationPipeline } from "@/components/application-pipeline";
import { MatchRing } from "@/components/match-ring";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import { Button } from "@/components/ui/button";
import { useStudentDashboardQuery, useJobsQuery } from "@/hooks/use-api";
import { demoPipeline, demoProgress } from "@/data/demo";

import { ProtectedRoute } from "@/components/auth/protected-route";

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
  const { pipeline, progress, applications, loading } = useStudentDashboardQuery();
  const { jobs: allJobs } = useJobsQuery();

  const currentPipeline = pipeline || demoPipeline;
  const currentProgress = progress || demoProgress;
  const recommendedJobs = allJobs.slice(0, 3);

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="min-h-screen">
      <CursorDot />
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        {/* Greeting — first element to appear */}
        <div
          style={{
            animation: "sb-slide-up 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {greeting}, <span className="bridge-gradient-text">Student</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s what&apos;s happening with your career bridge today.
          </p>
        </div>

        {/* Stats row */}
        <div
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{
            animation:
              "sb-slide-up 500ms cubic-bezier(0.22, 1, 0.36, 1) 100ms both",
          }}
        >
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
              className="card-lift flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-soft"
            >
              <span className={`flex size-11 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-2xl font-extrabold leading-none">
                  <AnimatedCounter value={stat.value} />
                </p>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Career Progress */}
            <ScrollReveal delay={200}>
              <CareerProgressCard progress={currentProgress} />
            </ScrollReveal>

            {/* Pipeline */}
            <ScrollReveal delay={300}>
              <ApplicationPipeline counts={currentPipeline} />
            </ScrollReveal>

            {/* Recent applications */}
            <ScrollReveal delay={400}>
              <section
                aria-labelledby="applications-title"
                className="rounded-3xl border bg-card p-6 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <h2
                    id="applications-title"
                    className="font-display text-lg font-bold"
                  >
                    Recent Applications
                  </h2>
                  <Button variant="ghost" size="sm" className="text-xs" asChild>
                    <Link to="/jobs">View all</Link>
                  </Button>
                </div>
                <ul className="mt-4 space-y-3">
                  {applications.map((app, i) => (
                    <li
                      key={app.id}
                      className="flex items-center justify-between rounded-2xl border bg-background/50 p-4 transition-all duration-200 hover:shadow-soft"
                      style={{
                        animation: `sb-slide-up 400ms cubic-bezier(0.22, 1, 0.36, 1) ${500 + i * 80}ms both`,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-sm">{app.job.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {app.job.companyName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stageColors[app.stage] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {app.stage.charAt(0).toUpperCase() + app.stage.slice(1)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" aria-hidden="true" />
                          {app.updatedAt}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </ScrollReveal>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Match ring */}
            <ScrollReveal delay={250}>
              <div className="flex flex-col items-center rounded-3xl border bg-card p-6 shadow-soft">
                <MatchRing score={currentProgress.percent} size={140} />
                <p className="mt-4 font-display text-base font-bold">
                  Profile Strength
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete your profile to unlock better matches
                </p>
                <Button className="mt-4 w-full" size="sm" asChild>
                  <Link to="/dashboard">
                    <TrendingUp className="size-4" aria-hidden="true" />
                    Improve Profile
                  </Link>
                </Button>
              </div>
            </ScrollReveal>

            {/* Recommended jobs */}
            <ScrollReveal delay={350}>
              <section
                aria-labelledby="recommended-title"
                className="rounded-3xl border bg-card p-6 shadow-soft"
              >
                <h2
                  id="recommended-title"
                  className="font-display text-lg font-bold"
                >
                  Recommended for You
                </h2>
                <ul className="mt-4 space-y-3">
                  {recommendedJobs.map((job, i) => (
                    <li
                      key={job.id}
                      className="group flex items-center justify-between rounded-2xl border bg-background/50 p-3 transition-all duration-200 hover:shadow-soft"
                      style={{
                        animation: `sb-slide-up 400ms cubic-bezier(0.22, 1, 0.36, 1) ${400 + i * 80}ms both`,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{job.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {job.company.name} · {job.location}
                        </p>
                      </div>
                      {job.match && (
                        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                          {job.match.score}%
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </ScrollReveal>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
