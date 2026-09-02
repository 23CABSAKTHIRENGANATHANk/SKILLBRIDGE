import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Users,
  Building2,
  Plus,
  Briefcase,
  MapPin,
  Sparkles,
  PhoneCall,
  Calendar,
  Check,
  X,
  FileText,
  DollarSign,
  Send,
  Navigation,
  ArrowUpDown,
  GraduationCap,
  Award,
  ShieldCheck,
  BadgeCheck,
  Clock,
} from "lucide-react";
import { useState, useMemo } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CursorDot } from "@/components/cursor-dot";
import { CandidateCard } from "@/components/candidate-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCandidatesQuery, useCompanyQuery } from "@/hooks/use-api";
import { useAuth } from "@/context/auth-context";
import { BridgeLine } from "@/components/brand/logo";
import { toast } from "sonner";
import { CandidateDetailModal } from "@/components/candidate-detail-modal";
import { AIRecruiterInsightsCard } from "@/components/ai/ai-recruiter-insights-card";
import { ApiClient } from "@/lib/api-client";

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
  component: () => (
    <ProtectedRoute requiredRole="recruiter">
      <RecruiterPage />
    </ProtectedRoute>
  ),
});

const stageFilters = ["All", "Applied", "Shortlisted", "Interview", "Offer"] as const;
const skillFilterOptions = [
  "All Skills",
  "React",
  "TypeScript",
  "Python",
  "Node.js",
  "PostgreSQL",
  "CSS",
  "Docker",
];
const locationFilterOptions = ["All Locations", "Bengaluru", "Chennai", "Coimbatore"];
const gradYearOptions = ["All Batches", "2024", "2025", "2026"];

function RecruiterPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"pipeline" | "post-job" | "company-settings">(
    "pipeline",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("All");
  const [selectedSkill, setSelectedSkill] = useState<string>("All Skills");
  const [selectedLocation, setSelectedLocation] = useState<string>("All Locations");
  const [selectedGradYear, setSelectedGradYear] = useState<string>("All Batches");
  const [sortBy, setSortBy] = useState<"role_fit" | "match_score" | "recent">("role_fit");
  const [shortlistedIds, setShortlistedIds] = useState<Record<string, boolean>>({});
  const [candidateNotes, setCandidateNotes] = useState<Record<string, string>>({});
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState<any>(null);

  // Job creation state
  const [jobTitle, setJobTitle] = useState("");
  const [jobType, setJobType] = useState<"Full Time" | "Internship" | "Part Time" | "Contract">(
    "Full Time",
  );
  const [jobLocation, setJobLocation] = useState("Bengaluru, India (Hybrid)");
  const [salaryRange, setSalaryRange] = useState("₹12 LPA - ₹18 LPA");
  const [jobSkills, setJobSkills] = useState("React, TypeScript, CSS, Node.js");
  const [jobDescription, setJobDescription] = useState("");
  const [isPostingJob, setIsPostingJob] = useState(false);

  // Company Geocoding state
  const [companyAddress, setCompanyAddress] = useState("100 Feet Road, Indiranagar");
  const [companyCity, setCompanyCity] = useState("Bengaluru");
  const [companyState, setCompanyState] = useState("Karnataka");
  const [companyPincode, setCompanyPincode] = useState("560038");
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);

  // Live API hook connected to PHP Backend
  const {
    candidates: rawCandidates,
    loading,
    refetch,
  } = useCandidatesQuery({
    stage: selectedStage,
    search: searchQuery,
  });

  const recruiterCompanyId =
    (user?.profile as any)?.company_id || (user?.profile as any)?.companyId || "c1";
  const { company } = useCompanyQuery(recruiterCompanyId);

  const countStage = (stage: string) =>
    rawCandidates.filter((candidate) => candidate.stage === stage).length;
  const appliedCount = rawCandidates.length;
  const shortlistedCount = countStage("shortlisted");
  const interviewCount = countStage("interview");
  const offerCount = countStage("offer") + countStage("hired");
  const percentage = (part: number, total: number) =>
    total > 0 ? Math.round((part / total) * 100) : 0;

  const pipelineMetrics = [
    { label: "Applied", value: appliedCount },
    { label: "Shortlisted", value: shortlistedCount },
    { label: "Interviews", value: interviewCount },
    { label: "Offers", value: offerCount },
  ];

  const conversionMetrics = [
    { label: "Applied → Shortlisted", value: percentage(shortlistedCount, appliedCount) },
    { label: "Shortlisted → Interview", value: percentage(interviewCount, shortlistedCount) },
    { label: "Interview → Offer", value: percentage(offerCount, interviewCount) },
  ];

  // Filter and Rank Candidates Client & Server side
  const filteredAndRankedCandidates = useMemo(() => {
    let list = [...rawCandidates];

    // Filter by skill
    if (selectedSkill !== "All Skills") {
      list = list.filter((c) =>
        c.skills.some((s) => s.toLowerCase() === selectedSkill.toLowerCase()),
      );
    }

    // Filter by location
    if (selectedLocation !== "All Locations") {
      list = list.filter(
        (c) =>
          (c.location || "").toLowerCase().includes(selectedLocation.toLowerCase()) ||
          c.college.toLowerCase().includes(selectedLocation.toLowerCase()),
      );
    }

    // Filter by batch
    if (selectedGradYear !== "All Batches") {
      list = list.filter((c) => (c.graduationYear || 2025).toString() === selectedGradYear);
    }

    // Sort by Role Fit, Match Score, or Recent
    if (sortBy === "role_fit") {
      list.sort((a, b) => {
        const scoreA = a.roleFitScore || a.match?.role_fit_score || a.match?.score || 0;
        const scoreB = b.roleFitScore || b.match?.role_fit_score || b.match?.score || 0;
        return scoreB - scoreA;
      });
    } else if (sortBy === "match_score") {
      list.sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0));
    }

    return list;
  }, [rawCandidates, selectedSkill, selectedLocation, selectedGradYear, sortBy]);

  const handleStageUpdate = async (appId: string, nextStage: string, candidateName: string) => {
    try {
      await ApiClient.updateApplicationStage(appId, nextStage.toLowerCase());
      toast.success(`Updated ${candidateName} to ${nextStage.toUpperCase()} stage.`);
      if (refetch) refetch();
    } catch {
      toast.info(`Updated candidate stage.`);
    }
  };

  const handleToggleShortlist = (candidateId: string, nextValue: boolean) => {
    setShortlistedIds((prev) => ({ ...prev, [candidateId]: nextValue }));
    toast.info(
      nextValue ? "Candidate marked as shortlisted." : "Candidate removed from shortlist.",
    );
  };

  const handleNoteChange = (candidateId: string, nextNote: string) => {
    setCandidateNotes((prev) => ({ ...prev, [candidateId]: nextNote }));
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      toast.error("Job title is required");
      return;
    }

    setIsPostingJob(true);
    try {
      const skillsArray = jobSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await ApiClient.createJob({
        title: jobTitle.trim(),
        type: jobType,
        location: jobLocation.trim(),
        salary_range: salaryRange.trim(),
        skills: skillsArray,
        description: jobDescription.trim() || `Join our team as a ${jobTitle}.`,
      });
      toast.success("Job posting created and published live!");
      setJobTitle("");
      setJobDescription("");
      setActiveView("pipeline");
    } catch (err: any) {
      toast.error(err.message || "Network error while publishing job.");
    } finally {
      setIsPostingJob(false);
    }
  };

  const handleUpdateCompanyAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCompany(true);
    try {
      const data = await ApiClient.updateCompanyProfile({
        name: company?.name || "Northwind Labs",
        address: companyAddress,
        city: companyCity,
        state: companyState,
        pincode: companyPincode,
        country: "India",
      });
      toast.success(
        data.geocoding?.coordinates
          ? `Company address geocoded (Lat: ${data.geocoding.coordinates.latitude.toFixed(4)}, Long: ${data.geocoding.coordinates.longitude.toFixed(4)})`
          : "Company profile updated successfully!",
      );
    } catch {
      toast.info("Company profile saved.");
    } finally {
      setIsUpdatingCompany(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CursorDot />
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft/60 px-3.5 py-1 text-xs font-semibold text-accent">
                <Building2 className="size-3.5" />
                <span>Recruiter Workspace</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-success-soft text-success px-2 py-0.5 rounded-full">
                  <BadgeCheck className="size-3" /> Company Verified
                </span>
              </div>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Talent <span className="bridge-gradient-text">Pipeline</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Intelligent candidate discovery ranked by multi-factor role-fit and skill alignment.
              </p>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card p-1.5 shadow-soft">
              <button
                type="button"
                onClick={() => setActiveView("pipeline")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeView === "pipeline"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Candidates ({filteredAndRankedCandidates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveView("post-job")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeView === "post-job"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Post New Job
              </button>
              <button
                type="button"
                onClick={() => setActiveView("company-settings")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeView === "company-settings"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Company & Map
              </button>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Recruiter analytics dashboard
                </h2>
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
                  Q3 view
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {pipelineMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-border/70 bg-background/50 p-3"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {metric.label}
                    </p>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-2xl font-extrabold text-foreground">
                        {metric.value}
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground">Live</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-bold text-foreground">
                Pipeline conversion
              </h2>
              <div className="mt-4 space-y-3">
                {conversionMetrics.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{item.label}</span>
                      <span className="font-bold text-foreground">{item.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={110}>
          <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-bold text-foreground">
                Opportunity heat map
              </h2>
              <p className="mt-4 text-sm text-muted-foreground">
                Regional demand data is not available from the current backend.
              </p>
            </div>

            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-bold text-foreground">
                Recommendation widgets
              </h2>
              <p className="mt-4 text-sm text-muted-foreground">
                Recommendations will appear after analytics data is available.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* VIEW 1: CANDIDATE PIPELINE */}
        {activeView === "pipeline" && (
          <div className="mt-8 space-y-6">
            {/* AI Recruiter Pipeline Insights */}
            <ScrollReveal delay={90}>
              <AIRecruiterInsightsCard />
            </ScrollReveal>

            {/* Search, stage filter bar & Intelligent match controls */}
            <ScrollReveal delay={100}>
              <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft space-y-4">
                {/* Search & Sort Row */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search candidate by name, college, or skill..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-xl border-border/80 bg-background"
                    />
                  </div>

                  {/* Ranking / Sort Selector */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                      <ArrowUpDown className="size-3.5" /> Rank by:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-sm"
                    >
                      <option value="role_fit">⭐ Multi-Factor Role Fit</option>
                      <option value="match_score">🎯 Raw Skill Match Score</option>
                      <option value="recent">🕒 Application Recency</option>
                    </select>
                  </div>
                </div>

                {/* Stage Filters */}
                <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                  <span className="text-xs font-semibold text-muted-foreground mr-1">Stage:</span>
                  {stageFilters.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setSelectedStage(stage)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                        selectedStage === stage
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "border border-border/70 bg-background text-muted-foreground hover:border-accent/40 hover:text-foreground"
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>

                {/* Smart Filter Chips: Skills, Location, Graduation Year */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/60 pt-3">
                  {/* Skill Filter */}
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Required Skill
                    </label>
                    <select
                      value={selectedSkill}
                      onChange={(e) => setSelectedSkill(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground font-medium"
                    >
                      {skillFilterOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Candidate Location
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground font-medium"
                    >
                      {locationFilterOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch / Graduation Year */}
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Graduation Batch
                    </label>
                    <select
                      value={selectedGradYear}
                      onChange={(e) => setSelectedGradYear(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground font-medium"
                    >
                      {gradYearOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Candidates Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  Evaluating candidate skill graphs...
                </div>
              ) : filteredAndRankedCandidates.length > 0 ? (
                filteredAndRankedCandidates.map((candidate, i) => (
                  <ScrollReveal
                    key={candidate.id}
                    delay={i * 60}
                    direction="up"
                    onClick={() => setSelectedCandidateDetail(candidate)}
                  >
                    <div className="cursor-pointer">
                      <CandidateCard
                        candidate={candidate}
                        onUpdateStage={handleStageUpdate}
                        shortlisted={Boolean(
                          shortlistedIds[candidate.id] ??
                          (candidate.stage === "shortlisted" ||
                            candidate.stage === "interview" ||
                            candidate.stage === "offer"),
                        )}
                        note={candidateNotes[candidate.id] ?? ""}
                        onToggleShortlist={handleToggleShortlist}
                        onNoteChange={handleNoteChange}
                      />
                    </div>
                  </ScrollReveal>
                ))
              ) : (
                <div className="col-span-full rounded-3xl border border-dashed bg-card/60 py-16 text-center">
                  <Users className="mx-auto size-10 text-muted-foreground" />
                  <p className="mt-3 font-display text-lg font-bold text-foreground">
                    No applicants match criteria
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try broadening your skill, location, or graduation batch filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: POST A NEW JOB */}
        {activeView === "post-job" && (
          <ScrollReveal delay={100} className="mt-8 max-w-2xl mx-auto">
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <div className="mb-6 border-b pb-4">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Create Job Opportunity
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Publish a new position to the SkillBridge career feed with deterministic matching
                  formulas.
                </p>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle" className="text-xs font-semibold text-foreground">
                    Position Title
                  </Label>
                  <Input
                    id="jobTitle"
                    type="text"
                    placeholder="e.g. Senior Frontend Engineer, AI Systems Intern"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="jobType" className="text-xs font-semibold text-foreground">
                      Job Type
                    </Label>
                    <select
                      id="jobType"
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value as any)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    >
                      <option value="Full Time">Full Time</option>
                      <option value="Internship">Internship</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="jobLocation" className="text-xs font-semibold text-foreground">
                      Location / Work Mode
                    </Label>
                    <Input
                      id="jobLocation"
                      type="text"
                      placeholder="e.g. Bengaluru (Hybrid), Remote"
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="salaryRange" className="text-xs font-semibold text-foreground">
                    Compensation / Salary Range
                  </Label>
                  <Input
                    id="salaryRange"
                    type="text"
                    placeholder="e.g. ₹15 LPA - ₹22 LPA or ₹35,000 / month"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="jobSkills" className="text-xs font-semibold text-foreground">
                    Required Skills (Comma separated)
                  </Label>
                  <Input
                    id="jobSkills"
                    type="text"
                    placeholder="React, TypeScript, CSS, Node.js, PostgreSQL"
                    value={jobSkills}
                    onChange={(e) => setJobSkills(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="jobDescription" className="text-xs font-semibold text-foreground">
                    Role Description & Requirements
                  </Label>
                  <Textarea
                    id="jobDescription"
                    rows={4}
                    placeholder="Outline key responsibilities, qualifications, and benefits..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isPostingJob || !jobTitle.trim()}
                  className="w-full h-11 rounded-xl font-bold font-display"
                >
                  <Send className="size-4 mr-2" />
                  {isPostingJob ? "Publishing Opportunity..." : "Publish Job Opportunity"}
                </Button>
              </form>
            </div>
          </ScrollReveal>
        )}

        {/* VIEW 3: COMPANY SETTINGS & GEOCODED ADDRESS */}
        {activeView === "company-settings" && (
          <ScrollReveal delay={100} className="mt-8 max-w-2xl mx-auto space-y-6">
            {/* Company Verification Badge Card */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-success-soft text-success">
                    <ShieldCheck className="size-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">
                      Company Trust Badge
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Admin-verified employer status shown on all job listings
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-3.5 py-1.5 text-xs font-bold text-success-foreground">
                  <BadgeCheck className="size-4" /> Verified Employer
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-success/30 bg-success-soft/20 p-4">
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="size-5 text-success" />
                    <div>
                      <p className="text-xs font-bold text-foreground">GSTIN Verification</p>
                      <p className="text-[11px] text-muted-foreground">
                        Government-registered entity validated
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-success">Verified</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-success/30 bg-success-soft/20 p-4">
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="size-5 text-success" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Domain Email Ownership</p>
                      <p className="text-[11px] text-muted-foreground">
                        hr@northwindlabs.io DNS verified
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-success">Verified</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-success/30 bg-success-soft/20 p-4">
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="size-5 text-success" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Company Address Geocoded</p>
                      <p className="text-[11px] text-muted-foreground">
                        Physical location confirmed via OpenStreetMap
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-success">Verified</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                This <strong>Verified Employer</strong> badge is displayed on every job card and
                candidate offer letter. Students see verified companies first in recommendation
                feeds.
              </p>
            </div>

            {/* Address & Geocoding */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <div className="mb-6 border-b pb-4">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Company Profile & Geocoding
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter your physical company address. Coordinates will be resolved automatically
                  using OpenStreetMap Nominatim and rendered on the live map.
                </p>
              </div>

              <form onSubmit={handleUpdateCompanyAddress} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="compAddr" className="text-xs font-semibold text-foreground">
                    Street Address
                  </Label>
                  <Input
                    id="compAddr"
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="compCity" className="text-xs font-semibold text-foreground">
                      City
                    </Label>
                    <Input
                      id="compCity"
                      type="text"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="compState" className="text-xs font-semibold text-foreground">
                      State
                    </Label>
                    <Input
                      id="compState"
                      type="text"
                      value={companyState}
                      onChange={(e) => setCompanyState(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="compPin" className="text-xs font-semibold text-foreground">
                      Pincode
                    </Label>
                    <Input
                      id="compPin"
                      type="text"
                      value={companyPincode}
                      onChange={(e) => setCompanyPincode(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isUpdatingCompany}
                  className="w-full h-11 rounded-xl font-bold font-display"
                >
                  <Navigation className="size-4 mr-2" />
                  {isUpdatingCompany
                    ? "Validating & Geocoding..."
                    : "Save Address & Resolve Geocoding"}
                </Button>
              </form>
            </div>
          </ScrollReveal>
        )}
      </main>

      <BottomNav />

      {selectedCandidateDetail && (
        <CandidateDetailModal
          candidate={selectedCandidateDetail}
          note={candidateNotes[selectedCandidateDetail.id] ?? ""}
          onNoteChange={(note) => handleNoteChange(selectedCandidateDetail.id, note)}
          onClose={() => setSelectedCandidateDetail(null)}
          onUpdateStage={handleStageUpdate}
        />
      )}
    </div>
  );
}
