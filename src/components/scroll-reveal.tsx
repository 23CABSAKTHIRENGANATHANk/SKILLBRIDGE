import type { ReactNode, CSSProperties, ElementType } from "react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right";

const directionTransform: Record<Direction, string> = {
  up: "translateY(24px)",
  down: "translateY(-24px)",
  left: "translateX(24px)",
  right: "translateX(-24px)",
};

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  duration?: number;
  blur?: boolean;
  threshold?: number;
  as?: ElementType;
  onClick?: () => void;
}

/**
 * Wrapper that animates children into view when entering the viewport.
 * Uses IntersectionObserver — no external animation library.
 */
export function ScrollReveal({
  children,
  className,
  direction = "up",
  delay = 0,
  duration = 500,
  blur = false,
  threshold = 0.15,
  as: Tag = "div",
  onClick,
}: ScrollRevealProps) {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>({ threshold });

  const style: CSSProperties = {
    opacity: revealed ? 1 : 0,
    transform: revealed ? "none" : directionTransform[direction],
    filter: blur && !revealed ? "blur(6px)" : "none",
    transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, filter ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    willChange: "opacity, transform",
  };

  return (
    <Tag ref={ref} className={cn(className)} style={style} onClick={onClick}>
      {children}
    </Tag>
  );
}
