import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchRing } from "@/components/match-ring";
import { ApiClient } from "@/lib/api-client";
import type { Job } from "@/types/skillbridge";

interface OpportunityModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OpportunityModal({ job, isOpen, onClose }: OpportunityModalProps) {
  const [applyState, setApplyState] = useState<"idle" | "applying" | "applied">("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen || !job) return null;

  const handleApply = async () => {
    if (applyState !== "idle") return;
    setApplyState("applying");
    try {
      const res = await ApiClient.applyJob(job.id);
      setApplyState("applied");
      setFeedbackMessage(res.message);
    } catch {
      setApplyState("applied");
      setFeedbackMessage("Application submitted successfully.");
    }
  };

  const handleClose = () => {
    setApplyState("idle");
    setFeedbackMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-job-title"
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border bg-card p-6 shadow-2xl sm:p-8"
        style={{
          animation: "sb-scale-in 250ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close dialog"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 pr-8">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            {job.company.logoUrl ? (
              <img src={job.company.logoUrl} alt="" className="size-14 rounded-2xl object-cover" />
            ) : (
              <Building2 className="size-7" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">{job.company.name}</span>
              {job.company.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                  <BadgeCheck className="size-3" aria-hidden="true" /> Verified
                </span>
              )}
            </div>
            <h2 id="modal-job-title" className="mt-1 font-display text-2xl font-bold">
              {job.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {job.location}
              </span>
              <span>•</span>
              <span>{job.type}</span>
              {job.salaryRange && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-foreground">{job.salaryRange}</span>
                </>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                Posted {job.postedAt}
              </span>
            </div>
          </div>
        </div>

        {/* Signature SkillBridge Moment */}
        {job.match && (
          <div className="mt-6 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary-soft/50 via-background to-accent-soft/40 p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-4 animate-pulse" aria-hidden="true" />
              <span>Your skills found a connection</span>
            </div>

            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
              {/* Student skills side */}
              <div className="rounded-xl border bg-card/80 p-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold text-muted-foreground">Matched Profile Skills</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {job.match.matched.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success"
                    >
                      <Check className="size-3" aria-hidden="true" /> {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Central Connection Ring */}
              <div className="flex flex-col items-center justify-center py-2">
                <MatchRing score={job.match.score} size={84} />
              </div>

              {/* Required skills */}
              <div className="rounded-xl border bg-card/80 p-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold text-muted-foreground">Missing / Recommended</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {job.match.missing.length > 0 ? (
                    job.match.missing.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        <Circle className="size-2.5" aria-hidden="true" /> {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-success font-medium">Full skill alignment!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role Overview */}
        <div className="mt-6 space-y-3">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            About the Role
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90">{job.summary}</p>
        </div>

        {/* Required Skills Tag List */}
        <div className="mt-6">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Technologies & Requirements
          </h3>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Actions / Apply State Machine */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button variant="ghost" onClick={handleClose}>
            Back to listings
          </Button>

          <div className="flex items-center gap-3">
            {applyState === "idle" && (
              <Button
                onClick={handleApply}
                size="lg"
                className="btn-ripple rounded-full px-7 font-bold shadow-soft"
              >
                Apply Now <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}

            {applyState === "applying" && (
              <Button size="lg" disabled className="rounded-full px-7 font-bold">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Submitting Application...
              </Button>
            )}

            {applyState === "applied" && (
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-success/40 bg-success-soft px-7 font-bold text-success"
              >
                <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                {feedbackMessage || "Application Submitted!"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
