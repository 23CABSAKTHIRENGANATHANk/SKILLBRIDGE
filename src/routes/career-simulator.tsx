import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Target,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  Loader2,
  Layers,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/career-simulator")({
  component: CareerSimulatorPage,
});

function CareerSimulatorPage() {
  return (
    <ProtectedRoute requiredRole="student">
      <CareerSimulatorContent />
    </ProtectedRoute>
  );
}

const SIMULATED_PATHS = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "AI/ML Engineer",
  "Cloud Engineer",
  "Data Analyst",
];

function CareerSimulatorContent() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [roleA, setRoleA] = useState<string>("Full Stack Developer");
  const [roleB, setRoleB] = useState<string>("Cloud Engineer");

  const { data: readA, isLoading: loadA } = useQuery({
    queryKey: ["sim-readiness", roleA],
    queryFn: () => ApiClient.getCareerReadiness(roleA),
  });

  const { data: readB, isLoading: loadB } = useQuery({
    queryKey: ["sim-readiness", roleB],
    queryFn: () => ApiClient.getCareerReadiness(roleB),
  });

  const { data: gapsA } = useQuery({
    queryKey: ["sim-gaps", roleA],
    queryFn: () => ApiClient.getSkillGaps(roleA),
  });

  const { data: gapsB } = useQuery({
    queryKey: ["sim-gaps", roleB],
    queryFn: () => ApiClient.getSkillGaps(roleB),
  });

  const setGoalMutation = useMutation({
    mutationFn: (targetRole: string) =>
      ApiClient.saveCareerGoal({
        target_role: targetRole,
        target_timeline_weeks: 16,
      }),
    onSuccess: (res, targetRole) => {
      toast.success(`Career target set to ${targetRole}! Roadmap updated.`);
      qc.invalidateQueries({ queryKey: ["career-goal"] });
      qc.invalidateQueries({ queryKey: ["career-dashboard"] });
      qc.invalidateQueries({ queryKey: ["career-roadmap"] });
      navigate({ to: "/career-roadmap" as any });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update career goal.");
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Header Hero */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Compass className="size-3.5" />
            <span>Career Path Simulator</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Compare Engineering Trajectories
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Simulate your readiness across multiple tech domains using your actual verified skills. Understand what you need to learn before making a commitment.
          </p>
        </div>

        {/* Path Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Path Option A */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Path Option A
              </label>
              <select
                value={roleA}
                onChange={(e) => setRoleA(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm font-bold"
              >
                {SIMULATED_PATHS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {loadA ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground">Current Readiness</span>
                    <h3 className="font-display text-3xl font-extrabold text-foreground">
                      {readA?.overall_readiness || 0}%
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {readA?.verified_skills_count || 0} Verified Skills
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground">Strong Verified Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {gapsA?.strong?.length ? (
                      gapsA.strong.map((s) => (
                        <span
                          key={s.skill}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        >
                          <CheckCircle2 className="size-3" /> {s.skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No strong verified skills yet</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground">Skills to Acquire / Verify</span>
                  <div className="flex flex-wrap gap-1.5">
                    {gapsA?.missing?.map((s) => (
                      <span
                        key={s.skill}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      >
                        <AlertCircle className="size-3" /> {s.skill}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => setGoalMutation.mutate(roleA)}
                  disabled={setGoalMutation.isPending}
                  className="w-full rounded-xl font-bold text-xs"
                >
                  Choose {roleA} as Goal <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>

          {/* Path Option B */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Path Option B
              </label>
              <select
                value={roleB}
                onChange={(e) => setRoleB(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm font-bold"
              >
                {SIMULATED_PATHS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {loadB ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground">Current Readiness</span>
                    <h3 className="font-display text-3xl font-extrabold text-foreground">
                      {readB?.overall_readiness || 0}%
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {readB?.verified_skills_count || 0} Verified Skills
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground">Strong Verified Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {gapsB?.strong?.length ? (
                      gapsB.strong.map((s) => (
                        <span
                          key={s.skill}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        >
                          <CheckCircle2 className="size-3" /> {s.skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No strong verified skills yet</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground">Skills to Acquire / Verify</span>
                  <div className="flex flex-wrap gap-1.5">
                    {gapsB?.missing?.map((s) => (
                      <span
                        key={s.skill}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      >
                        <AlertCircle className="size-3" /> {s.skill}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => setGoalMutation.mutate(roleB)}
                  disabled={setGoalMutation.isPending}
                  className="w-full rounded-xl font-bold text-xs"
                >
                  Choose {roleB} as Goal <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
