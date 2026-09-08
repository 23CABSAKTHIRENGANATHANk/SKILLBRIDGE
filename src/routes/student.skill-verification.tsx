import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageContainer } from "@/components/layout/page-container";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SkillVerificationCenter } from "@/components/proof-of-skill/skill-verification-center";

export const Route = createFileRoute("/student/skill-verification")({
  head: () => ({
    meta: [
      { title: "Skill Verification Center — SkillBridge 3.0" },
      {
        name: "description",
        content:
          "Verified technical proof-of-skill, adaptive evaluation, multi-factor evidence breakdown, and anti-fraud integrity audits.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRole="student">
      <SkillVerificationPage />
    </ProtectedRoute>
  ),
});

function SkillVerificationPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <PageContainer size="default">
        <SkillVerificationCenter />
      </PageContainer>
      <BottomNav />
    </div>
  );
}
