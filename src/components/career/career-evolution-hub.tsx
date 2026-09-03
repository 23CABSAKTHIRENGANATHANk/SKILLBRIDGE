import { useEffect, useState } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Map,
  Trophy,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Flame,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { SkillDependencyMap } from "./skill-dependency-map";
import { CareerEvolutionFlywheel } from "./career-evolution-flywheel";
import type { CareerDashboardAggregated } from "@/types/skillbridge";

export function CareerEvolutionHub() {
  const [dashboard, setDashboard] = useState<CareerDashboardAggregated | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    ApiClient.getCareerDashboard()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft animate-pulse h-96" />
    );
  }

  if (!dashboard || dashboard.setup_required || !dashboard.goal) {
    return (
      <section className="rounded-3xl border border-dashed border-primary/40 bg-card p-8 text-center space-y-4" aria-labelledby="career-command-center-title">
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Career Command Center</p>
        <h2 id="career-command-center-title" className="font-display text-2xl font-black text-foreground">Set your career goal to unlock your plan</h2>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground">Choose a destination and SkillBridge will calculate readiness, gaps, a dependency-aware roadmap, and your next best action from your own profile data.</p>
        <Link to="/career-goal"><Button className="rounded-full font-bold">Set career goal <ArrowRight className="ml-1 size-4" /></Button></Link>
      </section>
    );
  }

  const readiness = dashboard?.readiness;
  const gaps = dashboard?.gaps;
  const roadmap = dashboard?.roadmap;
  const weekly = dashboard?.weekly_plan;
  const evolution = dashboard?.evolution;
  const achievements = dashboard?.achievements;

  return (
    <section className="space-y-8" aria-labelledby="career-command-center-title">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">
            CAREER COMMAND CENTER
          </p>
          <h2
            id="career-command-center-title"
            className="mt-1 font-display text-2xl font-black text-foreground"
          >
            Your Continuous Career Evolution
          </h2>
          <p className="text-xs text-muted-foreground">
            Targeting: <span className="font-bold text-foreground">{readiness?.target_role}</span> • Real evidence-backed readiness and continuous gap closure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/career-goal">
            <Button variant="outline" size="sm" className="rounded-full text-xs font-bold">
              Adjust Goal
            </Button>
          </Link>
          <Link to="/career-roadmap">
            <Button size="sm" className="rounded-full text-xs font-bold">
              Full Roadmap <ArrowRight className="size-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Interactive Continuous Career Evolution Flywheel */}
      <CareerEvolutionFlywheel targetRole={readiness?.target_role} />

      {/* Grid Row 1: Readiness & Skill Gaps */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Readiness Card */}
        <div className="md:col-span-4 rounded-3xl border border-border/80 bg-card p-6 shadow-soft flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Career Readiness
              </span>
              <span className="text-xs font-bold text-primary">
                {readiness?.verified_skills_count || 0} / {readiness?.required_skills_count || 0} Verified
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative size-32 flex items-center justify-center">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-secondary"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary transition-all duration-1000 ease-out"
                    strokeDasharray={`${readiness?.overall_readiness || 0}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-display text-3xl font-extrabold text-foreground">
                    {readiness?.overall_readiness || 0}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Role Ready
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Based on formal 4-stage technical verification, GitHub code metrics, and portfolio evidence.
            </p>
          </div>

          <div className="pt-4 border-t border-border/60">
            <Link to="/career-opportunities">
              <Button variant="ghost" size="sm" className="w-full font-bold text-xs text-primary justify-between">
                <span>View Qualifying Jobs</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Skill Gap Snapshot */}
        <div className="md:col-span-8 rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Skill Gap Analyzer
              </h3>
              <p className="text-xs text-muted-foreground">
                Skills required for {readiness?.target_role || "target role"} categorized by evidence level.
              </p>
            </div>
            <Link to="/learning">
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold h-8">
                Study Gaps
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Strong */}
            <div className="p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Strong
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {gaps?.strong?.length || 0}
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {gaps?.strong?.slice(0, 3).map((s) => (
                  <div key={s.skill} className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>{s.skill}</span>
                    <span className="text-[10px] text-emerald-500 font-semibold">{s.readiness}%</span>
                  </div>
                ))}
                {(!gaps?.strong || gaps.strong.length === 0) && (
                  <p className="text-[11px] text-muted-foreground">No verified skills yet.</p>
                )}
              </div>
            </div>

            {/* Needs Improvement */}
            <div className="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <TrendingUp className="size-3" /> Needs Verify
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {gaps?.needs_improvement?.length || 0}
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {gaps?.needs_improvement?.slice(0, 3).map((s) => (
                  <div key={s.skill} className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>{s.skill}</span>
                    <span className="text-[10px] text-amber-500 font-semibold">{s.readiness}%</span>
                  </div>
                ))}
                {(!gaps?.needs_improvement || gaps.needs_improvement.length === 0) && (
                  <p className="text-[11px] text-muted-foreground">No unverified skills.</p>
                )}
              </div>
            </div>

            {/* Missing */}
            <div className="p-4 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="size-3" /> Missing
                </span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {gaps?.missing?.length || 0}
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {gaps?.missing?.slice(0, 3).map((s) => (
                  <div key={s.skill} className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>{s.skill}</span>
                    <span className="text-[10px] text-rose-500 font-semibold">0%</span>
                  </div>
                ))}
                {(!gaps?.missing || gaps.missing.length === 0) && (
                  <p className="text-[11px] text-muted-foreground">All role skills covered!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Row 2: Roadmap Progress & 7-Day Weekly Plan Preview */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Roadmap Preview */}
        <div className="md:col-span-7 rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="size-5 text-primary" />
              <h3 className="font-display text-base font-bold text-foreground">
                Roadmap Progress
              </h3>
            </div>
            <span className="text-xs font-bold text-primary">
              {roadmap?.progress_pct || 0}% Complete
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${roadmap?.progress_pct || 0}%` }}
            />
          </div>

          <div className="space-y-2 pt-2">
            {roadmap?.steps?.slice(0, 4).map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/60 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2
                    className={`size-4 ${step.is_completed ? "text-emerald-500" : "text-muted-foreground/40"}`}
                  />
                  <span className="font-bold text-foreground">
                    Phase {step.phase_number}: {step.skill_name}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  ~{step.estimated_hours}h effort
                </span>
              </div>
            ))}
          </div>

          <Link to="/career-roadmap">
            <Button variant="ghost" size="sm" className="w-full text-xs font-bold text-primary mt-2">
              Open Interactive Roadmap <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Weekly Plan & Streak */}
        <div className="md:col-span-5 rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock3 className="size-5 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">
                  This Week's Plan
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                <Flame className="size-3.5" />
                {achievements?.learning_streak_days || 1}d Streak
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Completed {weekly?.completed_hours || 0}h of {weekly?.target_hours || 10}h planned.
            </p>

            <div className="space-y-2">
              {weekly?.tasks?.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/60 text-xs"
                >
                  <span className={`font-semibold ${t.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {t.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-bold shrink-0 ml-2">
                    {t.duration_minutes}m
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border/60">
            <Link to="/career-plan">
              <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl">
                Open 7-Day Planner <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid Row 3: Skill Dependency Map */}
      <SkillDependencyMap />

      {/* Grid Row 4: Knowledge Evolution Timeline & Real Achievements */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Knowledge Evolution Events */}
        <div className="md:col-span-8 rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <h3 className="font-display text-base font-bold text-foreground">
                My Knowledge Evolution
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">
              {evolution?.total_events || 0} Recorded Milestones
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {evolution?.events?.slice(0, 5).map((evt) => (
              <div
                key={evt.id}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary/30 border border-border/60 text-xs"
              >
                <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{evt.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(evt.event_date).toLocaleDateString()}
                    </span>
                  </div>
                  {evt.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {evt.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges & Achievements */}
        <div className="md:col-span-4 rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-warning" />
            <h3 className="font-display text-base font-bold text-foreground">
              Verified Badges
            </h3>
          </div>

          <div className="space-y-2 pt-2">
            {achievements?.achievements?.map((ach) => (
              <div
                key={ach.badge_key}
                className="p-3 rounded-2xl bg-secondary/40 border border-border/60 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-warning" />
                  <span className="text-xs font-bold text-foreground">{ach.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {ach.description}
                </p>
              </div>
            ))}
            {(!achievements?.achievements || achievements.achievements.length === 0) && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Badges unlock when you pass formal technical assessments and verify repositories.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
