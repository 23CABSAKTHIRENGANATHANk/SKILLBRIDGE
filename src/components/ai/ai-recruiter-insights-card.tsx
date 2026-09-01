import {
  Sparkles,
  TrendingUp,
  Brain,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Zap,
  Users,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIRecruiterInsights } from "@/hooks/use-ai";
import { toast } from "sonner";

export function AIRecruiterInsightsCard() {
  const { insights, stats, topSkills, aiPowered, loading, error, refetch } = useAIRecruiterInsights();

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/5 p-6 sm:p-8 shadow-soft space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground font-heading">
                AI Recruiter Pipeline Insights
              </h3>
              {insights?.pipeline_health && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    insights.pipeline_health === "Healthy"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {insights.pipeline_health} Pipeline
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Powered by Google Gemini • Real-time applicant pool analysis & conversion optimization
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetch();
            toast.success("Recruiter insights refreshed!");
          }}
          disabled={loading}
          className="gap-2 rounded-xl bg-card hover:bg-muted self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Insights
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl" />
          ))}
        </div>
      ) : insights ? (
        <div className="space-y-6 text-xs">
          {/* Top 2 Cards: Summary & Top Insight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Summary */}
            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
              <span className="font-semibold text-primary uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Pipeline Overview
              </span>
              <p className="text-foreground leading-relaxed">
                {insights.summary}
              </p>
              {stats && (
                <div className="flex items-center gap-3 pt-2 text-muted-foreground font-medium">
                  <span>Total: <strong>{stats.total}</strong></span>
                  <span>•</span>
                  <span>Shortlisted: <strong>{stats.shortlisted}</strong></span>
                  <span>•</span>
                  <span>Interview: <strong>{stats.interview}</strong></span>
                </div>
              )}
            </div>

            {/* Top Insight */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
              <span className="font-semibold text-primary uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Key Observation
              </span>
              <p className="text-foreground font-medium leading-relaxed">
                "{insights.top_insight}"
              </p>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Pool Quality: <strong className="text-foreground">{insights.talent_pool_quality}</strong>
              </div>
            </div>
          </div>

          {/* Action Recommendations & Conversion Tip */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Actions Checklist (7 cols) */}
            <div className="md:col-span-7 p-4 rounded-2xl bg-card border border-border/70 space-y-2.5">
              <span className="font-semibold text-foreground text-xs block">
                Recommended Recruiter Actions:
              </span>
              <div className="space-y-1.5">
                {insights.action_recommendations.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion Tip & Top Skills (5 cols) */}
            <div className="md:col-span-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="space-y-1">
                <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-xs">
                  <Zap className="h-3.5 w-3.5" /> Conversion Accelerator
                </span>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  {insights.conversion_tip}
                </p>
              </div>

              {topSkills.length > 0 && (
                <div className="pt-2 border-t border-amber-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Top Skills in Applicant Pool:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {topSkills.slice(0, 5).map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-semibold"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 text-center text-xs text-destructive bg-destructive/10 rounded-2xl">
          {error}
        </div>
      ) : null}
    </div>
  );
}
