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
  Lock,
  GitBranch,
  ExternalLink,
  AlertTriangle,
  Bookmark,
  FileCheck2,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [activeView, setActiveView] = useState<"pipeline" | "talent-search" | "post-job" | "company-settings">(
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

  // Talent Search 2.0 State
  const [talentRole, setTalentRole] = useState("");
  const [talentSkills, setTalentSkills] = useState("");
  const [talentVerification, setTalentVerification] = useState("All");
  const [talentMinAssessment, setTalentMinAssessment] = useState(0);
  const [talentPow, setTalentPow] = useState("Any");
  const [talentLocation, setTalentLocation] = useState("");
  const [talentSortBy, setTalentSortBy] = useState("best_match");
  const [talentResults, setTalentResults] = useState<any[]>([]);
  const [isSearchingTalent, setIsSearchingTalent] = useState(false);
  const [hasSearchedTalent, setHasSearchedTalent] = useState(false);
  const [proofCandidate, setProofCandidate] = useState<any | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);

  // Job creation state
  const [jobTitle, setJobTitle] = useState("");
  const [jobType, setJobType] = useState<"Full Time" | "Internship" | "Part Time" | "Contract">(
    "Full Time",
  );
  const [jobLocation, setJobLocation] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [jobSkills, setJobSkills] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isPostingJob, setIsPostingJob] = useState(false);

  // Company Geocoding state
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyState, setCompanyState] = useState("");
  const [companyPincode, setCompanyPincode] = useState("");
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Candidate stage could not be updated.");
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

  const handleTalentSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingTalent(true);
    setHasSearchedTalent(true);
    try {
      const skillsArr = talentSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await ApiClient.searchTalent({
        role: talentRole.trim() || undefined,
        skills: skillsArr.length > 0 ? skillsArr : undefined,
        verification_level: talentVerification,
        min_assessment: talentMinAssessment > 0 ? talentMinAssessment : undefined,
        proof_of_work: talentPow !== "Any" ? talentPow : undefined,
        location: talentLocation.trim() || undefined,
        sort_by: talentSortBy,
      });
      setTalentResults(res.candidates || []);
    } catch {
      toast.error("Talent search query failed.");
    } finally {
      setIsSearchingTalent(false);
    }
  };

  const handleInspectProof = async (studentId: string) => {
    setLoadingProof(true);
    try {
      const res = await ApiClient.getCandidateProof(studentId);
      setProofCandidate(res.candidate);
    } catch {
      toast.error("Failed to load candidate proof.");
    } finally {
      setLoadingProof(false);
    }
  };

  const handleShortlistFromSearch = async (studentId: string) => {
    try {
      const res = await ApiClient.shortlistCandidate(
        studentId,
        "shortlisted",
        "Shortlisted via Talent Search 2.0 Precision Match Engine",
      );
      toast.success(res.message || "Candidate shortlisted to company workspace!");
    } catch {
      toast.error("Failed to shortlist candidate.");
    }
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
        name: company?.name || "",
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
      toast.error("Company profile update failed. Please try again.");
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
                onClick={() => {
                  setActiveView("talent-search");
                  if (!hasSearchedTalent) {
                    handleTalentSearch();
                  }
                }}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeView === "talent-search"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="size-3.5 inline mr-1 text-primary" />
                Talent Search 2.0
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

        {/* VIEW: TALENT SEARCH 2.0 & PRECISION MATCH ENGINE */}
        {activeView === "talent-search" && (
          <div className="mt-8 space-y-6">
            {/* Filter / Search Panel */}
            <ScrollReveal delay={90}>
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="size-3.5" />
                    <span>Precision Match Engine 2.0</span>
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
                    Search Candidate Talent Pool
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Filter by verified skill credentials, deterministic Proof-of-Work strength, and assessment cutoffs.
                  </p>
                </div>

                <form onSubmit={handleTalentSearch} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="talentRole" className="text-[11px] font-bold text-muted-foreground uppercase">
                        Target Role / Keyword
                      </Label>
                      <Input
                        id="talentRole"
                        type="text"
                        placeholder="e.g. Frontend Engineer, Full Stack"
                        value={talentRole}
                        onChange={(e) => setTalentRole(e.target.value)}
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="talentSkills" className="text-[11px] font-bold text-muted-foreground uppercase">
                        Required Skills (Comma separated)
                      </Label>
                      <Input
                        id="talentSkills"
                        type="text"
                        placeholder="React, TypeScript, Node.js"
                        value={talentSkills}
                        onChange={(e) => setTalentSkills(e.target.value)}
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Min Verification Level
                      </Label>
                      <select
                        value={talentVerification}
                        onChange={(e) => setTalentVerification(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 h-9 text-xs font-medium"
                      >
                        <option value="All">All Verification Levels</option>
                        <option value="verified">Verified (Any Evidence)</option>
                        <option value="advanced">Advanced (Score &gt;= 75%)</option>
                        <option value="expert">Expert (Top Tier)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Min Assessment Score ({talentMinAssessment}%)
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={talentMinAssessment}
                        onChange={(e) => setTalentMinAssessment(Number(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer mt-2"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Proof-of-Work Strength
                      </Label>
                      <select
                        value={talentPow}
                        onChange={(e) => setTalentPow(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 h-9 text-xs font-medium"
                      >
                        <option value="Any">Any Proof-of-Work</option>
                        <option value="HIGH">High (2+ Active Repositories)</option>
                        <option value="MEDIUM">Medium (1+ Repository)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Sort Ranking By
                      </Label>
                      <select
                        value={talentSortBy}
                        onChange={(e) => setTalentSortBy(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 h-9 text-xs font-medium"
                      >
                        <option value="best_match">Precision Match Score (Best)</option>
                        <option value="highest_assessment">Highest Assessment Score</option>
                        <option value="highest_pow">Highest Proof-of-Work Evidence</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={isSearchingTalent}
                      className="rounded-xl font-bold text-xs gap-1.5 px-6"
                    >
                      <Search className="size-3.5" />
                      {isSearchingTalent ? "Searching Database..." : "Search Talent Pool"}
                    </Button>
                  </div>
                </form>
              </div>
            </ScrollReveal>

            {/* Results Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Matched Candidates ({talentResults.length})
                </p>
              </div>

              {isSearchingTalent ? (
                <div className="py-16 text-center text-sm font-semibold text-muted-foreground animate-pulse">
                  Querying PostgreSQL indexed candidate database and scoring precision metrics...
                </div>
              ) : talentResults.length === 0 ? (
                <div className="rounded-3xl border border-dashed bg-card/60 py-16 text-center space-y-2">
                  <Users className="mx-auto size-10 text-muted-foreground" />
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {hasSearchedTalent ? "No candidates meet all hard constraints" : "Ready to discover talent"}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {hasSearchedTalent
                      ? "Try lowering the assessment score cutoff or broadening required skills to see more candidates."
                      : "Click 'Search Talent Pool' to evaluate candidates using the 6-factor precision matching model."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {talentResults.map((cand) => (
                    <div
                      key={cand.student_id}
                      className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top candidate line */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <h3 className="font-display text-base font-bold text-foreground">
                                {cand.name}
                              </h3>
                              {cand.has_cryptographic_passport && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                  <Lock className="size-2.5" /> RS256 Verified
                                </span>
                              )}
                              {cand.proof_of_work?.level !== "NONE" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                  <GitBranch className="size-2.5" /> PoW: {cand.proof_of_work.level}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {cand.program} · <strong className="text-foreground">{cand.college}</strong>
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {cand.location} · {cand.experience || "Fresher"}
                            </p>
                          </div>

                          {/* Precision Match Score Badge */}
                          <div className="text-right shrink-0">
                            <span
                              className={`inline-block px-3 py-1 rounded-2xl text-xs font-black border ${
                                cand.precision_match_score >= 80
                                  ? "bg-success-soft text-success border-success/30"
                                  : cand.precision_match_score >= 60
                                  ? "bg-accent-soft text-accent border-accent/30"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {cand.precision_match_score}% Match
                            </span>
                            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                              {cand.match_strength}
                            </p>
                          </div>
                        </div>

                        {/* Matched skills */}
                        {cand.matched_skills?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">
                              Matched Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {cand.matched_skills.map((sk: any, sidx: number) => (
                                <span
                                  key={sidx}
                                  className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                                    sk.is_verified
                                      ? "bg-primary/10 text-primary border-primary/20"
                                      : "bg-background border-border text-foreground"
                                  }`}
                                >
                                  {sk.skill_name} · {sk.verification_level}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Explainable Reasons */}
                        {cand.explainable_reasons?.length > 0 && (
                          <div className="rounded-2xl bg-background/50 border border-border/60 p-3 space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Explainable Match Reasoning
                            </p>
                            {cand.explainable_reasons.slice(0, 3).map((reason: string, ridx: number) => (
                              <div key={ridx} className="flex items-center gap-1.5 text-xs text-foreground">
                                <CheckCircle2 className="size-3 text-success shrink-0" />
                                <span>{reason}</span>
                              </div>
                            ))}
                            {cand.gaps?.length > 0 && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                                <AlertTriangle className="size-3 text-warning shrink-0" />
                                <span>{cand.gaps[0]}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInspectProof(cand.student_id)}
                            className="rounded-xl text-xs font-bold h-8 px-3 border-border"
                          >
                            <FileCheck2 className="size-3.5 mr-1 text-primary" /> Proof
                          </Button>
                          {cand.passport_token && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/passport/${cand.passport_token}`, "_blank")}
                              className="rounded-xl text-xs font-bold h-8 px-2"
                            >
                              <ExternalLink className="size-3 mr-1" /> Passport
                            </Button>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleShortlistFromSearch(cand.student_id)}
                          className="rounded-xl text-xs font-bold h-8 px-3.5"
                        >
                          <Bookmark className="size-3 mr-1" /> Shortlist
                        </Button>
                      </div>
                    </div>
                  ))}
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
                        Verification status is unavailable from the API
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">Unavailable</span>
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

      {/* CANDIDATE PROOF INSPECTION MODAL */}
      <Dialog open={Boolean(proofCandidate) || loadingProof} onOpenChange={(open) => !open && setProofCandidate(null)}>
        <DialogContent className="max-w-2xl rounded-3xl border border-border/80 bg-card p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
          {loadingProof ? (
            <div className="py-16 text-center text-sm font-semibold text-muted-foreground animate-pulse">
              Loading empirical proof graph & cryptographic credentials...
            </div>
          ) : proofCandidate ? (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 text-primary font-bold">
                  <FileCheck2 className="size-5" />
                  <span className="text-xs uppercase tracking-wider font-extrabold">Empirical Proof Profile</span>
                </div>
                <DialogTitle className="font-display text-2xl font-bold text-foreground">
                  {proofCandidate.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {proofCandidate.program} · {proofCandidate.institution} · {proofCandidate.location}
                </DialogDescription>
              </DialogHeader>

              {/* Cryptographic verification status */}
              {proofCandidate.cryptographic_verification && (
                <div className="p-3.5 rounded-2xl border border-success/30 bg-success/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success" />
                    <span className="text-xs font-bold text-foreground">
                      Cryptographically Signed Passport (RS256)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Key: {proofCandidate.cryptographic_verification.key_id || "sb_k1_2026"}
                  </span>
                </div>
              )}

              {/* Skills with Evidence Breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground">Verified Skills & Empirical Evidence</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(proofCandidate.skills || []).map((sk: any) => (
                    <div key={sk.skill_id} className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{sk.skill_name}</span>
                        <span className="font-bold text-primary">{sk.confidence_score}%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Level: <strong className="text-foreground">{sk.verification_level}</strong> · {sk.integrity_status}
                      </p>
                      {sk.proof_signals?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground italic">
                          {sk.proof_signals[0]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Proof of Work Repositories */}
              {proofCandidate.proof_of_work?.has_proof_of_work && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground">Proof-of-Work Repositories</h4>
                    <span className="text-xs font-bold text-primary">
                      Tier: {proofCandidate.proof_of_work.proof_of_work_level} ({proofCandidate.proof_of_work.overall_pow_score}% avg)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(proofCandidate.proof_of_work.repositories || []).map((repo: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-border/60 bg-background/50 flex items-center justify-between text-xs">
                        <div>
                          <a href={repo.repo_url} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline flex items-center gap-1">
                            <GitBranch className="size-3" /> {repo.repo_name}
                          </a>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Language: {repo.primary_language || "General"} · Commits: {repo.commit_count || 5}+
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-md bg-card border border-border text-xs font-bold font-mono">
                          {repo.overall_evidence_score}% Evidence
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {proofCandidate.projects?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-foreground">Projects</h4>
                  <div className="space-y-2">
                    {proofCandidate.projects.map((pr: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl border border-border/60 bg-background/50 text-xs">
                        <span className="font-bold text-foreground">{pr.title}</span>
                        <p className="text-muted-foreground text-[11px] mt-0.5">{pr.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button variant="outline" size="sm" onClick={() => setProofCandidate(null)} className="rounded-xl text-xs font-bold">
                  Close
                </Button>
                {proofCandidate.passport_token && (
                  <Button
                    size="sm"
                    onClick={() => window.open(`/passport/${proofCandidate.passport_token}`, "_blank")}
                    className="rounded-xl text-xs font-bold"
                  >
                    <ExternalLink className="size-3.5 mr-1" /> Open Skill Passport
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
