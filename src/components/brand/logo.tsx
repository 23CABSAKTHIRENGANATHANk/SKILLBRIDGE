import { cn } from "@/lib/utils";

export function BridgeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <defs>
        <linearGradient id="sb-mark" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.42 0.2 275)" />
          <stop offset="60%" stopColor="oklch(0.52 0.19 258)" />
          <stop offset="100%" stopColor="oklch(0.7 0.13 200)" />
        </linearGradient>
      </defs>
      <path
        d="M3 23C9 23 11 7 16 7s7 16 13 16"
        fill="none"
        stroke="url(#sb-mark)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="4" cy="23" r="3" fill="url(#sb-mark)" />
      <circle cx="28" cy="23" r="3" fill="url(#sb-mark)" />
      <circle cx="16" cy="7" r="2.5" fill="url(#sb-mark)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BridgeMark />
      <span className="font-display text-lg font-extrabold tracking-tight">
        Skill<span className="bridge-gradient-text">Bridge</span>
      </span>
    </span>
  );
}

/** The reusable SkillBridge "Bridge Line" motif: skills → opportunities → career. */
export function BridgeLine({
  className,
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 400 40"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-8 w-full", className)}
    >
      <path
        d="M0 34C70 34 90 6 200 6s130 28 200 28"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M0 34C70 34 90 6 200 6s130 28 200 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={animated ? "dash-flow" : undefined}
      />
    </svg>
  );
}
