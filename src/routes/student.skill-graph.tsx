import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { InteractiveSkillGraphView } from "@/components/career/interactive-skill-graph-view";
import { ApiClient } from "@/lib/api-client";
import type { CareerGoal } from "@/types/skillbridge";

export const Route = createFileRoute("/student/skill-graph")({
  head: () => ({
    meta: [
      { title: "Interactive Skill Graph — SkillBridge 3.0" },
      {
        name: "description",
        content:
          "Visual topological prerequisite dependency graph: inspect locked, available, in progress, and verified skills.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRole="student">
      <StudentSkillGraphPage />
    </ProtectedRoute>
  ),
});

function StudentSkillGraphPage() {
  const [goal, setGoal] = useState<CareerGoal | null>(null);

  useEffect(() => {
    let active = true;
    ApiClient.getCareerGoal()
      .then((res) => {
        if (active) setGoal(res.goal);
      })
      .catch((err) => {
        console.error("Failed to load career goal for graph:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h2 className="font-display text-3xl font-black text-foreground">
            Topological Prerequisite Skill Graph
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Directed acyclic prerequisite graph mapping core foundation skills to advanced engineering topics for{" "}
            <span className="font-bold text-foreground">{goal?.target_role || "your target role"}</span>.
          </p>
        </div>

        <InteractiveSkillGraphView targetRole={goal?.target_role} />
      </main>
      <BottomNav />
    </div>
  );
}
