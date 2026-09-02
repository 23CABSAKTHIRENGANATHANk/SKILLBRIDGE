import { useEffect, useRef, useState, useCallback } from "react";

interface ParallaxOffset {
  x: number;
  y: number;
}

/**
 * Tracks mouse position relative to a container and returns normalized
 * offsets (-1 to 1) for parallax layers. Disabled on touch/reduced-motion.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [offset, setOffset] = useState<ParallaxOffset>({ x: 0, y: 0 });
  const rafId = useRef(0);

  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      if (!el || isTouch || reducedMotion) return;

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const x = (e.clientX - cx) / (rect.width / 2);
        const y = (e.clientY - cy) / (rect.height / 2);
        setOffset({
          x: Math.max(-1, Math.min(1, x)),
          y: Math.max(-1, Math.min(1, y)),
        });
      });
    },
    [isTouch, reducedMotion],
  );

  const handleMouseLeave = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || isTouch || reducedMotion) return;

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafId.current);
    };
  }, [handleMouseMove, handleMouseLeave, isTouch, reducedMotion]);

  /** Compute translate for a given intensity (e.g., 2, 5, 8) */
  const getTransform = useCallback(
    (intensity: number) => ({
      transform: `translate(${offset.x * intensity}px, ${offset.y * intensity}px)`,
      transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
    }),
    [offset],
  );

  return { ref, offset, getTransform };
}
