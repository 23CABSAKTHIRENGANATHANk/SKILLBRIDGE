import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CursorDot } from "@/components/cursor-dot";
import { JobCard, JobCardSkeleton } from "@/components/job-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SkillMatchPanel } from "@/components/match-ring";
import { OpportunityModal } from "@/components/opportunity-modal";
import { Button } from "@/components/ui/button";
import { useJobsQuery } from "@/hooks/use-api";
import { BridgeLine } from "@/components/brand/logo";
import { ErrorState } from "@/components/ui/state-views";
import type { Job } from "@/types/skillbridge";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Explore Jobs — SkillBridge" },
      {
        name: "description",
        content:
          "Browse verified job opportunities matched to your skills. Filter by role, location, type, and skill requirements.",
      },
    ],
  }),
  component: JobsPage,
});

const skillFilters = [
  "All",
  "React",
  "TypeScript",
  "Python",
  "PHP",
  "Java",
  "MySQL",
  "AI",
  "Cloud",
  "CSS",
];
const typeFilters = ["All Types", "Full Time", "Internship", "Part Time", "Contract"];

function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("All");
  const [selectedType, setSelectedType] = useState("All Types");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Live API hook connected to the PHP backend.
  const { jobs: apiJobs, loading, error } = useJobsQuery({
    search: searchQuery,
    skill: selectedSkill,
    type: selectedType,
  });

  const filteredJobs = useMemo(() => {
    return apiJobs.filter((job) => {
      const matchesSearch =
        !searchQuery ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSkill = selectedSkill === "All" || job.skills.includes(selectedSkill);
      const matchesType = selectedType === "All Types" || job.type === selectedType;

      return matchesSearch && matchesSkill && matchesType;
    });
  }, [apiJobs, searchQuery, selectedSkill, selectedType]);

  // Show the best-matching job's skill panel
  const topMatch = filteredJobs.find((j) => j.match && j.match.score >= 85) || filteredJobs[0];

  return (
    <div className="min-h-screen">
      <CursorDot />
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">Explore</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Job <span className="bridge-gradient-text">Opportunities</span>
              </h1>
              <p className="mt-2 text-muted-foreground">
                {loading
                  ? "Searching opportunities..."
                  : `${filteredJobs.length} ${filteredJobs.length === 1 ? "opportunity" : "opportunities"} available`}
              </p>
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
                placeholder="Search by role, company, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={`w-full rounded-2xl border bg-card py-4 pl-12 pr-12 text-sm shadow-soft transition-all duration-250 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  searchFocused ? "border-primary/50 shadow-lift" : "border-border"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal delay={150}>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />

            {/* Skill filters */}
            <div className="flex flex-wrap gap-1.5">
              {skillFilters.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setSelectedSkill(skill)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    selectedSkill === skill
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>

            <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />

            {/* Type filters */}
            <div className="flex flex-wrap gap-1.5">
              {typeFilters.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    selectedType === type
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Top match panel */}
        {topMatch?.match && (
          <ScrollReveal delay={200} className="mt-8">
            <SkillMatchPanel match={topMatch.match} onImprove={() => setSelectedJob(topMatch)} />
          </ScrollReveal>
        )}

        {/* Job grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {loading ? (
            <>
              <JobCardSkeleton />
              <JobCardSkeleton />
            </>
          ) : (
            filteredJobs.map((job, i) => (
              <ScrollReveal key={job.id} delay={i * 80} direction="up">
                <JobCard job={job} onSelect={(j) => setSelectedJob(j)} />
              </ScrollReveal>
            ))
          )}
        </div>

        {error && !loading && (
          <ErrorState className="mt-16" message={error} />
        )}

        {/* Empty state */}
        {!loading && !error && filteredJobs.length === 0 && (
          <ScrollReveal>
            <div className="mt-16 flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft text-primary">
                <Search className="size-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">No opportunities found</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Try adjusting your search or filter criteria to discover more matches.
              </p>
              <BridgeLine className="mt-6 max-w-[200px] text-primary/40" />
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSkill("All");
                  setSelectedType("All Types");
                }}
              >
                Clear all filters
              </Button>
            </div>
          </ScrollReveal>
        )}

        {/* Opportunity Detail & Apply Modal */}
        <OpportunityModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      </main>

      <BottomNav />
    </div>
  );
}
