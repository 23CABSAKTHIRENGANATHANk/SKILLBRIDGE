import { Star } from "lucide-react";
import type { PipelineCounts } from "@/types/skillbridge";

export function ApplicationPipeline({ counts }: { counts: PipelineCounts }) {
  const stages = [
    { key: "applied", label: "Applied", value: counts.applied },
    { key: "shortlisted", label: "Shortlisted", value: counts.shortlisted },
    { key: "interview", label: "Interview", value: counts.interview },
    { key: "offer", label: "Offers", value: counts.offer },
  ];

  return (
    <section
      aria-labelledby="pipeline-title"
      className="rounded-3xl border bg-card p-6 shadow-soft"
    >
      <h2 id="pipeline-title" className="font-display text-lg font-bold">
        Application pipeline
      </h2>
      <ol className="mt-6 grid gap-0 sm:grid-cols-4">
        {stages.map((stage, i) => (
          <li key={stage.key} className="relative flex gap-4 pb-6 sm:block sm:pb-0">
            <span
              aria-hidden="true"
              className="absolute left-[7px] top-5 h-full w-px bg-border sm:left-4 sm:top-2 sm:h-px sm:w-full"
            />
            <span className="relative z-10 mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary sm:mt-0 sm:size-5">
              {i === stages.length - 1 ? (
                <Star className="size-2.5 text-primary-foreground" aria-hidden="true" />
              ) : (
                <span className="size-1.5 rounded-full bg-primary-foreground" />
              )}
            </span>
            <div className="sm:mt-3">
              <p className="font-display text-2xl font-extrabold leading-none">{stage.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stage.label}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
