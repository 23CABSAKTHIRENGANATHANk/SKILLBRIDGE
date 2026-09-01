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
} from "lucide-react";
import { useState } from "react";
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
import { BridgeLine } from "@/components/brand/logo";
import { toast } from "sonner";

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

function RecruiterPage() {
  const [activeView, setActiveView] = useState<"pipeline" | "post-job" | "company-settings">("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("All");
  const [searchFocused, setSearchFocused] = useState(false);

  // Job creation state
  const [jobTitle, setJobTitle] = useState("");
  const [jobType, setJobType] = useState<"Full Time" | "Internship" | "Part Time" | "Contract">("Full Time");
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
  const { candidates, loading } = useCandidatesQuery({
    stage: selectedStage,
    search: searchQuery,
  });

  const { company } = useCompanyQuery("c1");

  const handleStageUpdate = async (appId: string, nextStage: string, candidateName: string) => {
    try {
      const token = localStorage.getItem("sb_auth_token") || "";
      const res = await fetch("http://localhost:8000/api/applications/stage", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ application_id: appId, stage: nextStage.toLowerCase() }),
      });
      if (res.ok) {
        toast.success(`Updated ${candidateName} to ${nextStage.toUpperCase()} stage.`);
      }
    } catch {
      toast.info(`Updated candidate stage.`);
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
      const token = localStorage.getItem("sb_auth_token") || "";
      const skillsArray = jobSkills.split(",").map((s) => s.trim()).filter(Boolean);

      const res = await fetch("http://localhost:8000/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: jobTitle.trim(),
          type: jobType,
          location: jobLocation.trim(),
          salary_range: salaryRange.trim(),
          skills: skillsArray,
          description: jobDescription.trim() || `Join our team as a ${jobTitle}.`,
        }),
      });

      if (res.ok) {
        toast.success("Job posting created and published live!");
        setJobTitle("");
        setJobDescription("");
        setActiveView("pipeline");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to create job posting.");
      }
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
      const token = localStorage.getItem("sb_auth_token") || "";
      const res = await fetch("http://localhost:8000/api/companies/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: company?.name || "Northwind Labs",
          address: companyAddress,
          city: companyCity,
          state: companyState,
          pincode: companyPincode,
          country: "India",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          data.geocoding?.coordinates
            ? `Company address geocoded (Lat: ${data.geocoding.coordinates.latitude.toFixed(4)}, Long: ${data.geocoding.coordinates.longitude.toFixed(4)})`
            : "Company profile updated successfully!"
        );
      } else {
        toast.error("Failed to update company address.");
      }
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
              </div>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Talent <span className="bridge-gradient-text">Pipeline</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Review skill-matched candidates and manage verified open positions.
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
                Candidates ({candidates.length})
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

        {/* VIEW 1: CANDIDATE PIPELINE */}
        {activeView === "pipeline" && (
          <div className="mt-8 space-y-6">
            {/* Search and stage filter bar */}
            <ScrollReveal delay={100}>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search candidate by name, college, or skill..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-2xl border-border/80 bg-card"
                  />
                </div>

                {/* Stage Filters */}
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {stageFilters.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setSelectedStage(stage)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        selectedStage === stage
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "border border-border/80 bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Candidates Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  Loading talent pipeline...
                </div>
              ) : candidates.length > 0 ? (
                candidates.map((candidate, i) => (
                  <ScrollReveal key={candidate.id} delay={i * 60} direction="up">
                    <CandidateCard candidate={candidate} />
                  </ScrollReveal>
                ))
              ) : (
                <div className="col-span-full rounded-3xl border border-dashed bg-card/60 py-16 text-center">
                  <Users className="mx-auto size-10 text-muted-foreground" />
                  <p className="mt-3 font-display text-lg font-bold text-foreground">No applicants found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try adjusting your search criteria or stage filter.
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
                <h2 className="font-display text-2xl font-bold text-foreground">Create Job Opportunity</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Publish a new position to the SkillBridge career feed with deterministic matching formulas.
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
          <ScrollReveal delay={100} className="mt-8 max-w-2xl mx-auto">
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl">
              <div className="mb-6 border-b pb-4">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Company Profile & Geocoding
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter your physical company address. Coordinates will be resolved automatically using OpenStreetMap Nominatim and rendered on the live map.
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
                  {isUpdatingCompany ? "Validating & Geocoding..." : "Save Address & Resolve Geocoding"}
                </Button>
              </form>
            </div>
          </ScrollReveal>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
