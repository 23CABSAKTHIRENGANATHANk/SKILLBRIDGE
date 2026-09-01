import { useEffect, useState } from "react";

/**
 * Animates a number from 0 to `target` over `duration` ms using eased interpolation.
 * Starts only when `enabled` is true (pair with useScrollReveal).
 */
export function useCounter(target: number, options?: { duration?: number; enabled?: boolean }) {
  const { duration = 1200, enabled = true } = options ?? {};
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled || target === 0) {
      if (!enabled) setValue(0);
      return;
    }

    let start: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);

  return value;
}
