import { useState, useEffect } from "react";
import {
  Sparkles,
  Bot,
  Brain,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Briefcase,
  Zap,
  RefreshCw,
  Clock,
  Target,
  FileText,
  ChevronRight,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/scroll-reveal";
import { useAIResumeSummary, useAIRecommendations, useAISkillGap } from "@/hooks/use-ai";
import type { Job } from "@/types/skillbridge";
import { toast } from "sonner";

interface AICareerCopilotProps {
  onSelectJob?: (job: Job) => void;
}

export function AICareerCopilot({ onSelectJob }: AICareerCopilotProps) {
  const {
    data: resumeAnalysis,
    aiPowered: resumeAiPowered,
    loading: resumeLoading,
    generate: generateResumeSummary,
  } = useAIResumeSummary();

  const {
    recommendations,
    aiPowered: recsAiPowered,
    loading: recsLoading,
    refetch: refetchRecs,
  } = useAIRecommendations();

  const [selectedJobIdForGap, setSelectedJobIdForGap] = useState<string | null>(null);
  const {
    data: gapAnalysis,
    jobTitle: gapJobTitle,
    loading: gapLoading,
    analyze: analyzeGap,
  } = useAISkillGap(selectedJobIdForGap);

  // Auto-generate resume summary on first load
  useEffect(() => {
    generateResumeSummary();
  }, [generateResumeSummary]);

  // Set default target job for gap analysis
  useEffect(() => {
    if (recommendations.length > 0 && !selectedJobIdForGap) {
      const firstJobId = recommendations[0]?.id;
      if (firstJobId) {
        setSelectedJobIdForGap(firstJobId);
      }
    }
  }, [recommendations, selectedJobIdForGap]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/5 p-6 sm:p-8 shadow-soft">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                SkillBridge AI Career Copilot
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                Intelligent Job Fit & Skill Acceleration
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                Powered by Google Gemini 1.5 Flash. Real-time resume insights, targeted match
                explanations, and personalized roadmaps to make you job-ready.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  generateResumeSummary();
                  refetchRecs();
                  toast.success("AI insights refreshed!");
                }}
                disabled={resumeLoading || recsLoading}
                className="gap-2 rounded-xl bg-card hover:bg-muted"
              >
                <RefreshCw
                  className={`h-4 w-4 ${resumeLoading || recsLoading ? "animate-spin" : ""}`}
                />
                Re-Analyze Profile
              </Button>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Grid: Resume Analysis & Personalized Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Resume Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <ScrollReveal delay={0.1}>
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">AI Resume Summary</h3>
                    <p className="text-xs text-muted-foreground">ATS Optimization & Strengths</p>
                  </div>
                </div>

                {resumeAnalysis && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <Award className="h-3.5 w-3.5" />
                    ATS: {resumeAnalysis.ats_score}/100
                  </div>
                )}
              </div>

              {resumeLoading ? (
                <div className="space-y-3 py-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-16 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ) : resumeAnalysis ? (
                <div className="space-y-4 text-xs">
                  {/* Headline */}
                  <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/15">
                    <span className="font-medium text-primary block mb-1">
                      Professional Headline
                    </span>
                    <p className="font-semibold text-foreground text-sm">
                      "{resumeAnalysis.headline}"
                    </p>
                  </div>

                  {/* Summary */}
                  <div>
                    <span className="font-medium text-muted-foreground block mb-1">
                      Profile Narrative
                    </span>
                    <p className="text-foreground leading-relaxed bg-muted/30 p-3 rounded-2xl border border-border/50">
                      {resumeAnalysis.summary}
                    </p>
                  </div>

                  {/* Key Strengths */}
                  <div>
                    <span className="font-medium text-muted-foreground block mb-1.5">
                      Identified Core Strengths
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        resumeAnalysis.key_strengths ||
                        (resumeAnalysis as any).strengths ||
                        []
                      ).map((str: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-medium"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {str}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Improvement Tips */}
                  {(
                    resumeAnalysis.improvement_tips ||
                    (resumeAnalysis as any).recommendations ||
                    []
                  ).length > 0 && (
                    <div className="pt-2 border-t border-border/60">
                      <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        ATS Boost Recommendations
                      </span>
                      <ul className="space-y-1.5 text-muted-foreground pl-1">
                        {(
                          resumeAnalysis.improvement_tips ||
                          (resumeAnalysis as any).recommendations ||
                          []
                        ).map((tip: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-primary font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  Click "Re-Analyze Profile" to generate your AI summary.
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>

        {/* Right Column: Personalized AI Job Recommendations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <ScrollReveal delay={0.2}>
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      Personalized AI Matches
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ranked by career fit & skill synergy
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                  <Zap className="h-3 w-3 text-amber-500" />
                  Ranked for You
                </div>
              </div>

              {recsLoading ? (
                <div className="space-y-3 py-4 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted rounded-2xl" />
                  ))}
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-3.5">
                  {recommendations.map((job) => {
                    const isTarget = selectedJobIdForGap === job.id;
                    return (
                      <div
                        key={job.id}
                        className={`group relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                          isTarget
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/70 hover:border-primary/40 bg-card hover:bg-muted/20"
                        }`}
                        onClick={() => {
                          setSelectedJobIdForGap(job.id);
                          analyzeGap(job.id);
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                {job.title}
                              </h4>
                              {job.fit_label && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
                                  {job.fit_label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">
                              {job.company.name} • {job.location} • {job.type}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {onSelectJob && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2.5 text-xs text-primary group-hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectJob(job);
                                }}
                              >
                                View Job
                                <ArrowRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* AI Reason callout */}
                        {job.ai_reason && (
                          <div className="mt-2.5 flex items-start gap-1.5 text-xs text-foreground/80 bg-background/80 p-2.5 rounded-xl border border-border/40">
                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="leading-snug">{job.ai_reason}</span>
                          </div>
                        )}

                        {/* Skills preview */}
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {job.skills.slice(0, 4).map((sk, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground"
                            >
                              {sk}
                            </span>
                          ))}
                          {job.skills.length > 4 && (
                            <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              +{job.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  No recommendation matches found.
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Full-width Section: AI Skill Gap & Interactive Learning Roadmap */}
      <ScrollReveal delay={0.3}>
        <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-heading">
                  AI Skill Gap & Recommended Learning Path
                </h3>
                <p className="text-xs text-muted-foreground">
                  Target Role:{" "}
                  <span className="font-semibold text-foreground">
                    {gapJobTitle || "Selected Job Opportunity"}
                  </span>
                </p>
              </div>
            </div>

            {gapAnalysis && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-muted/60 px-3.5 py-1.5 rounded-2xl">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Estimated Prep: {gapAnalysis.time_to_ready}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/25 px-3.5 py-1.5 rounded-2xl text-primary font-bold text-xs">
                  <TrendingUp className="h-4 w-4" />
                  {gapAnalysis.readiness_score}% Role Ready
                </div>
              </div>
            )}
          </div>

          {gapLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-2xl" />
              ))}
            </div>
          ) : gapAnalysis ? (
            <div className="space-y-6">
              {/* Encouragement banner */}
              {gapAnalysis.encouragement && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{gapAnalysis.encouragement}</span>
                </div>
              )}

              {/* Roadmap Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(gapAnalysis.roadmap || []).map((step, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-2xl border border-border/80 bg-background/60 p-5 space-y-3.5 hover:border-primary/50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-sm text-foreground">{step.skill}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          step.priority === "High"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {step.priority} Priority
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.why_needed}
                    </p>

                    {/* Quick win */}
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-foreground">
                      <span className="font-semibold text-primary block mb-0.5 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Quick Win This Week:
                      </span>
                      <span>{step.quick_win}</span>
                    </div>

                    {/* Resources */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> Recommended Materials:
                      </span>
                      <ul className="text-xs text-muted-foreground space-y-0.5 pl-3 list-disc">
                        {(step.resources || []).map((res, rIdx) => (
                          <li key={rIdx} className="text-[11px]">
                            {res}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-xs">
              Select a job opportunity above to view your personalized AI skill gap and roadmap.
            </div>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
}
