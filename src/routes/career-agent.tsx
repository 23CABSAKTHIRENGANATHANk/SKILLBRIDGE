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

// @ts-ignore – route will be added to routeTree after generation
export const Route = createFileRoute("/career-agent")({
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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a14] via-[#0d0d1a] to-[#090912]">
      <SiteHeader />

      {/* Hero */}
      <div className="relative border-b border-white/5 bg-gradient-to-b from-violet-950/20 to-transparent">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
              <Bot className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white">AI Career Agent</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-medium">
                  SkillBridge 3.0
                </span>
              </div>
              <p className="text-slate-400 text-sm max-w-xl">
                Analyzes your verified skills, current market demand, and real job data to help
                you understand where you stand and exactly what to do next.
              </p>
            </div>
          </div>

          {/* Capability pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              { icon: Brain, label: "Skill Gap Analysis", color: "text-violet-400" },
              { icon: Target, label: "Role Readiness Score", color: "text-sky-400" },
              { icon: TrendingUp, label: "Learning Path", color: "text-emerald-400" },
              { icon: ShieldCheck, label: "Based on Verified Data", color: "text-amber-400" },
              { icon: Sparkles, label: "Powered by Gemini", color: "text-pink-400" },
            ].map(({ icon: Icon, label, color }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-slate-300"
              >
                <Icon className={`w-3 h-3 ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {!hasSkills ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Loader2 className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Complete your profile first</h2>
            <p className="text-sm text-slate-400 max-w-sm">
              The Career Agent works with your real skill data. Add at least one skill to your
              profile to get started.
            </p>
            <Link
              to="/dashboard"
              className="mt-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <AICareerCopilot hasResume={hasResume} hasSkills={hasSkills} />
        )}
      </div>
    </div>
  );
}
