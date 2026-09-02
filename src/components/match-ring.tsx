import { Check, Circle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useCounter } from "@/hooks/use-counter";
import type { SkillMatch } from "@/types/skillbridge";

function label(score: number) {
  if (score >= 90) return "Excellent match";
  if (score >= 80) return "Great match";
  if (score >= 65) return "Good match";
  return "Partial match";
}

export function MatchRing({
  score,
  size = 112,
  className,
  animate = true,
}: {
  score: number;
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const { ref, revealed } = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });
  const animatedScore = useCounter(score, { enabled: animate ? revealed : true, duration: 900 });
  const displayScore = animate ? animatedScore : score;

  return (
    <div
      ref={ref}
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${score} percent skill match — ${label(score)}`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <defs>
          <linearGradient id="sb-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.48 0.19 269)" />
            <stop offset="100%" stopColor="oklch(0.7 0.13 200)" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#sb-ring)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * displayScore) / 100}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-extrabold leading-none">{displayScore}%</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          match
        </span>
      </div>
    </div>
  );
}

export function SkillMatchPanel({
  match,
  onImprove,
  className,
}: {
  match: SkillMatch;
  onImprove?: () => void;
  className?: string;
}) {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
  const [showLabel, setShowLabel] = useState(false);

  // Show "Great Match" label after ring animation completes
  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setShowLabel(true), 1000);
    return () => clearTimeout(timer);
  }, [revealed]);

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-soft sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <MatchRing score={match.score} />
        <div className="sm:hidden">
          <p
            className="font-display text-base font-bold transition-opacity duration-500"
            style={{ opacity: showLabel ? 1 : 0 }}
          >
            {label(match.score)}
          </p>
          <p className="text-sm text-muted-foreground">Based on your skill profile</p>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="hidden font-display text-base font-bold transition-opacity duration-500 sm:block"
          style={{ opacity: showLabel ? 1 : 0 }}
        >
          {label(match.score)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.matched.map((s, i) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "none" : "translateY(8px)",
                transition: `opacity 300ms ease ${200 + i * 100}ms, transform 300ms ease ${200 + i * 100}ms`,
              }}
            >
              <Check className="size-3" aria-hidden="true" /> {s}
            </span>
          ))}
          {match.missing.map((s, i) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "none" : "translateY(8px)",
                transition: `opacity 300ms ease ${200 + (match.matched.length + i) * 100}ms, transform 300ms ease ${200 + (match.matched.length + i) * 100}ms`,
              }}
            >
              <Circle className="size-3" aria-hidden="true" /> {s}
            </span>
          ))}
        </div>
        {match.missing.length > 0 && (
          <button
            type="button"
            onClick={onImprove}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Improve match
          </button>
        )}
      </div>
    </div>
  );
}
