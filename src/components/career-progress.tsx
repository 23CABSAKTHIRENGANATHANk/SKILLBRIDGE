import { ArrowRight, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CareerProgress } from "@/types/skillbridge";

export function CareerProgressCard({ progress }: { progress: CareerProgress }) {
  return (
    <section
      aria-labelledby="career-progress-title"
      className="rounded-3xl border bg-card p-6 shadow-soft"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="career-progress-title" className="font-display text-lg font-bold">
          Career progress
        </h2>
        <span className="font-display text-3xl font-extrabold bridge-gradient-text">
          {progress.percent}%
        </span>
      </div>

      <div
        className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <div
          className="bridge-gradient-bg h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {progress.steps.map((step) => (
          <li key={step.id} className="flex items-center gap-2 text-sm">
            {step.complete ? (
              <Check className="size-4 text-success" aria-hidden="true" />
            ) : (
              <Circle className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={step.complete ? "font-medium" : "text-muted-foreground"}>
              {step.label}
            </span>
          </li>
        ))}
      </ul>

      <Button className="mt-6 w-full sm:w-auto">
        Complete profile <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </section>
  );
}
