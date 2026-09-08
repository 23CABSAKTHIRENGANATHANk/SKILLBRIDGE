import { type ReactNode } from "react";

export interface PageContainerProps {
  children: ReactNode;
  size?: "default" | "narrow" | "wide" | "full";
  className?: string;
}

const sizeClasses: Record<NonNullable<PageContainerProps["size"]>, string> = {
  default: "max-w-7xl",
  narrow: "max-w-5xl",
  wide: "max-w-[1440px]",
  full: "max-w-none",
};

/**
 * Standardized PageContainer for consistent layout grid, responsive padding,
 * max-width boundaries, and viewport-safe bottom spacing across all pages.
 */
export function PageContainer({
  children,
  size = "default",
  className = "",
}: PageContainerProps) {
  return (
    <main
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-28 sm:pb-32 transition-all ${
        sizeClasses[size]
      } ${className}`}
    >
      {children}
    </main>
  );
}
