import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor dot for desktop — small dot that expands on interactive
 * elements and shows a ring on CTAs. Invisible on mobile/touch/reduced-motion.
 */
export function CursorDot() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const pos = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const raf = useRef(0);

  useEffect(() => {
    // Disable on touch devices and reduced motion
    if ("ontouchstart" in window) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setVisible(true);

    const handleMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const dot = dotRef.current;
      if (!dot) return;

      const isBtn =
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']");
      const isCta =
        target.closest("[data-cta]") ||
        target.closest(".btn-ripple");

      dot.classList.toggle("interactive", !!isBtn && !isCta);
      dot.classList.toggle("cta", !!isCta);
    };

    const animate = () => {
      // Smooth follow with lerp
      current.current.x += (pos.current.x - current.current.x) * 0.15;
      current.current.y += (pos.current.y - current.current.y) * 0.15;
      const dot = dotRef.current;
      if (dot) {
        dot.style.left = `${current.current.x}px`;
        dot.style.top = `${current.current.y}px`;
      }
      raf.current = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseover", handleOver);
    raf.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseover", handleOver);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  if (!visible) return null;

  return <div ref={dotRef} className="sb-cursor-dot" aria-hidden="true" />;
}
