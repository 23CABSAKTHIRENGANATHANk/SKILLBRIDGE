import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Map,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  Loader2,
  Calendar,
  ExternalLink,
  Target,
  ShieldCheck,
  Brain,
  FolderGit2,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CareerRoadmapStep } from "@/types/skillbridge";

export const Route = createFileRoute("/career-roadmap")({
  component: CareerRoadmapPage,
});

function CareerRoadmapPage() {
  return (
    <ProtectedRoute requiredRole="student">
      <CareerRoadmapContent />
    </ProtectedRoute>
  );
}

function CareerRoadmapContent() {
  const qc = useQueryClient();

  const { data: roadmapData, isLoading, error } = useQuery({
    queryKey: ["career-roadmap"],
    queryFn: () => ApiClient.getCareerRoadmap(),
  });

  const toggleMutation = useMutation({
    mutationFn: (stepId: string) => ApiClient.completeRoadmapStep(stepId),
    onSuccess: () => {
      toast.success("Roadmap step updated!");
      qc.invalidateQueries({ queryKey: ["career-roadmap"] });
      qc.invalidateQueries({ queryKey: ["career-dashboard"] });
      qc.invalidateQueries({ queryKey: ["skill-gaps"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update step.");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const roadmap = roadmapData?.roadmap;
  const steps = roadmapData?.steps || [];
  const progressPct = roadmapData?.progress_pct || 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Header Banner */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-soft relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Map className="size-48" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                <Target className="size-3.5" />
                <span>Personalized Career Roadmap</span>
              </div>
              <Link to="/career-goal">
                <Button variant="outline" size="sm" className="rounded-full text-xs font-bold">
                  Change Goal / Timeline
                </Button>
              </Link>
            </div>

            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
                {roadmap?.target_role || "Full Stack Developer"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Structured {roadmap?.total_weeks || 16}-week progression from current evidence to industry-verified readiness.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Overall Roadmap Completion</span>
                <span className="text-primary">{progressPct}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-secondary/80 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {roadmapData?.completed_steps || 0} of {roadmapData?.total_steps || 0} phases completed
              </p>
            </div>
          </div>
        </div>

        {/* Phase Timeline Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Career Phases & Milestones</h2>
            <Link to="/learning">
              <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">
                Browse All Learning Resources <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {steps.map((step: CareerRoadmapStep) => {
              const isCompleted = step.is_completed;
              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    isCompleted
                      ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                      : "border-border/80 bg-card hover:border-primary/40 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate(step.id)}
                        disabled={toggleMutation.isPending}
                        className="mt-1 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        title={isCompleted ? "Mark incomplete" : "Mark phase complete"}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="size-6 text-emerald-500" />
                        ) : (
                          <Circle className="size-6 text-muted-foreground/40 hover:text-primary" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                            Phase {step.phase_number}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {step.skill_name}
                          </span>
                          {isCompleted && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Completed
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {step.description || `Master ${step.skill_name} concepts, build projects, and verify skills.`}
                        </p>

                        <div className="flex items-center gap-4 pt-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5" /> ~{step.estimated_hours} Hours Effort
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="size-3.5" /> Learn → Build → Verify
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                      <Link
                        to="/learning"
                        search={{ skill: step.skill_name } as any}
                      >
                        <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold h-8">
                          Study Resources
                        </Button>
                      </Link>
                      <Link
                        to="/dashboard"
                      >
                        <Button size="sm" className="rounded-xl text-xs font-semibold h-8 bg-primary/90">
                          Verify Skill
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Loop Action */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-display text-sm font-bold text-foreground">
              Ready to verify what you've learned?
            </h3>
            <p className="text-xs text-muted-foreground">
              Completing hands-on assessments automatically updates your Skill Passport with cryptographic verification.
            </p>
          </div>
          <Link to="/dashboard">
            <Button className="rounded-full font-bold text-xs px-6">
              Go to Verification Center <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
