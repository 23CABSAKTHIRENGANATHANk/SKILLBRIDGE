import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  ArrowRight,
  GitBranch,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function SkillDependencyMap() {
  const [selectedSkill, setSelectedSkill] = useState<string>("React");

  const { data, isLoading } = useQuery({
    queryKey: ["skill-dependencies"],
    queryFn: () => ApiClient.getSkillDependencies(),
  });

  const dependencies = data?.dependencies || [];

  // Filter dependencies relevant to selected skill
  const prerequisites = dependencies
    .filter((d) => d.skill_name.toLowerCase() === selectedSkill.toLowerCase())
    .map((d) => d.prerequisite_name);

  const unlocks = dependencies
    .filter((d) => d.prerequisite_name.toLowerCase() === selectedSkill.toLowerCase())
    .map((d) => d.skill_name);

  const allSkills = Array.from(
    new Set([
      ...dependencies.map((d) => d.skill_name),
      ...dependencies.map((d) => d.prerequisite_name),
    ])
  );

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers className="size-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              Skill Knowledge Topology
            </h3>
            <p className="text-xs text-muted-foreground">
              Interactive prerequisite map showing what to learn before and what unlocks next.
            </p>
          </div>
        </div>

        {/* Skill Selector */}
        <select
          value={selectedSkill}
          onChange={(e) => setSelectedSkill(e.target.value)}
          className="h-9 px-3 rounded-xl border border-input bg-background text-xs font-bold"
        >
          {allSkills.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Column 1: Prerequisites */}
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              1. Prerequisites
            </span>
            {prerequisites.length > 0 ? (
              <div className="space-y-2">
                {prerequisites.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedSkill(p)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 text-left transition-all"
                  >
                    <span className="text-xs font-bold text-foreground">{p}</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                Fundamental skill — no strict prerequisite.
              </p>
            )}
          </div>

          {/* Column 2: Selected Skill Node */}
          <div className="p-5 rounded-2xl bg-primary/10 border-2 border-primary shadow-sm text-center space-y-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary text-primary-foreground">
              Selected Topic
            </span>
            <h4 className="font-display text-xl font-extrabold text-foreground">
              {selectedSkill}
            </h4>
            <div className="flex justify-center gap-2 pt-1">
              <Link to="/learning" search={{ skill: selectedSkill } as any}>
                <Button size="sm" variant="outline" className="text-xs font-bold h-7 rounded-lg">
                  <BookOpen className="size-3 mr-1" /> Resources
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="sm" className="text-xs font-bold h-7 rounded-lg">
                  <ShieldCheck className="size-3 mr-1" /> Verify
                </Button>
              </Link>
            </div>
          </div>

          {/* Column 3: Unlocks Next */}
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              3. Unlocks Next
            </span>
            {unlocks.length > 0 ? (
              <div className="space-y-2">
                {unlocks.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setSelectedSkill(u)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 text-left transition-all"
                  >
                    <span className="text-xs font-bold text-foreground">{u}</span>
                    <ArrowRight className="size-3 text-primary" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                Specialized terminal skill in this pathway.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
