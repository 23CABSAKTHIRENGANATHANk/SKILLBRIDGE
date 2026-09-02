import { BadgeCheck, Briefcase, Sparkles } from "lucide-react";
import { useJobsQuery } from "@/hooks/use-api";

/**
 * Signature SkillBridge hero visual: real skill nodes connected by curved bridge
 * lines to live PostgreSQL-backed opportunity cards.
 */
export function CareerMap() {
  const { jobs, loading } = useJobsQuery();

  const liveSkills = Array.from(new Set(jobs.flatMap((j) => j.skills))).slice(0, 8);
  const liveRoles = jobs.slice(0, 4).map((j) => ({
    id: j.id,
    title: j.title,
    meta: `${j.location} · ${j.type}`,
  }));

  return (
    <div className="relative isolate rounded-4xl border bg-card/70 p-5 shadow-lift backdrop-blur-sm sm:p-7">
      <div
        aria-hidden="true"
        className="grid-field pointer-events-none absolute inset-0 rounded-4xl"
      />

      <div className="relative flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span>Verified skills</span>
        <span className="text-accent flex items-center gap-1">
          <Sparkles className="size-3" /> Live matching
        </span>
        <span>Opportunities</span>
      </div>

      {loading ? (
        <div className="relative mt-8 py-12 text-center text-xs text-muted-foreground">
          Loading live opportunities...
        </div>
      ) : liveRoles.length > 0 ? (
        <div className="relative mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)] items-center gap-2 sm:gap-4">
          <ul className="space-y-2">
            {liveSkills.map((s, i) => (
              <li
                key={s}
                className="float-chip rounded-full border bg-background px-3 py-1.5 text-xs font-semibold shadow-soft truncate"
                style={{ animationDelay: `${i * 0.35}s`, marginLeft: `${(i % 3) * 8}px` }}
              >
                {s}
              </li>
            ))}
          </ul>

          <svg
            viewBox="0 0 120 320"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="h-[320px] w-10 text-primary sm:w-20"
          >
            {liveRoles.map((_, i) => (
              <path
                key={i}
                d={`M0 ${40 + i * 70}C60 ${40 + i * 70} 60 ${44 + i * 68} 120 ${44 + i * 68}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeOpacity="0.55"
                className="dash-flow"
                style={{ animationDelay: `${i * 0.5}s` }}
              />
            ))}
          </svg>

          <ul className="space-y-2.5">
            {liveRoles.map((r, i) => (
              <li
                key={r.id}
                className="float-chip rounded-2xl border bg-background p-3 shadow-soft"
                style={{ animationDelay: `${i * 0.6}s` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-bold sm:text-sm truncate">
                    <Briefcase className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span className="truncate">{r.title}</span>
                  </span>
                  <BadgeCheck className="size-4 shrink-0 text-accent" aria-hidden="true" />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground truncate">{r.meta}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="relative mt-8 py-12 text-center">
          <Briefcase className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-bold text-foreground">Live matching active</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
            Opportunities posted by verified employers will connect here in real-time.
          </p>
        </div>
      )}
    </div>
  );
}
