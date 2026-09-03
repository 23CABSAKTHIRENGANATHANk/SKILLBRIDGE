import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Calendar,
  Flame,
  Award,
  BookOpen,
  FolderGit2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ApiClient } from "@/lib/api-client";
import type { KnowledgeEvolutionEvent } from "@/types/skillbridge";

export const Route = createFileRoute("/student/evolution")({
  head: () => ({
    meta: [
      { title: "Knowledge Evolution Timeline — SkillBridge 3.0" },
      {
        name: "description",
        content:
          "Audit ledger of your verified skills, completed projects, learning milestones, and career readiness progression.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRole="student">
      <StudentEvolutionPage />
    </ProtectedRoute>
  ),
});

function StudentEvolutionPage() {
  const [events, setEvents] = useState<KnowledgeEvolutionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    ApiClient.getEvolution()
      .then((res) => {
        if (active) setEvents(res.events || []);
      })
      .catch((err) => {
        console.error("Failed to load evolution events:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "skill_verified":
        return <ShieldCheck className="size-4 text-emerald-500" />;
      case "project_completed":
        return <FolderGit2 className="size-4 text-indigo-500" />;
      case "skill_learned":
        return <BookOpen className="size-4 text-blue-500" />;
      default:
        return <CheckCircle2 className="size-4 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h2 className="font-display text-3xl font-black text-foreground">
            Knowledge Evolution Ledger
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable chronological audit of all skill verifications, project completions, and career growth events.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-border/80 bg-card p-12 text-center shadow-soft animate-pulse h-96" />
        ) : events.length === 0 ? (
          <div className="rounded-3xl border border-border/80 bg-card p-12 text-center shadow-soft">
            <Activity className="mx-auto size-12 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-bold text-foreground">No Evolution Events Recorded</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete learning resources, build recommended projects, and verify skills to generate your ledger.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Verified Events: {events.length}
              </span>
              <span className="text-xs font-semibold text-primary flex items-center gap-1">
                <Flame className="size-4 text-amber-500" /> Active Career Streak
              </span>
            </div>

            <div className="space-y-4">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-4 rounded-2xl border border-border/70 bg-background/60 p-4 transition-colors hover:border-border"
                >
                  <div className="mt-0.5 rounded-full bg-muted/60 p-2 border border-border/60">
                    {getEventIcon(ev.event_type)}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {ev.event_type.replace("_", " ")}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(ev.created_at ?? ev.event_date ?? Date.now()).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground">
                      {ev.title || `Skill Event: ${ev.skill ?? "Technical Achievement"}`}
                    </h4>

                    {ev.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {ev.description}
                      </p>
                    )}

                    {ev.readiness_impact != null && (
                      <span className="inline-block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        Readiness Boost: +{ev.readiness_impact}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
