import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  ArrowLeft,
  Brain,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Target,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AICareerCopilot } from "@/components/ai/ai-career-copilot";
import { ApiClient } from "@/lib/api-client";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/career-agent")({
  head: () => ({
    meta: [
      { title: "AI Career Agent — SkillBridge 3.0" },
      {
        name: "description",
        content:
          "Conversational career guidance and empirical role readiness analysis powered by Google Gemini 3.7.",
      },
    ],
  }),
  component: CareerAgentPage,
});

function CareerAgentPage() {
  return (
    <ProtectedRoute requiredRole="student">
      <CareerAgentContent />
    </ProtectedRoute>
  );
}

function CareerAgentContent() {
  const { user } = useAuth();

  const { data: profileData } = useQuery({
    queryKey: ["student-profile"],
    queryFn: () => ApiClient.getStudentProfile(),
    enabled: !!user,
  });

  const hasResume = !!(profileData as any)?.student?.resume_storage_key;
  const hasSkills =
    Array.isArray((profileData as any)?.student?.skills) &&
    (profileData as any).student.skills.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      {/* Hero Header */}
      <div className="border-b border-border/80 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Bot className="size-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground">
                  AI Career Agent
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-bold">
                  SkillBridge 3.0
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                Analyzes your verified skills, current market demand, and real job data to help
                you understand where you stand and exactly what to do next.
              </p>
            </div>
          </div>

          {/* Capability pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              { icon: Brain, label: "Skill Gap Analysis", color: "text-primary" },
              { icon: Target, label: "Role Readiness Score", color: "text-accent" },
              { icon: TrendingUp, label: "Learning Path", color: "text-success" },
              { icon: ShieldCheck, label: "Based on Verified Data", color: "text-warning-foreground" },
              { icon: Sparkles, label: "Powered by Gemini 3.7", color: "text-primary" },
            ].map(({ icon: Icon, label, color }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-card/80 text-xs font-medium text-foreground shadow-sm"
              >
                <Icon className={`size-3.5 ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <PageContainer size="narrow">
        {!hasSkills ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center rounded-3xl border border-dashed border-border p-8 bg-card/50">
            <div className="p-4 rounded-2xl bg-warning-soft/30 border border-warning/20 text-warning-foreground">
              <Loader2 className="size-8 animate-spin" />
            </div>
            <h2 className="text-base font-bold text-foreground">Complete your profile first</h2>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              The Career Agent works with your real skill data. Add at least one skill to your
              profile or sync your resume to get started.
            </p>
            <Link to="/dashboard">
              <Button className="rounded-xl text-xs font-bold mt-2">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <AICareerCopilot hasResume={hasResume} hasSkills={hasSkills} />
        )}
      </PageContainer>
      <BottomNav />
    </div>
  );
}
