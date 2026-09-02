import { useEffect, useRef, useCallback } from "react";

/**
 * Magnetic button effect: button moves slightly toward cursor on approach.
 * Automatically disabled on mobile/touch devices and reduced-motion.
 */
export function useMagnetic<T extends HTMLElement = HTMLButtonElement>(strength: number = 0.3) {
  const ref = useRef<T>(null);
  const rafId = useRef(0);

  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) * strength;
        const dy = (e.clientY - cy) * strength;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
    },
    [strength],
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.transition = "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)";
    // Reset transition after it completes
    setTimeout(() => {
      if (el) el.style.transition = "";
    }, 400);
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

  return ref;
}
