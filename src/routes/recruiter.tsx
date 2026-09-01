import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CursorDot } from "@/components/cursor-dot";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import { Button } from "@/components/ui/button";
import { useCandidatesQuery } from "@/hooks/use-api";
import { BridgeLine } from "@/components/brand/logo";

export const Route = createFileRoute("/recruiter")({
  head: () => ({
    meta: [
      { title: "Recruiter Dashboard — SkillBridge" },
      {
        name: "description",
        content:
          "Find and manage top talent with transparent skill matching. Review candidates, track applications, and hire smarter.",
      },
    ],
  }),
  component: RecruiterPage,
});

const stageFilters = ["All", "Applied", "Shortlisted", "Interview", "Offer"] as const;

function RecruiterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("All");
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Live API hook connected to PHP Backend
  const { candidates, loading } = useCandidatesQuery({
    stage: selectedStage,
    search: searchQuery,
  });

  const handleStageUpdate = async (appId: string, nextStage: string, candidateName: string) => {
    try {
      const token = localStorage.getItem("sb_auth_token") || "";
      const res = await fetch("http://localhost:8000/api/applications/stage", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ application_id: appId, stage: nextStage }),
      });
      if (res.ok) {
        setStatusMessage(`Updated ${candidateName} to ${nextStage.toUpperCase()} stage.`);
        setTimeout(() => setStatusMessage(null), 3500);
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen">
      <CursorDot />
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        {/* Status Toast Message */}
        {statusMessage && (
          <div
            className="mb-6 flex items-center gap-2 rounded-2xl border border-success/40 bg-success-soft px-4 py-3 text-sm font-semibold text-success shadow-soft"
            style={{ animation: "sb-slide-down 300ms ease-out both" }}
          >
            <CheckCircle2 className="size-4" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Header */}
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">Recruiter</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Talent <span className="bridge-gradient-text">Pipeline</span>
              </h1>
              <p className="mt-2 text-muted-foreground">
                Review skill-matched candidates for your open positions.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-3 shadow-soft">
              <Users className="size-5 text-primary" aria-hidden="true" />
              <div>
                <p className="font-display text-2xl font-extrabold leading-none">
                  <AnimatedCounter value={candidates.length} />
                </p>
                <p className="text-xs font-medium text-muted-foreground">Total Applicants</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Search */}
        <ScrollReveal delay={100}>
          <div className="mt-8">
            <div
              className={`relative transition-all duration-250 ${
                searchFocused ? "scale-[1.01]" : ""
              }`}
            >
              <Search
                className={`absolute left-4 top-1/2 size-5 -translate-y-1/2 transition-all duration-200 ${
                  searchFocused ? "text-primary scale-110" : "text-muted-foreground"
                }`}
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search by name, skill, or college..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={`w-full rounded-2xl border bg-card py-4 pl-12 pr-4 text-sm shadow-soft transition-all duration-250 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  searchFocused ? "border-primary/50 shadow-lift" : "border-border"
                }`}
              />
            </div>
          </div>
        </ScrollReveal>

        {/* Stage filters */}
        <ScrollReveal delay={150}>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
            {stageFilters.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setSelectedStage(stage)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  selectedStage === stage
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Candidate grid with stage actions */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {candidates.map((candidate, i) => (
            <ScrollReveal key={candidate.id} delay={i * 100} direction="up">
              <article className="group card-lift relative overflow-hidden rounded-3xl border bg-card p-6 shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft font-display text-lg font-bold text-primary">
                      {candidate.name.charAt(0)}
                    </span>
                    <div>
                      <h3 className="font-display text-base font-bold">{candidate.name}</h3>
                      <p className="text-xs text-muted-foreground">{candidate.college}</p>
                    </div>
                  </div>

                  {candidate.match && (
                    <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                      {candidate.match.score}% match
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>Program: <strong className="text-foreground">{candidate.program}</strong></span>
                  <span>•</span>
                  <span>Experience: <strong className="text-foreground">{candidate.experience}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {candidate.appliedAt}
                  </span>
                </div>

                {/* Candidate skills */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {candidate.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Pipeline Stage Transitions */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">Current Status:</span>
                    <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-bold uppercase tracking-wider text-accent text-[11px]">
                      {candidate.stage}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {candidate.stage === "applied" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStageUpdate(candidate.appId, "shortlisted", candidate.name)}
                        className="text-xs rounded-full"
                      >
                        Shortlist <ChevronRight className="size-3 ml-1" />
                      </Button>
                    )}
                    {candidate.stage === "shortlisted" && (
                      <Button
                        size="sm"
                        className="text-xs rounded-full"
                        onClick={() => handleStageUpdate(candidate.appId, "interview", candidate.name)}
                      >
                        <Calendar className="size-3 mr-1" /> Schedule Interview
                      </Button>
                    )}
                    {candidate.stage === "interview" && (
                      <Button
                        size="sm"
                        className="text-xs rounded-full bg-success text-success-foreground hover:bg-success/90"
                        onClick={() => handleStageUpdate(candidate.appId, "offer", candidate.name)}
                      >
                        Make Offer
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>

        {/* Empty state */}
        {!loading && candidates.length === 0 && (
          <ScrollReveal>
            <div className="mt-16 flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft text-primary">
                <Users className="size-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">No candidates found</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Try adjusting your filters to see more applicants.
              </p>
              <BridgeLine className="mt-6 max-w-[200px] text-primary/40" />
            </div>
          </ScrollReveal>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
