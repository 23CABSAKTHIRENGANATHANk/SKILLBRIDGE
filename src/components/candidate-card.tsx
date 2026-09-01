import { Clock, GraduationCap, UserRound } from "lucide-react";
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

export function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <article className="card-lift rounded-3xl border bg-card p-5 shadow-soft">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-foreground">
          {candidate.avatarUrl ? (
            <img src={candidate.avatarUrl} alt="" className="size-12 rounded-2xl object-cover" />
          ) : (
            <UserRound className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold">{candidate.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <GraduationCap className="size-3.5" aria-hidden="true" />
            {candidate.college} · {candidate.experience}
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {candidate.skills.map((s) => (
              <li
                key={s}
                className="rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
        {candidate.match && <MatchRing score={candidate.match.score} size={76} />}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary-soft px-2.5 py-1 font-semibold text-primary">
            {stageLabel[candidate.stage]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" /> {candidate.appliedAt}
          </span>
        </span>
        <span className="flex gap-2">
          <Button size="sm" variant="outline">
            View profile
          </Button>
          <Button size="sm">Shortlist</Button>
        </span>
      </div>
    </article>
  );
}
