import { useEffect, useState } from "react";
import {
  Target,
  Sparkles,
  ArrowRight,
  Loader2,
  Bot,
  Map,
  BookOpen,
  Briefcase,
  Calendar,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { CareerCoachModal } from "./career-coach-modal";
import type { NextBestAction, CareerGoal } from "@/types/skillbridge";

export function CareerEvolutionCard() {
  const [goal, setGoal] = useState<CareerGoal | null>(null);
  const [action, setAction] = useState<NextBestAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      ApiClient.getCareerGoal(),
      ApiClient.getNextCareerAction(),
    ]).then(([gRes, aRes]) => {
      if (!active) return;
      if (gRes.status === "fulfilled" && gRes.value.goal) {
        setGoal(gRes.value.goal);
      }
      if (aRes.status === "fulfilled" && aRes.value.action) {
        setAction(aRes.value.action);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft animate-pulse h-48" />
    );
  }

  return (
    <>
      <section
        className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-background p-6 sm:p-8 shadow-soft space-y-6 relative overflow-hidden"
        aria-labelledby="next-action-hero-title"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                WHAT SHOULD I DO NEXT?
              </span>
              <h2
                id="next-action-hero-title"
                className="font-display text-xl sm:text-2xl font-black text-foreground"
              >
                Highest-Impact Career Action
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCoachOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
            >
              <Bot className="size-3.5" />
              <span>Ask Career Coach</span>
            </Button>
            <Link to="/career-goal">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <Target className="size-3.5 mr-1" />
                <span>{goal?.target_role || "Set Destination"}</span>
              </Button>
            </Link>
          </div>
        </div>

        {action ? (
          <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold uppercase tracking-wider border border-primary/20">
                <CheckCircle2 className="size-3" />
                {action.badge || "RECOMMENDED"}
              </span>
              {action.impact && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {action.impact}
                </span>
              )}
            </div>

            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">
                {action.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                {action.reason}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link to={action.cta_url as any}>
                <Button className="rounded-xl font-bold text-xs px-5 shadow-sm">
                  {action.cta_label || "Take Action Now"}
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              </Link>
              <Link to="/career-roadmap">
                <Button variant="outline" className="rounded-xl font-semibold text-xs">
                  View Full Roadmap
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Define your career goal to unlock your customized Next Best Action.
            </p>
            <Link to="/career-goal">
              <Button size="sm" className="rounded-full text-xs font-bold mt-2">
                Choose Target Role <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Quick Hub Navigation Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-border/50">
          <Link
            to="/career-roadmap"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-background/80 hover:bg-secondary/80 border border-border/70 text-xs font-bold text-foreground transition-colors"
          >
            <Map className="size-4 text-primary shrink-0" />
            <span className="truncate">Roadmap</span>
          </Link>
          <Link
            to="/learning"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-background/80 hover:bg-secondary/80 border border-border/70 text-xs font-bold text-foreground transition-colors"
          >
            <BookOpen className="size-4 text-primary shrink-0" />
            <span className="truncate">Learning</span>
          </Link>
          <Link
            to="/career-opportunities"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-background/80 hover:bg-secondary/80 border border-border/70 text-xs font-bold text-foreground transition-colors"
          >
            <Briefcase className="size-4 text-primary shrink-0" />
            <span className="truncate">Reach Jobs</span>
          </Link>
          <Link
            to="/career-plan"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-background/80 hover:bg-secondary/80 border border-border/70 text-xs font-bold text-foreground transition-colors"
          >
            <Calendar className="size-4 text-primary shrink-0" />
            <span className="truncate">Weekly Plan</span>
          </Link>
          <Link
            to="/career-simulator"
            className="col-span-2 sm:col-span-1 flex items-center gap-2 p-2.5 rounded-xl bg-background/80 hover:bg-secondary/80 border border-border/70 text-xs font-bold text-foreground transition-colors"
          >
            <Compass className="size-4 text-primary shrink-0" />
            <span className="truncate">Simulator</span>
          </Link>
        </div>
      </section>

      {/* AI Career Coach Dialog */}
      <CareerCoachModal
        open={isCoachOpen}
        onOpenChange={setIsCoachOpen}
        targetRole={goal?.target_role || "Software Developer"}
      />
    </>
  );
}
