import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Award,
  Calendar,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import type { ReadinessSnapshot } from "@/types/skillbridge";

export function ReadinessHistoryView({ targetRole }: { targetRole?: string | undefined }) {
  const [history, setHistory] = useState<ReadinessSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    ApiClient.getReadinessHistory(targetRole)
      .then((res) => {
        if (active) setHistory(res.history || []);
      })
      .catch((err) => {
        console.error("Failed to fetch readiness history:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [targetRole]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft animate-pulse h-48" />
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-6 text-center shadow-soft">
        <TrendingUp className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">
          Your career readiness progression will be recorded automatically as you verify skills and build projects.
        </p>
      </div>
    );
  }

  const latestScore = history[history.length - 1]?.readiness_score || 0;
  const initialScore = history[0]?.readiness_score || 0;
  const totalGrowth = latestScore - initialScore;

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              Career Readiness Evolution History
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable timeline of verified technical progression for {targetRole || "target role"}.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <ArrowUpRight className="size-4" />
          <span>+{totalGrowth >= 0 ? totalGrowth : 0}% Verified Growth</span>
        </div>
      </div>

      {/* Snapshot Bar Timeline */}
      <div className="space-y-4">
        <div className="flex items-end gap-2 h-36 pt-4 px-2 border-b border-border/60 overflow-x-auto">
          {history.map((snap, idx) => {
            const heightPct = Math.max(Math.min(snap.readiness_score, 100), 8);
            const isLatest = idx === history.length - 1;

            return (
              <div key={snap.id} className="flex-1 min-w-[48px] flex flex-col items-center gap-1.5 h-full justify-end group">
                <span className="text-[10px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {snap.readiness_score}%
                </span>
                <div
                  className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 ${
                    isLatest
                      ? "bg-primary shadow-md shadow-primary/20"
                      : "bg-primary/30 hover:bg-primary/50"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[9px] font-semibold text-muted-foreground whitespace-nowrap">
                  {new Date(snap.snapshot_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            );
          })}
        </div>

        {/* Snapshot Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {history.slice(-3).reverse().map((snap) => (
            <div
              key={snap.id}
              className="rounded-2xl border border-border/70 bg-background/60 p-3.5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" /> {new Date(snap.snapshot_date).toLocaleDateString()}
                </span>
                <span className="text-xs font-bold text-primary">{snap.readiness_score}%</span>
              </div>
              <p className="text-xs font-bold text-foreground">Tier: {snap.readiness_tier}</p>
              <p className="text-[11px] text-muted-foreground">
                Snapshot recorded during verified milestone achievement.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
