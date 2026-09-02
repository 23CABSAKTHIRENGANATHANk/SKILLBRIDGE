import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Brain,
  Award,
  Zap,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIMatchExplain } from "@/hooks/use-ai";
import { MatchRing } from "@/components/match-ring";

interface AIMatchModalProps {
  jobId: string | null;
  jobTitle?: string | undefined;
  companyName?: string | undefined;
  onClose: () => void;
  onApply?: (() => void) | (() => Promise<void>) | undefined;
  hasApplied?: boolean | undefined;
}

export function AIMatchModal({
  jobId,
  jobTitle,
  companyName,
  onClose,
  onApply,
  hasApplied,
}: AIMatchModalProps) {
  const { data: explanation, meta, loading, explain } = useAIMatchExplain(jobId);

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            AI Match Analysis & Reasoning
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground font-heading">
            {meta?.jobTitle || jobTitle || "Opportunity Analysis"}
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            {meta?.company || companyName || "Company"} • Deep Candidate-to-Job Fit Breakdown
          </p>
        </div>

        {loading ? (
          <div className="py-12 space-y-4 text-center animate-pulse">
            <Brain className="h-10 w-10 mx-auto text-primary animate-bounce" />
            <p className="text-sm font-semibold text-foreground">
              Evaluating skill overlap with Google Gemini...
            </p>
            <p className="text-xs text-muted-foreground">
              Analyzing direct matches, project alignment, and gap metrics.
            </p>
          </div>
        ) : explanation ? (
          <div className="space-y-5 text-xs">
            {/* Verdict & Match Score Top Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-accent/10 border border-primary/20">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  AI Fit Verdict
                </span>
                <h3 className="text-lg font-bold text-foreground">{explanation.verdict}</h3>
                <p className="text-xs text-muted-foreground">
                  Confidence Score: {explanation.confidence}%
                </p>
              </div>

              <div className="flex items-center gap-3">
                <MatchRing score={meta?.matchScore ?? explanation.confidence} size={64} />
              </div>
            </div>

            {/* Fit Paragraph */}
            <div className="space-y-1.5">
              <span className="font-semibold text-foreground text-xs block">
                Personalized Fit Rationale
              </span>
              <p className="text-foreground leading-relaxed bg-muted/30 p-3.5 rounded-2xl border border-border/60">
                {explanation.fit_paragraph}
              </p>
            </div>

            {/* Top Strengths */}
            <div className="space-y-2">
              <span className="font-semibold text-foreground text-xs block">
                Top Reasons You Stand Out
              </span>
              <div className="space-y-1.5">
                {explanation.top_reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gap Summary & Missing Skills */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                <AlertCircle className="h-4 w-4" />
                <span>Identified Skill Gaps</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{explanation.gap_summary}</p>
              {explanation.missing_skills && explanation.missing_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {explanation.missing_skills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium text-[11px]"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Recruiter Pitch Insight */}
            <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Zap className="h-4 w-4" />
                <span>What the Hiring Team Sees:</span>
              </div>
              <p className="text-muted-foreground italic">"{explanation.recruiter_tip}"</p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Could not load AI explanation.
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => explain(jobId)}
            disabled={loading}
            className="gap-1.5 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-Evaluate
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl">
              Close
            </Button>
            {onApply && (
              <Button
                size="sm"
                onClick={onApply}
                disabled={hasApplied}
                className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {hasApplied ? "Applied ✓" : "Apply Now"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
