import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  PlayCircle,
  ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { SkillGapAnalysis } from "@/types/skillbridge";

export function SkillGapCenterView({
  gaps,
  targetRole,
}: {
  gaps: SkillGapAnalysis;
  targetRole: string;
}) {
  const [activeTab, setActiveTab] = useState<"missing" | "needs_improvement" | "strong">("missing");

  const totalRequired =
    (gaps.strong?.length || 0) +
    (gaps.needs_improvement?.length || 0) +
    (gaps.missing?.length || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-black text-foreground">
            Skill Gap Center
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time competency analysis comparing your verified portfolio against required market skills for{" "}
            <span className="font-bold text-foreground">{targetRole}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/student/skill-graph">
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold">
              View Skill Graph
            </Button>
          </Link>
          <Link to="/student/skill-verification">
            <Button size="sm" className="rounded-xl text-xs font-bold">
              Verify Skills <ShieldCheck className="size-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Tabs */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setActiveTab("missing")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            activeTab === "missing"
              ? "border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20"
              : "border-border/80 bg-card hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Missing Skills
            </span>
            <AlertCircle className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{gaps.missing?.length || 0}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Zero recorded evidence</p>
        </button>

        <button
          onClick={() => setActiveTab("needs_improvement")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            activeTab === "needs_improvement"
              ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20"
              : "border-border/80 bg-card hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Needs Improvement
            </span>
            <TrendingUp className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">
            {gaps.needs_improvement?.length || 0}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Low or unverified confidence</p>
        </button>

        <button
          onClick={() => setActiveTab("strong")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            activeTab === "strong"
              ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
              : "border-border/80 bg-card hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Strong Verified
            </span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{gaps.strong?.length || 0}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">High technical proof</p>
        </button>
      </div>

      {/* Active Tab List */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h4 className="font-display text-base font-bold text-foreground capitalize">
            {activeTab.replace("_", " ")} Skills ({gaps[activeTab]?.length || 0})
          </h4>
          <span className="text-xs text-muted-foreground">
            {Math.round(((gaps.strong?.length || 0) / Math.max(totalRequired, 1)) * 100)}% Role Coverage
          </span>
        </div>

        {(!gaps[activeTab] || gaps[activeTab].length === 0) ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No skills in this category. Your skill profile is continuously updated as you learn and verify!
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {gaps[activeTab].map((item, idx) => {
              const conf = Math.round(item.confidence || 0);

              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/70 bg-background/70 p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-bold text-sm text-foreground">{item.skill}</h5>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                        {item.status || (activeTab === "strong" ? "verified" : "missing")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Evidence: {item.evidence_level || "None"}</span>
                      <span>Confidence: {conf}%</span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          activeTab === "strong"
                            ? "bg-emerald-500"
                            : activeTab === "needs_improvement"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.max(conf, 5)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center gap-2">
                    <Link to="/learning" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-xl text-xs font-semibold">
                        <BookOpen className="size-3 mr-1" /> Learn
                      </Button>
                    </Link>
                    <Link to={`/student/skill-verification`} className="flex-1">
                      <Button size="sm" className="w-full rounded-xl text-xs font-semibold">
                        <ShieldCheck className="size-3 mr-1" /> Verify
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
