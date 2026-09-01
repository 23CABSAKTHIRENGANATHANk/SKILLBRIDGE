import React from "react";
import {
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * SkillBridge Reusable State Views
 * Consistent Loading, Empty, Error, and Skeleton states matching semantic tokens.
 */

interface LoadingStateProps {
  message?: string;
  subtext?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingState({
  message = "Loading data...",
  subtext = "Fetching verified records from SkillBridge secure API",
  size = "md",
  className = "",
}: LoadingStateProps) {
  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-border/80 bg-card/60 shadow-soft backdrop-blur-sm ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
        <div className="relative flex items-center justify-center rounded-2xl bg-primary/10 p-3 text-primary">
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        </div>
      </div>
      <h3 className="font-semibold text-foreground text-sm font-heading">{message}</h3>
      {subtext && <p className="mt-1 text-xs text-muted-foreground max-w-sm">{subtext}</p>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Unable to load data from the server. Please check your network or try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-destructive/20 bg-destructive/5 shadow-soft ${className}`}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="font-bold text-foreground text-sm font-heading">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 gap-1.5 rounded-xl border-destructive/30 hover:bg-destructive/10 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title = "No records found",
  message = "There is currently no data to display for the selected criteria.",
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-border/80 bg-card/50 shadow-soft ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-bold text-foreground text-sm font-heading">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">{message}</p>
      {actionLabel && onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="mt-4 gap-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

interface SkeletonLoaderProps {
  count?: number;
  type?: "card" | "row" | "stat";
  className?: string;
}

export function SkeletonLoader({
  count = 3,
  type = "card",
  className = "",
}: SkeletonLoaderProps) {
  const items = Array.from({ length: count });

  if (type === "stat") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (type === "row") {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {items.map((_, i) => (
        <div key={i} className="h-48 rounded-3xl bg-muted/60 animate-pulse" />
      ))}
    </div>
  );
}
