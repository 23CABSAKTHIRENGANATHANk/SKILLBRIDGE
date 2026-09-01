import { Clock, GraduationCap, UserRound, MapPin, Sparkles, Check, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchRing } from "@/components/match-ring";
import type { Candidate } from "@/types/skillbridge";

const stageLabel: Record<Candidate["stage"], string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Not selected",
};

export function CandidateCard({
  candidate,
  onUpdateStage,
  shortlisted = false,
  note = "",
  onToggleShortlist,
  onNoteChange,
}: {
  candidate: Candidate;
  onUpdateStage?: (appId: string, nextStage: string, name: string) => void;
  shortlisted?: boolean;
  note?: string;
  onToggleShortlist?: (candidateId: string, nextValue: boolean) => void;
  onNoteChange?: (candidateId: string, nextNote: string) => void;
}) {
  const roleFitScore = candidate.roleFitScore || candidate.match?.role_fit_score || candidate.match?.score || 88;
  const match = candidate.match;
  const fitLevel = match?.fit_level || (roleFitScore >= 85 ? "Strong Fit" : roleFitScore >= 65 ? "Moderate Fit" : "Developing Fit");

  return (
    <article className="card-lift rounded-3xl border border-border/80 bg-card p-5 shadow-soft transition-all hover:border-primary/40">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-foreground shadow-sm">
          {candidate.avatarUrl ? (
            <img src={candidate.avatarUrl} alt="" className="size-12 rounded-2xl object-cover" />
          ) : (
            <UserRound className="size-6" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-bold text-foreground">{candidate.name}</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                fitLevel.toLowerCase().includes("strong")
                  ? "bg-success-soft text-success"
                  : fitLevel.toLowerCase().includes("moderate")
                    ? "bg-warning-soft text-warning-foreground"
                    : "bg-primary-soft text-primary"
              }`}
            >
              {fitLevel}
            </span>
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GraduationCap className="size-3.5" aria-hidden="true" />
              {candidate.college}
            </span>
            {candidate.graduationYear && (
              <span>• Batch of {candidate.graduationYear}</span>
            )}
            {candidate.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground" />
                {candidate.location.split(",")[0]}
              </span>
            )}
          </p>

          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 font-bold text-primary text-[11px]">
              <Sparkles className="size-3" />
              Role Fit: {roleFitScore}%
            </span>
            {candidate.experience && (
              <span className="text-muted-foreground text-[11px]">Exp: {candidate.experience}</span>
            )}
          </div>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {candidate.skills.slice(0, 5).map((s) => (
              <li
                key={s}
                className="rounded-full border border-border/80 bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
              >
                {s}
              </li>
            ))}
            {candidate.skills.length > 5 && (
              <li className="text-[10px] text-muted-foreground self-center">
                +{candidate.skills.length - 5} more
              </li>
            )}
          </ul>
        </div>

        {match && <MatchRing score={match.score} size={72} />}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase text-foreground">
            {stageLabel[candidate.stage]}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px]">
            <Clock className="size-3" /> {candidate.appliedAt}
          </span>
        </span>

        {candidate.appId && onUpdateStage && (
          <div className="flex items-center gap-1.5">
            {candidate.stage === "applied" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 rounded-xl font-bold"
                onClick={() => onUpdateStage(candidate.appId!, "shortlisted", candidate.name)}
              >
                {shortlisted ? "Shortlisted" : "Shortlist"}
              </Button>
            )}
            {(candidate.stage === "applied" || candidate.stage === "shortlisted") && (
              <Button
                size="sm"
                className="text-xs h-8 rounded-xl font-bold"
                onClick={() => onUpdateStage(candidate.appId!, "interview", candidate.name)}
              >
                Interview
              </Button>
            )}
            {candidate.stage === "interview" && (
              <Button
                size="sm"
                className="text-xs h-8 rounded-xl font-bold bg-success hover:bg-success/90 text-success-foreground"
                onClick={() => onUpdateStage(candidate.appId!, "offer", candidate.name)}
              >
                Make Offer
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-border/70 bg-background/50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recruiter note</span>
          <button
            type="button"
            onClick={() => onToggleShortlist?.(candidate.id, !shortlisted)}
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
              shortlisted ? "bg-success-soft text-success" : "bg-secondary text-foreground"
            }`}
          >
            {shortlisted ? "Shortlisted" : "Mark shortlist"}
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => onNoteChange?.(candidate.id, e.target.value)}
          placeholder="Add a hiring note, assessment summary, or follow-up reminder..."
          className="min-h-[74px] w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </article>
  );
}
