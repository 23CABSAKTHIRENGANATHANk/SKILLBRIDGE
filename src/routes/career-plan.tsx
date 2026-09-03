import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Loader2,
  BookOpen,
  ArrowRight,
  Target,
  RefreshCw,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { WeeklyPlanTask } from "@/types/skillbridge";

export const Route = createFileRoute("/career-plan")({
  component: CareerPlanPage,
});

function CareerPlanPage() {
  return (
    <ProtectedRoute requiredRole="student">
      <CareerPlanContent />
    </ProtectedRoute>
  );
}

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function CareerPlanContent() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["weekly-career-plan"],
    queryFn: () => ApiClient.getWeeklyCareerPlan(),
  });

  const toggleMutation = useMutation({
    mutationFn: (taskId: string) => ApiClient.toggleWeeklyCareerTask(taskId),
    onSuccess: () => {
      toast.success("Task updated!");
      qc.invalidateQueries({ queryKey: ["weekly-career-plan"] });
      qc.invalidateQueries({ queryKey: ["career-dashboard"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to toggle task.");
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

  const tasks = data?.tasks || [];
  const completedHours = data?.completed_hours || 0;
  const targetHours = data?.target_hours || 10;
  const progressPct = targetHours > 0 ? Math.min(100, Math.round((completedHours / targetHours) * 100)) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Header Hero */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Calendar className="size-3.5" />
            <span>Weekly Career Planner</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Your 7-Day Career Evolution Plan
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Bite-sized daily actionable blocks that systematically transform your skill gaps into verified credentials.
          </p>
        </div>

        {/* Progress Card */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">Weekly Target Hours</h2>
              <p className="text-xs text-muted-foreground">
                Week starting {data?.plan?.week_start_date || "this week"}
              </p>
            </div>
            <div className="text-right">
              <span className="font-display text-2xl font-extrabold text-primary">
                {completedHours}h
              </span>
              <span className="text-xs text-muted-foreground font-bold"> / {targetHours}h goal</span>
            </div>
          </div>

          <div className="h-3 w-full rounded-full bg-secondary/80 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pt-1">
            <span>{data?.completed_tasks || 0} of {data?.total_tasks || 0} tasks completed</span>
            <span>{progressPct}% towards weekly goal</span>
          </div>
        </div>

        {/* Daily Tasks List */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">Daily Action Checklist</h2>

          <div className="space-y-2.5">
            {tasks.map((task: WeeklyPlanTask) => {
              const isCompleted = task.is_completed;
              return (
                <div
                  key={task.id}
                  className={`flex items-start justify-between gap-3 p-4 rounded-2xl border transition-all ${
                    isCompleted
                      ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                      : "border-border/80 bg-card hover:border-primary/40 shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate(task.id)}
                      disabled={toggleMutation.isPending}
                      className="mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="size-5 text-emerald-500" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground/40 hover:text-primary" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                          {DAY_LABELS[task.day_of_week] || task.day_of_week}
                        </span>
                        <span className={`text-xs font-semibold ${isCompleted ? "line-through text-muted-foreground" : "text-foreground font-bold"}`}>
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" /> {task.duration_minutes} mins
                        </span>
                        {task.skill && (
                          <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-semibold">
                            {task.skill}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link to="/learning">
                      <Button variant="ghost" size="sm" className="text-xs font-semibold h-8 px-2.5">
                        <BookOpen className="size-3.5 mr-1" /> Learn
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Link Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Link to="/career-roadmap">
            <Button variant="outline" size="sm" className="rounded-full font-bold text-xs">
              View Complete Roadmap
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="sm" className="rounded-full font-bold text-xs">
              Return to Career Dashboard <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
