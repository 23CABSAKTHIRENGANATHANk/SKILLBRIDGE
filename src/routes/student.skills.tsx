import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SkillGapCenterView } from "@/components/career/skill-gap-center-view";
import { ApiClient } from "@/lib/api-client";
import type { SkillGapAnalysis, CareerGoal } from "@/types/skillbridge";

export const Route = createFileRoute("/student/skills")({
  head: () => ({
    meta: [
      { title: "Skill Gap Center — SkillBridge 3.0" },
      {
        name: "description",
        content:
          "Audit and close your technical skill gaps with verified proof, DAG prerequisites, and guided learning.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRole="student">
      <StudentSkillsPage />
    </ProtectedRoute>
  ),
});

function StudentSkillsPage() {
  const [gaps, setGaps] = useState<SkillGapAnalysis | null>(null);
  const [goal, setGoal] = useState<CareerGoal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([ApiClient.getSkillGaps(), ApiClient.getCareerGoal()])
      .then(([gapData, goalData]) => {
        if (active) {
          setGaps(gapData);
          setGoal(goalData.goal);
        }
      })
      .catch((err) => {
        console.error("Failed to load skill gaps:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="rounded-3xl border border-border/80 bg-card p-12 text-center shadow-soft animate-pulse h-96" />
        ) : gaps ? (
          <SkillGapCenterView gaps={gaps} targetRole={goal?.target_role || "Target Role"} />
        ) : (
          <div className="rounded-3xl border border-border/80 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Unable to calculate skill gaps. Please check your career goal.</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
