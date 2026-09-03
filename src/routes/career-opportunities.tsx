import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Building2,
  MapPin,
  Loader2,
  ChevronRight,
  Target,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import type { CareerOpportunityItem } from "@/types/skillbridge";

export const Route = createFileRoute("/career-opportunities")({
  component: CareerOpportunitiesPage,
});

function CareerOpportunitiesPage() {
  return (
    <ProtectedRoute requiredRole="student">
      <CareerOpportunitiesContent />
    </ProtectedRoute>
  );
}

type OpportunityTab = "ready_now" | "almost_ready" | "future_target";

function CareerOpportunitiesContent() {
  const [activeTab, setActiveTab] = useState<OpportunityTab>("ready_now");

  const { data, isLoading } = useQuery({
    queryKey: ["career-opportunities"],
    queryFn: () => ApiClient.getCareerOpportunities(),
  });

  const readyNow = data?.ready_now || [];
  const almostReady = data?.almost_ready || [];
  const futureTarget = data?.future_target || [];
  const counts = data?.counts || { ready_now: 0, almost_ready: 0, future_target: 0 };

  const currentList =
    activeTab === "ready_now"
      ? readyNow
      : activeTab === "almost_ready"
      ? almostReady
      : futureTarget;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Hero Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Target className="size-3.5" />
            <span>Opportunity Readiness Engine</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Jobs You Can Reach
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Understand where you stand in the market today: see roles you are already qualified for, roles within reach by closing 1–2 gaps, and future aspirational targets.
          </p>
        </div>

        {/* 3 Tier Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-secondary/60 border border-border/80">
          <button
            type="button"
            onClick={() => setActiveTab("ready_now")}
            className={`flex flex-col items-center py-2.5 px-3 rounded-xl transition-all ${
              activeTab === "ready_now"
                ? "bg-card shadow-sm text-foreground font-bold border border-border"
                : "text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>Ready Now</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                {counts.ready_now}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground hidden sm:block mt-0.5">
              80%+ skill match
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("almost_ready")}
            className={`flex flex-col items-center py-2.5 px-3 rounded-xl transition-all ${
              activeTab === "almost_ready"
                ? "bg-card shadow-sm text-foreground font-bold border border-border"
                : "text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="size-4 text-amber-500" />
              <span>Almost Ready</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                {counts.almost_ready}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground hidden sm:block mt-0.5">
              50–79% match (1–2 gaps)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("future_target")}
            className={`flex flex-col items-center py-2.5 px-3 rounded-xl transition-all ${
              activeTab === "future_target"
                ? "bg-card shadow-sm text-foreground font-bold border border-border"
                : "text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Clock className="size-4 text-primary" />
              <span>Future Target</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {counts.future_target}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground hidden sm:block mt-0.5">
              Roadmap progression required
            </span>
          </button>
        </div>

        {/* Opportunities List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3">
            <Briefcase className="size-10 mx-auto text-muted-foreground/40" />
            <h3 className="font-display text-base font-bold text-foreground">
              {activeTab === "ready_now"
                ? "No roles currently at 80%+ match"
                : "No matching opportunities recorded in this tier"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {activeTab === "ready_now"
                ? "Close your top skill gaps or complete pending assessments to unlock immediate opportunities."
                : "Check your other opportunity tabs or explore the full jobs directory."}
            </p>
            {activeTab === "ready_now" && (
              <Link to="/career-roadmap">
                <Button size="sm" className="font-bold rounded-full mt-2 text-xs">
                  View Recommended Roadmap <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map((job: CareerOpportunityItem) => {
              const scoreColor =
                job.match_score >= 80
                  ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                  : job.match_score >= 50
                  ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
                  : "text-slate-400 border-slate-500/30 bg-slate-500/10";

              return (
                <div
                  key={job.job_id}
                  className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft transition-all hover:border-primary/50"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${scoreColor}`}>
                          {job.match_score}% Match
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Building2 className="size-3.5" /> {job.company_name}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3.5" /> {job.location}
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-foreground">
                        {job.title}
                      </h3>

                      {/* Matched & Missing Skills Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {job.matched_skills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          >
                            <CheckCircle2 className="size-3" /> {s}
                          </span>
                        ))}
                        {job.missing_skills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          >
                            <AlertCircle className="size-3" /> {s}
                          </span>
                        ))}
                      </div>

                      {/* Potential Match Improvement */}
                      {job.potential_improvement && (
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                          <Sparkles className="size-3.5 shrink-0" />
                          <span>{job.potential_improvement}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                      {job.salary_range && (
                        <span className="text-xs font-bold text-foreground">
                          {job.salary_range}
                        </span>
                      )}
                      <Link to="/jobs">
                        <Button className="font-bold text-xs rounded-xl w-full sm:w-auto">
                          View & Apply <ArrowRight className="size-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
