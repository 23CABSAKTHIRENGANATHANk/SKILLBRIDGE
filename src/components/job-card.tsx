import { ArrowRight, BadgeCheck, Building2, Clock, Heart } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Job } from "@/types/skillbridge";

export function JobCard({
  job,
  className,
  onSelect,
}: {
  job: Job;
  className?: string;
  onSelect?: (job: Job) => void;
}) {
  const [saved, setSaved] = useState(false);

  return (
    <article
      className={cn(
        "group gradient-sweep card-lift relative overflow-hidden rounded-3xl border bg-card p-5 shadow-soft",
        className,
      )}
    >
      {/* Top gradient accent line */}
      <span
        aria-hidden="true"
        className="bridge-gradient-bg absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform duration-250 group-hover:scale-[1.04]">
            {job.company.logoUrl ? (
              <img src={job.company.logoUrl} alt="" className="size-11 rounded-2xl object-cover" />
            ) : (
              <Building2 className="size-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{job.company.name}</p>
            {job.company.verified ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Unverified</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSaved((s) => !s);
            }}
            aria-label={saved ? "Remove from saved" : "Save job"}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <Heart
              className={cn(
                "size-4 transition-all duration-200",
                saved && "fill-destructive text-destructive",
              )}
              style={saved ? { animation: "sb-heart-pop 400ms ease-out" } : undefined}
            />
          </button>
          {job.match && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground transition-shadow duration-300 group-hover:shadow-glow">
              {job.match.score}% match
            </span>
          )}
        </div>
      </header>

      <h3 className="mt-4 font-display text-lg font-bold leading-snug">{job.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{job.summary}</p>

      <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5" aria-hidden="true" />
          <dd>{job.location}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-current" aria-hidden="true" />
          <dd>{job.type}</dd>
        </div>
        {job.salaryRange && (
          <div className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-current" aria-hidden="true" />
            <dd className="font-medium text-foreground">{job.salaryRange}</dd>
          </div>
        )}
      </dl>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {job.skills.map((skill) => (
          <li
            key={skill}
            className="rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent-soft group-hover:text-accent-foreground"
          >
            {skill}
          </li>
        ))}
      </ul>

      <footer className="mt-5 flex items-center justify-between border-t pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" /> {job.postedAt}
        </span>
        <button
          type="button"
          onClick={() => onSelect?.(job)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          View opportunity
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-1.5"
            aria-hidden="true"
          />
        </button>
      </footer>
    </article>
  );
}

function MapPin({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="size-11 shimmer-skeleton rounded-2xl" />
        <div className="space-y-2">
          <div className="h-3 w-28 shimmer-skeleton rounded" />
          <div className="h-2.5 w-16 shimmer-skeleton rounded" />
        </div>
      </div>
      <div className="mt-4 h-5 w-2/3 shimmer-skeleton rounded" />
      <div className="mt-2 h-3 w-full shimmer-skeleton rounded" />
      <div className="mt-2 h-3 w-4/5 shimmer-skeleton rounded" />
      <div className="mt-4 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-6 w-16 shimmer-skeleton rounded-full" />
        ))}
      </div>
      <div className="mt-5 h-4 w-full shimmer-skeleton rounded" />
    </div>
  );
}
