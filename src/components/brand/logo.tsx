import { cn } from "@/lib/utils";

export function BridgeMark({ className }: { className?: string }) {
  return (
    <img
      src="/skillbridge-logo.jpeg"
      alt=""
      className={cn("h-9 w-14 rounded-md object-cover object-[center_28%]", className)}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)} aria-label="SkillBridge">
      <BridgeMark />
      <span className="font-display text-lg font-extrabold tracking-tight" aria-hidden="true">
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
