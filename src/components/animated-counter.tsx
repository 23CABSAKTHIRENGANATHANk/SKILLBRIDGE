import { useCounter } from "@/hooks/use-counter";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}

/**
 * Displays a number that animates from 0 → target when entering the viewport.
 * Uses eased interpolation for a natural feel.
 */
export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  className,
  duration = 1200,
}: AnimatedCounterProps) {
  const { ref, revealed } = useScrollReveal<HTMLSpanElement>({ threshold: 0.3 });
  const count = useCounter(value, { enabled: revealed, duration });

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}
