import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageContainer } from "@/components/layout/page-container";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { BuildProjectsView } from "@/components/career/build-projects-view";

export const Route = createFileRoute("/student/projects")({
  head: () => ({
    meta: [
      { title: "Build This Next — SkillBridge 3.0" },
      {
        name: "description",
        content:
          "Production-grade capstone project blueprints closing your target skill gaps with verifiable code evidence.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRole="student">
      <StudentProjectsPage />
    </ProtectedRoute>
  ),
});

function StudentProjectsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <PageContainer size="default">
        <BuildProjectsView />
      </PageContainer>
      <BottomNav />
    </div>
  );
}
