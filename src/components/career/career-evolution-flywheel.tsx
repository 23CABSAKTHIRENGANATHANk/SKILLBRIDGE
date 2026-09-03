import { useState, useEffect, useCallback } from "react";
import {
  Compass,
  TrendingUp,
  Share2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Code2,
  FolderGit2,
  CheckCircle,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Trophy,
  Briefcase,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Award,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiClient } from "@/lib/api-client";
import { Link } from "@tanstack/react-router";
import type {
  EvolutionLoopState,
  FlywheelStageItem,
} from "@/types/skillbridge";

interface Props {
  targetRole?: string;
  onGoalChangeRequest?: () => void;
}

export function CareerEvolutionFlywheel({ targetRole, onGoalChangeRequest }: Props) {
  const [data, setData] = useState<EvolutionLoopState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<"learn" | "practice" | "build" | "assess" | "verify">("learn");
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [projectRepoUrl, setProjectRepoUrl] = useState("");
  const [celebration, setCelebration] = useState<{
    boost: string;
    prevScore: number;
    newScore: number;
    newTier: string;
    nextSkill?: string;
  } | null>(null);

  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await ApiClient.getEvolutionLoop(targetRole);
      setData(res);
      if (res.current_modality) {
        setActiveTab(res.current_modality);
      }
    } catch (err) {
      console.error("Failed to load evolution loop state:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [targetRole]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleAdvance = async (stage: "learn" | "practice" | "build" | "assess" | "verify", payload?: Record<string, unknown>) => {
    if (!data?.active_skill) return;
    try {
      setIsAdvancing(true);
      const res = await ApiClient.advanceEvolutionLoop(data.active_skill, stage, payload);
      
      if (stage === "verify" || res.next_stage === "repeat") {
        setCelebration({
          boost: res.readiness_change === 0 ? "No change" : `${res.readiness_change > 0 ? "+" : ""}${res.readiness_change}%`,
          prevScore: res.previous_score,
          newScore: res.new_score,
          newTier: res.new_tier,
          nextSkill: res.next_recommended_action?.skill,
        });
      } else if (res.next_stage && ["learn", "practice", "build", "assess", "verify"].includes(res.next_stage)) {
        setActiveTab(res.next_stage as any);
      }
      
      await loadState();
    } catch (err) {
      console.error("Failed to advance flywheel stage:", err);
    } finally {
      setIsAdvancing(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-soft animate-pulse flex flex-col items-center justify-center min-h-[420px]">
        <RefreshCw className="size-8 text-primary animate-spin mb-3" />
        <p className="text-sm font-bold text-foreground">Synchronizing Career Evolution Flywheel...</p>
        <p className="text-xs text-muted-foreground mt-1">Traversing DAG prerequisites and calculating verified readiness</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-soft">
        <AlertTriangle className="mx-auto size-8 text-destructive" />
        <p className="mt-3 text-sm font-bold text-foreground">Career intelligence is temporarily unavailable.</p>
        <p className="mt-1 text-xs text-muted-foreground">Your progress is safe. Retry when the API is reachable.</p>
        <Button type="button" variant="outline" size="sm" className="mt-4 rounded-xl" onClick={loadState} disabled={!loadError || loading}>
          <RefreshCw className="mr-1.5 size-3.5" /> Retry
        </Button>
      </div>
    );
  }

  const { goal, readiness, skill_graph, skill_gaps, next_action, active_skill, modalities, reachable_jobs } = data;
  const score = readiness?.readiness_score ?? readiness?.overall_readiness ?? 0;
  const breakdownObj = (readiness?.breakdown && !Array.isArray(readiness.breakdown))
    ? readiness.breakdown
    : {};

  return (
    <div className="space-y-6" aria-label="Career Evolution Flywheel">
      {/* 13-STAGE INTERACTIVE VISUAL PROGRESSION STEPPER */}
      <div className="rounded-3xl border border-border/80 bg-card/90 backdrop-blur-md p-5 shadow-soft">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <RotateCcw className="size-4 animate-spin-slow" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-primary">
                Continuous Career Evolution Flywheel
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Deterministic 13-stage closed loop: Goal → Readiness → Graph → Gaps → Action → Execution → Promotion → Repeat
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Zap className="size-3" /> Active Loop
          </span>
        </div>

        {/* Stepper Chain */}
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-center gap-1.5 min-w-[760px]">
            {data.flywheel_stages.map((stage: FlywheelStageItem, idx: number) => {
              const isCurrentModality = activeTab === stage.id;
              return (
                <div key={stage.id} className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                      isCurrentModality
                        ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30 scale-105"
                        : stage.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : stage.status === "in_progress"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-secondary text-muted-foreground border border-border/40"
                    }`}
                  >
                    {stage.status === "completed" && <CheckCircle2 className="size-2.5" />}
                    <span>{stage.name}</span>
                  </div>
                  {idx < data.flywheel_stages.length - 1 && (
                    <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FLYWHEEL CELEBRATION MODAL (READINESS BOOST & REACHABLE JOBS UNLOCKED) */}
      {celebration && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 shadow-soft animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
                <Trophy className="size-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Career Readiness Boost Unlocked!
                </span>
                <h4 className="font-display text-lg font-black text-foreground">
                  Skill Verified: {active_skill} ({celebration.boost})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Your overall readiness advanced from <span className="font-bold text-foreground">{celebration.prevScore}%</span> to{" "}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{celebration.newScore}%</span> ({celebration.newTier}).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                onClick={() => {
                  setCelebration(null);
                  setActiveTab("learn");
                }}
                className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
              >
                Continue to Next Skill Node <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GRID ROW 1: GOAL + READINESS + SKILL GRAPH */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Stage 1 & 2: Goal & Readiness Gauge */}
        <div className="md:col-span-4 rounded-3xl border border-border/80 bg-card p-6 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Stage 1 & 2: Goal & Readiness
              </span>
              {onGoalChangeRequest && (
                <button
                  onClick={onGoalChangeRequest}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Edit Goal
                </button>
              )}
            </div>

            <h4 className="mt-1 font-display text-lg font-black text-foreground">
              {goal?.target_role || "Frontend Developer"}
            </h4>
            <p className="text-xs text-muted-foreground">
              Target: {goal?.target_timeline_weeks || 16} weeks • {goal?.target_industry || "Technology"}
            </p>

            {/* Circular Gauge */}
            <div className="flex flex-col items-center justify-center my-4">
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
                    strokeDasharray={`${score}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-display text-3xl font-black text-foreground">
                    {score}%
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary">
                    {readiness?.readiness_tier || "Foundational"}
                  </span>
                </div>
              </div>
            </div>

            {/* Breakdown Bars */}
            <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Required Skills (50%):</span>
                <span className="font-bold text-foreground">{breakdownObj?.required_skills_coverage || 0}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Preferred Skills (20%):</span>
                <span className="font-bold text-foreground">{breakdownObj?.preferred_skills_coverage || 0}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Proficiency Benchmark (15%):</span>
                <span className="font-bold text-foreground">{breakdownObj?.proficiency_benchmark || 0}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Portfolio Evidence (15%):</span>
                <span className="font-bold text-foreground">{breakdownObj?.portfolio_evidence || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stage 3 & 4: My Skill Graph & Gaps Matrix */}
        <div className="md:col-span-8 rounded-3xl border border-border/80 bg-card p-6 shadow-soft flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Stage 3 & 4: Skill Graph & Gaps
                </span>
                <h4 className="font-display text-base font-black text-foreground">
                  Topological Dependency Map
                </h4>
              </div>
              <span className="text-xs font-bold text-primary">
                {skill_graph?.nodes?.filter((n) => n.status === "verified").length || 0} / {skill_graph?.nodes?.length || 0} Verified
              </span>
            </div>

            {/* Interactive Graph Node Badges */}
            <div className="flex flex-wrap gap-2 pt-3">
              {skill_graph?.nodes?.map((node) => {
                const isTarget = node.name.toLowerCase() === active_skill.toLowerCase();
                return (
                  <div
                    key={node.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isTarget
                        ? "bg-primary/10 border-primary text-primary ring-2 ring-primary/20 scale-105"
                        : node.status === "verified"
                        ? "bg-emerald-500/[0.08] border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : node.status === "in_progress"
                        ? "bg-amber-500/[0.08] border-amber-500/30 text-amber-600 dark:text-amber-400"
                        : "bg-secondary border-border/60 text-muted-foreground"
                    }`}
                  >
                    {node.status === "verified" ? (
                      <CheckCircle className="size-3 text-emerald-500" />
                    ) : isTarget ? (
                      <Sparkles className="size-3 text-primary animate-pulse" />
                    ) : (
                      <Clock className="size-3 text-muted-foreground" />
                    )}
                    <span>{node.name}</span>
                    <span className="text-[10px] opacity-70">({node.confidence}%)</span>
                  </div>
                );
              })}
            </div>

            {/* Gaps Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div className="p-3 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20">
                <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
                  Strong Verified
                </span>
                <p className="text-lg font-black text-foreground">{skill_gaps?.strong?.length || 0}</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20">
                <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400">
                  Needs Verification
                </span>
                <p className="text-lg font-black text-foreground">{skill_gaps?.needs_improvement?.length || 0}</p>
              </div>
              <div className="p-3 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20">
                <span className="text-[10px] font-extrabold uppercase text-rose-600 dark:text-rose-400">
                  Direct Missing Gap
                </span>
                <p className="text-lg font-black text-foreground">{skill_gaps?.missing?.length || 0}</p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Prerequisite DAG automatically orders required competencies before specialized framework tooling.
          </p>
        </div>
      </div>

      {/* STAGE 5: HERO WHAT SHOULD I DO NEXT? */}
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card to-card p-6 shadow-soft">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary text-primary-foreground">
                Stage 5 Recommendation
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {next_action?.impact || "Recalculated after completion"}
              </span>
            </div>
            <h3 className="font-display text-xl font-black text-foreground">
              What Should I Do Next? → Master {active_skill}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              {next_action?.primary_action?.rationale ||
                next_action?.reason ||
                `Core priority competency for ${goal?.target_role}. All prerequisite nodes are satisfied and verified.`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setActiveTab("learn")}
              className="rounded-xl font-bold text-xs shadow-sm"
            >
              Start 5-Stage Sprint <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* STAGES 6 - 10: 5-STAGE ACTION WORKBENCH (LEARN → PRACTICE → BUILD → ASSESS → VERIFY) */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
              Stages 6-10 Action Modalities
            </span>
            <h4 className="font-display text-lg font-black text-foreground">
              Complete {active_skill} Mastery Sprint
            </h4>
          </div>

          {/* Modality Tabs */}
          <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-2xl border border-border/60 text-xs">
            <button
              onClick={() => setActiveTab("learn")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === "learn" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-3.5" /> Learn
            </button>
            <button
              onClick={() => setActiveTab("practice")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === "practice" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="size-3.5" /> Practice
            </button>
            <button
              onClick={() => setActiveTab("build")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === "build" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderGit2 className="size-3.5" /> Build
            </button>
            <button
              onClick={() => setActiveTab("assess")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === "assess" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle className="size-3.5" /> Assess
            </button>
            <button
              onClick={() => setActiveTab("verify")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === "verify" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="size-3.5" /> Verify
            </button>
          </div>
        </div>

        {/* TAB 1: LEARN */}
        {activeTab === "learn" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Curated official technical documentation, accredited courses, and video walkthroughs for <span className="font-bold text-foreground">{active_skill}</span>.
              </p>
              <Link to="/learning" search={{ skill: active_skill } as any}>
                <Button size="sm" className="rounded-xl font-bold text-xs">
                  Open Verified Learning <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {modalities?.learn?.resources?.map((r) => (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 rounded-2xl border border-border/60 bg-secondary/30 hover:border-primary/40 hover:bg-secondary/50 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {r.resource_type}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="size-3 group-hover:text-primary transition-colors" />
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {r.title}
                    </h5>
                    <p className="text-xs text-muted-foreground">Provider: {r.provider}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                    <span>Level: {r.level}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {r.is_free ? "Free Open Access" : "Accredited"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PRACTICE */}
        {activeTab === "practice" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Execute interactive production coding drills for <span className="font-bold text-foreground">{active_skill}</span>.
              </p>
              <p className="text-[11px] font-semibold text-muted-foreground">Complete the real assessment after practicing.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {modalities?.practice?.drills?.map((drill) => (
                <div key={drill.id} className="p-4 rounded-2xl border border-border/60 bg-secondary/30 space-y-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {drill.difficulty} Drill
                    </span>
                    <h5 className="font-bold text-sm text-foreground mt-1">{drill.title}</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">{drill.instruction}</p>
                  </div>

                  <div className="rounded-xl bg-background p-3 font-mono text-[11px] text-muted-foreground border border-border/40">
                    <pre className="overflow-x-auto">{drill.starter_code}</pre>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Validation Criteria:</span>
                    {drill.test_criteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <CheckCircle2 className="size-3 text-emerald-500" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: BUILD */}
        {activeTab === "build" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Architect real-world portfolio project blueprints demonstrating tangible capability in <span className="font-bold text-foreground">{active_skill}</span>.
              </p>
              <Button
                size="sm"
                disabled={isAdvancing || !projectRepoUrl.trim() || !modalities?.build?.projects?.[0]}
                onClick={() => handleAdvance("build", {
                  project_title: modalities?.build?.projects?.[0]?.title,
                  repo_url: projectRepoUrl.trim(),
                })}
                className="rounded-xl font-bold text-xs"
              >
                Submit Project & Proceed to Assess <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <FolderGit2 className="size-4 text-muted-foreground shrink-0" />
              <input
                type="url"
                aria-label="Completed project repository URL"
                placeholder="https://github.com/username/project-repo"
                value={projectRepoUrl}
                onChange={(event) => setProjectRepoUrl(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {modalities?.build?.projects?.map((proj) => (
                <div key={proj.id} className="p-4 rounded-2xl border border-border/60 bg-secondary/30 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {proj.difficulty} Blueprint
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        High Portfolio Value
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-foreground">{proj.title}</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">{proj.description}</p>

                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Deliverables:</span>
                      {proj.deliverables?.map((d: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <CheckCircle2 className="size-3 text-primary" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Effort: ~{proj.estimated_hours} hours</span>
                    {proj.repo_template_url && (
                      <a
                        href={proj.repo_template_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <FolderGit2 className="size-3" /> Template Repo
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ASSESS */}
        {activeTab === "assess" && (
          <div className="p-6 rounded-2xl border border-border/60 bg-secondary/20 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  Technical Benchmark
                </span>
                <h5 className="font-display text-lg font-black text-foreground mt-2">
                  {modalities?.assess?.assessment_title}
                </h5>
                <p className="text-xs text-muted-foreground mt-1">
                  10 timed architectural and algorithmic questions to prove hands-on competency in {active_skill}.
                </p>
              </div>

              <Button
                size="sm"
                disabled={isAdvancing}
                onClick={() => window.location.assign("/student/skill-verification")}
                className="rounded-xl font-bold text-xs shadow-sm shrink-0"
              >
                Open Skill Assessment <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Questions</span>
                <p className="font-bold text-foreground mt-1">{modalities?.assess?.question_count} items</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Duration</span>
                <p className="font-bold text-foreground mt-1">{modalities?.assess?.duration_minutes} mins</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Passing Score</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">{modalities?.assess?.passing_score}%</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Reward</span>
                <p className="font-bold text-primary mt-1">Verified Badge</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: VERIFY */}
        {activeTab === "verify" && (
          <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Multi-Factor Proof-of-Skill
                </span>
                <h5 className="font-display text-lg font-black text-foreground mt-2">
                  Verify & Issue Permanent Proof: {active_skill}
                </h5>
                <p className="text-xs text-muted-foreground mt-1">
                  Combines assessment score, project deliverables, and GitHub evidence into a tamper-evident credential.
                </p>
              </div>

              <Button
                size="sm"
                disabled={isAdvancing}
                onClick={() => handleAdvance("verify")}
                className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0"
              >
                Verify Skill & Elevate Readiness <ShieldCheck className="size-3.5 ml-1.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground">Self-Declared</span>
                <p className="font-bold text-foreground mt-0.5">10%</p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground">Resume Evidence</span>
                <p className="font-bold text-foreground mt-0.5">20%</p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground">Project Evidence</span>
                <p className="font-bold text-foreground mt-0.5">20%</p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Assessment</span>
                <p className="font-bold text-foreground mt-0.5">35%</p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground">GitHub Code</span>
                <p className="font-bold text-foreground mt-0.5">15%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STAGE 11 & 12: REACHABLE JOBS ELEVATION (4-TIER REACHABILITY) */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Stages 11 & 12: Reachable Jobs ↑
            </span>
            <h4 className="font-display text-base font-black text-foreground">
              4-Tier Job Reachability Matrix ({reachable_jobs?.total_opportunities || 0} Total Active)
            </h4>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {reachable_jobs?.tier_summary?.ready_now || 0} Ready Now
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20">
            <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
              Tier 1: Ready Now (≥85%)
            </span>
            <p className="text-xl font-black text-foreground mt-1">
              {reachable_jobs?.tier_summary?.ready_now || 0}
            </p>
            <span className="text-[10px] text-muted-foreground">Apply Immediately</span>
          </div>

          <div className="p-3 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20">
            <span className="text-[10px] font-extrabold uppercase text-blue-600 dark:text-blue-400">
              Tier 2: Nearly Ready (70-84%)
            </span>
            <p className="text-xl font-black text-foreground mt-1">
              {reachable_jobs?.tier_summary?.nearly_ready || 0}
            </p>
            <span className="text-[10px] text-muted-foreground">2-4 weeks effort</span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20">
            <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400">
              Tier 3: Skill Gap (50-69%)
            </span>
            <p className="text-xl font-black text-foreground mt-1">
              {reachable_jobs?.tier_summary?.skill_gap || 0}
            </p>
            <span className="text-[10px] text-muted-foreground">30-60 days effort</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-500/[0.06] border border-purple-500/20">
            <span className="text-[10px] font-extrabold uppercase text-purple-600 dark:text-purple-400">
              Tier 4: Future Target (&lt;50%)
            </span>
            <p className="text-xl font-black text-foreground mt-1">
              {reachable_jobs?.tier_summary?.future_target || 0}
            </p>
            <span className="text-[10px] text-muted-foreground">Long-term milestone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
