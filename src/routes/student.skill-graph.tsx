import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { InteractiveSkillGraphView } from "@/components/career/interactive-skill-graph-view";
import { ApiClient } from "@/lib/api-client";
import { Network } from "lucide-react";
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
      <PageContainer size="default" className="space-y-6">
        <PageHeader
          badge={{
            icon: Network,
            text: "Knowledge Graph Engine",
            variant: "accent",
          }}
          title="Topological Prerequisite Skill Graph"
          description={
            <span>
              Directed acyclic prerequisite graph mapping core foundation skills to advanced engineering topics for{" "}
              <strong className="text-foreground">{goal?.target_role || "your target role"}</strong>.
            </span>
          }
        />

        <InteractiveSkillGraphView targetRole={goal?.target_role} />
      </PageContainer>
      <BottomNav />
    </div>
  );
}
