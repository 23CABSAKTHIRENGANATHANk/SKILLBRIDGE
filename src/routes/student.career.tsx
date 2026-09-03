import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CareerEvolutionHub } from "@/components/career/career-evolution-hub";
import { CareerInsightsStrip } from "@/components/career/career-insights-strip";
import { ReadinessHistoryView } from "@/components/career/readiness-history-view";
import { ApiClient } from "@/lib/api-client";
import type { CareerDashboardAggregated } from "@/types/skillbridge";

export const Route = createFileRoute("/student/career")({
  head: () => ({
    meta: [
      { title: "Personal Career Operating System — SkillBridge 3.0" },
      {
        name: "description",
        content:
          "Your continuous personal career evolution engine: real-time readiness, skill graphs, verified gaps, next actions, and reachable jobs.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRole="student">
      <StudentCareerOSPage />
    </ProtectedRoute>
  ),
});

function StudentCareerOSPage() {
  const [dashboard, setDashboard] = useState<CareerDashboardAggregated | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    ApiClient.getCareerOS()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((err) => {
        console.error("Failed to load Personal Career OS dashboard:", err);
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Real-time Deterministic Insights Strip */}
        {dashboard?.insights && dashboard.insights.length > 0 && (
          <CareerInsightsStrip insights={dashboard.insights} />
        )}

        {/* Master Career Command Center & Flywheel */}
        <CareerEvolutionHub />

        {/* Career Readiness Progression History */}
        {dashboard?.goal?.target_role && (
          <ReadinessHistoryView targetRole={dashboard.goal.target_role} />
        )}
      </main>
      <BottomNav />
    </div>
  );
}
