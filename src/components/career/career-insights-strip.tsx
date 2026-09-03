import React from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  FolderGit2,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { CareerInsightItem } from "@/types/skillbridge";

export function CareerInsightsStrip({ insights }: { insights: CareerInsightItem[] }) {
  if (!insights || insights.length === 0) return null;

  const iconMap: Record<string, React.ReactNode> = {
    STRENGTH: <ShieldCheck className="size-4 text-emerald-500" />,
    GAP: <AlertTriangle className="size-4 text-rose-500" />,
    OPPORTUNITY: <FolderGit2 className="size-4 text-indigo-500" />,
    PROGRESS: <TrendingUp className="size-4 text-amber-500" />,
    REACHABILITY: <Briefcase className="size-4 text-blue-500" />,
  };

  const styleMap: Record<string, { border: string; bg: string; badgeBg: string; text: string }> = {
    STRENGTH: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5 dark:bg-emerald-950/20",
      badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    GAP: {
      border: "border-rose-500/30",
      bg: "bg-rose-500/5 dark:bg-rose-950/20",
      badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
    },
    OPPORTUNITY: {
      border: "border-indigo-500/30",
      bg: "bg-indigo-500/5 dark:bg-indigo-950/20",
      badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      text: "text-indigo-600 dark:text-indigo-400",
    },
    PROGRESS: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/5 dark:bg-amber-950/20",
      badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
    },
    REACHABILITY: {
      border: "border-blue-500/30",
      bg: "bg-blue-500/5 dark:bg-blue-950/20",
      badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
    },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="font-display text-base font-bold text-foreground">
            Deterministic Career Insights
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground">
          Evidence-backed • Live database calculation
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((item, idx) => {
          const defaultStyle = {
            border: "border-border",
            bg: "bg-card",
            badgeBg: "bg-muted text-muted-foreground border-border",
            text: "text-foreground",
          };
          const style = styleMap[item.type] ?? styleMap["REACHABILITY"] ?? defaultStyle;
          const icon = iconMap[item.type] ?? <Sparkles className="size-4 text-primary" />;

          return (
            <div
              key={idx}
              className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${style.border} ${style.bg}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {icon}
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${style.badgeBg}`}>
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">{item.metric}</span>
                </div>

                <h4 className="font-bold text-sm text-foreground leading-snug">
                  {item.title}
                </h4>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-border/40">
                <Link to={item.action_url}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-between px-0 text-xs font-bold ${style.text} hover:bg-transparent`}
                  >
                    <span>{item.action_label}</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
