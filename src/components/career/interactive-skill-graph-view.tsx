import React, { useEffect, useState, useMemo } from "react";
import {
  Network,
  CheckCircle2,
  Lock,
  PlayCircle,
  AlertCircle,
  ArrowRight,
  Filter,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Search,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { InteractiveSkillGraphData, SkillGraphNode } from "@/types/skillbridge";

export function InteractiveSkillGraphView({ targetRole }: { targetRole?: string | undefined }) {
  const [graphData, setGraphData] = useState<InteractiveSkillGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<SkillGraphNode | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ApiClient.getSkillGraph(targetRole)
      .then((data) => {
        if (active) {
          setGraphData(data);
          const firstNode = data.nodes[0];
          if (firstNode) setSelectedNode(firstNode);
        }
      })
      .catch((err) => {
        console.error("Failed to load skill graph:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [targetRole]);

  const filteredNodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.filter((node) => {
      const matchesStatus = filterStatus === "ALL" || node.status === filterStatus;
      const matchesSearch =
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.domain.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [graphData, filterStatus, searchQuery]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-12 text-center shadow-soft animate-pulse space-y-4">
        <Network className="mx-auto size-12 text-primary animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">
          Computing topological prerequisite skill graph...
        </p>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-8 text-center shadow-soft">
        <Network className="mx-auto size-12 text-muted-foreground" />
        <h3 className="mt-3 text-lg font-bold text-foreground">No Skill Graph Defined</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Set your career goal to generate an automated prerequisite dependency map.
        </p>
        <Link to="/career-goal" className="mt-4 inline-block">
          <Button className="rounded-full">Set Career Goal</Button>
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    VERIFIED: {
      bg: "bg-emerald-500/10 dark:bg-emerald-950/40",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/30",
      icon: <CheckCircle2 className="size-4 text-emerald-500" />,
    },
    IN_PROGRESS: {
      bg: "bg-amber-500/10 dark:bg-amber-950/40",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/30",
      icon: <PlayCircle className="size-4 text-amber-500" />,
    },
    AVAILABLE: {
      bg: "bg-blue-500/10 dark:bg-blue-950/40",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-500/30",
      icon: <Sparkles className="size-4 text-blue-500" />,
    },
    LOCKED: {
      bg: "bg-muted/40",
      text: "text-muted-foreground",
      border: "border-border/60",
      icon: <Lock className="size-4 text-muted-foreground" />,
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Skills</p>
          <p className="mt-1 text-2xl font-black text-foreground">{graphData.total_nodes}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Verified</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{graphData.verified_count}</p>
        </div>
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Unlocked / Ready</p>
          <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{graphData.unlocked_count}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prereq Edges</p>
          <p className="mt-1 text-2xl font-black text-foreground">{graphData.total_edges}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["ALL", "VERIFIED", "AVAILABLE", "IN_PROGRESS", "LOCKED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                filterStatus === status
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search skills or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-background py-1.5 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Interactive Grid & Detail Panel */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Graph Nodes Grid */}
        <div className="lg:col-span-8 grid gap-3 sm:grid-cols-2">
          {filteredNodes.map((node) => {
            const conf = Math.round(node.confidence);
            const defaultStatusStyle = {
              bg: "bg-muted/40",
              text: "text-muted-foreground",
              border: "border-border/60",
              icon: <Lock className="size-4 text-muted-foreground" />,
            };
            const style = statusColors[node.status] ?? statusColors["LOCKED"] ?? defaultStatusStyle;
            const isSelected = selectedNode?.name === node.name;

            return (
              <div
                key={node.name}
                onClick={() => setSelectedNode(node)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md"
                    : `${style.border} ${style.bg} hover:border-border hover:shadow-sm`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {style.icon}
                    <h4 className="font-bold text-sm text-foreground">{node.name}</h4>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${style.border} ${style.text}`}>
                    {node.status}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{node.domain}</span>
                  <span>{node.difficulty}</span>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-semibold text-muted-foreground mb-1">
                    <span>Confidence</span>
                    <span>{conf}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        conf >= 70
                          ? "bg-emerald-500"
                          : conf >= 25
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.max(conf, 5)}%` }}
                    />
                  </div>
                </div>

                {/* Prerequisites tags */}
                {node.prerequisites.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/40 flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                    <span className="font-semibold">Prereqs:</span>
                    {node.prerequisites.map((p) => (
                      <span key={p} className="rounded-md bg-background px-1.5 py-0.5 border border-border/60 text-[10px]">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Node Detail Side Inspector */}
        <div className="lg:col-span-4 space-y-4">
          {selectedNode ? (
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-5 sticky top-20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Skill Inspector
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusColors[selectedNode.status]?.border ?? "border-border"} ${statusColors[selectedNode.status]?.text ?? "text-foreground"}`}>
                  {selectedNode.status}
                </span>
              </div>

              <div>
                <h3 className="font-display text-xl font-black text-foreground">
                  {selectedNode.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Domain: <span className="font-semibold text-foreground">{selectedNode.domain}</span> • Difficulty:{" "}
                  <span className="font-semibold text-foreground">{selectedNode.difficulty}</span>
                </p>
              </div>

              <div className="rounded-2xl bg-muted/40 p-4 border border-border/60 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Verified Confidence:</span>
                  <span className="font-bold text-foreground">{Math.round(selectedNode.confidence)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Prerequisites:</span>
                  <span className="font-bold text-foreground">
                    {selectedNode.prerequisites_satisfied ? "Satisfied" : "Unfulfilled"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Requirement Gate:</span>
                  <span className="font-bold text-foreground">
                    {selectedNode.is_required ? "Core Requirement" : "Elective Skill"}
                  </span>
                </div>
              </div>

              {selectedNode.prerequisites.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Prerequisite Dependencies
                  </p>
                  <div className="space-y-1.5">
                    {selectedNode.prerequisites.map((prereq) => (
                      <div
                        key={prereq}
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2 text-xs"
                      >
                        <span className="font-medium">{prereq}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">Prerequisite</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {selectedNode.status === "VERIFIED" ? (
                  <Link to="/student/skill-verification">
                    <Button variant="outline" className="w-full rounded-xl text-xs font-bold border-emerald-500/40 text-emerald-600">
                      <ShieldCheck className="size-4 mr-1.5 text-emerald-500" /> View Verification Audit
                    </Button>
                  </Link>
                ) : selectedNode.status === "LOCKED" ? (
                  <Button disabled variant="outline" className="w-full rounded-xl text-xs font-bold">
                    <Lock className="size-4 mr-1.5" /> Unlock Prerequisites First
                  </Button>
                ) : (
                  <Link to="/learning">
                    <Button className="w-full rounded-xl text-xs font-bold">
                      Start Learning {selectedNode.name} <ArrowRight className="size-4 ml-1.5" />
                    </Button>
                  </Link>
                )}

                <Link to={`/student/skill-verification`}>
                  <Button variant="ghost" size="sm" className="w-full rounded-xl text-xs font-semibold text-muted-foreground">
                    Test Skill in Verification Center
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Select a skill from the graph to inspect prerequisites and verification options.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
