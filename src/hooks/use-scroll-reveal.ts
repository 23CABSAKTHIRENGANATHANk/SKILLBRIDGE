import { useEffect, useRef, useState } from "react";

/**
 * Detects when an element enters the viewport using IntersectionObserver.
 * Returns a ref to attach and a boolean `revealed` state.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
  } = {},
) {
  const { threshold = 0.15, rootMargin = "0px 0px -40px 0px", triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion — reveal immediately
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          if (triggerOnce) observer.disconnect();
        } else if (!triggerOnce) {
          setRevealed(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, revealed };
}
