import { type ReactNode } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";

export interface PageHeaderProps {
  badge?: {
    icon?: React.ElementType;
    text: string;
    variant?: "primary" | "accent" | "success" | "warning";
  };
  title: ReactNode;
  description?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  gradientTitle?: boolean;
}

const badgeVariantClasses = {
  primary: "border-primary/20 bg-primary-soft/60 text-primary",
  accent: "border-accent/20 bg-accent-soft/60 text-accent",
  success: "border-success/20 bg-success-soft/60 text-success",
  warning: "border-warning/20 bg-warning-soft/60 text-warning-foreground",
};

/**
 * Standardized PageHeader component for consistent page titles,
 * subtitle typography, badge pills, and right-aligned actions.
 */
export function PageHeader({
  badge,
  title,
  description,
  subtitle,
  actions,
  className = "",
  gradientTitle = false,
}: PageHeaderProps) {
  const BadgeIcon = badge?.icon;
  const variant = badge?.variant || "primary";
  const effectiveDescription = description ?? subtitle;

  return (
    <ScrollReveal>
      <div
        className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 ${className}`}
      >
        <div className="space-y-1.5 max-w-3xl">
          {badge && (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md mb-2 ${
                badgeVariantClasses[variant]
              }`}
            >
              {BadgeIcon && <BadgeIcon className="size-3.5" />}
              <span>{badge.text}</span>
            </div>
          )}

          <h1
            className={`font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl ${
              gradientTitle ? "bridge-gradient-text" : ""
            }`}
          >
            {title}
          </h1>

          {effectiveDescription && (
            <div className="text-sm text-muted-foreground leading-relaxed">
              {effectiveDescription}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}
