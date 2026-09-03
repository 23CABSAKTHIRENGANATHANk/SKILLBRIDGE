import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CareerCoachView } from "@/components/career/career-coach-view";
import { ApiClient } from "@/lib/api-client";
import type { CareerGoal } from "@/types/skillbridge";

export const Route = createFileRoute("/student/career-coach")({
  head: () => ({
    meta: [
      { title: "AI Career Coach — SkillBridge 3.0" },
      {
        name: "description",
        content:
          "Conversational career guidance grounded in your live verified competencies, target goals, and industry prerequisites.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRole="student">
      <StudentCareerCoachPage />
    </ProtectedRoute>
  ),
});

function StudentCareerCoachPage() {
  const [goal, setGoal] = useState<CareerGoal | null>(null);

  useEffect(() => {
    let active = true;
    ApiClient.getCareerGoal()
      .then((res) => {
        if (active) setGoal(res.goal);
      })
      .catch((err) => {
        console.error("Failed to load career goal for coach:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <CareerCoachView targetRole={goal?.target_role} />
      </main>
      <BottomNav />
    </div>
  );
}
