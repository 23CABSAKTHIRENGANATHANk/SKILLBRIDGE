import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  GraduationCap,
  Users,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  BarChart3,
  Search,
  Plus,
  ChevronRight,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Lock,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ApiClient } from "@/lib/api-client";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/college")({
  head: () => ({
    meta: [
      { title: "College Placement Mode — SkillBridge 3.0" },
      {
        name: "description",
        content:
          "Manage cohort students, verify technical skill claims, and orchestrate institutional job drives with cryptographic proof-of-skill.",
      },
    ],
  }),
  component: CollegePage,
});

function CollegePage() {
  return (
    <ProtectedRoute requiredRole={["college_admin", "admin"]}>
      <CollegeContent />
    </ProtectedRoute>
  );
}

type Tab = "dashboard" | "students" | "analytics" | "drives";

function CollegeContent() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showDriveModal, setShowDriveModal] = useState(false);

  const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", Icon: BarChart3 },
    { id: "students", label: "Students", Icon: Users },
    { id: "analytics", label: "Analytics", Icon: TrendingUp },
    { id: "drives", label: "Job Drives", Icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      {/* Page Header Area */}
      <div className="border-b border-border/80 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <GraduationCap className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground">
                  College Placement Mode
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Manage students, verify skills, and track placement outcomes with verifiable proof
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowDriveModal(true)}
              className="rounded-xl font-bold text-xs"
            >
              <Plus className="size-4 mr-1.5" />
              New Job Drive
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 mt-6 rounded-2xl border border-border/80 bg-card p-1.5 shadow-soft overflow-x-auto">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <PageContainer size="default">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "students" && <StudentsTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "drives" && <DrivesTab />}
      </PageContainer>

      {showDriveModal && (
        <NewDriveModal onClose={() => setShowDriveModal(false)} />
      )}

      <BottomNav />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Tab
// ─────────────────────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["college-dashboard"],
    queryFn: () => ApiClient.getCollegeDashboard(),
    staleTime: 30_000,
  });

  if (isLoading) return <LoadingState />;
  if (error || !data?.success) return <ErrorState message="Could not load dashboard data." />;

  const d = data;

  const statCards = [
    {
      label: "Total Students",
      value: d.total_students,
      Icon: Users,
      color: "text-primary",
      bg: "bg-primary-soft/30 border-primary/20",
    },
    {
      label: "Verified",
      value: d.verified_students,
      sub: `${d.verification_rate}% rate`,
      Icon: ShieldCheck,
      color: "text-success",
      bg: "bg-success-soft/30 border-success/20",
    },
    {
      label: "Passported",
      value: d.passported_students,
      Icon: Award,
      color: "text-accent",
      bg: "bg-accent-soft/30 border-accent/20",
    },
    {
      label: "Active Drives",
      value: d.active_drives,
      Icon: Briefcase,
      color: "text-warning-foreground",
      bg: "bg-warning-soft/30 border-warning/20",
    },
    {
      label: "Avg Trust Score",
      value: `${d.avg_trust_score.toFixed(1)}%`,
      Icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary-soft/30 border-primary/20",
    },
    {
      label: "Hired",
      value: d.placements["hired"] ?? 0,
      Icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success-soft/30 border-success/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* College name */}
      <div className="flex items-center gap-2">
        <GraduationCap className="size-4 text-primary" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {d.college?.name ?? "Your Institutional Dashboard"}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map(({ label, value, sub, Icon, color, bg }) => (
          <div
            key={label}
            className={`rounded-2xl border p-5 ${bg} flex items-center gap-3 shadow-soft`}
          >
            <div className={`p-2.5 rounded-xl bg-card border border-border/80 ${color}`}>
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">{label}</p>
              <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
              {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Placement pipeline */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
        <h3 className="text-sm font-bold text-foreground mb-4">Placement Pipeline</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "Shortlisted", count: d.placements["shortlisted"] ?? 0, color: "text-primary bg-primary-soft border-primary/30" },
            { label: "Interview", count: d.placements["interview"] ?? 0, color: "text-accent bg-accent-soft border-accent/30" },
            { label: "Offer", count: d.placements["offer"] ?? 0, color: "text-warning-foreground bg-warning-soft border-warning/30" },
            { label: "Hired", count: d.placements["hired"] ?? 0, color: "text-success bg-success-soft border-success/30" },
          ].map(({ label, count, color }, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`px-4 py-2 rounded-xl border ${color} text-center min-w-[90px]`}>
                <p className="text-[11px] font-semibold opacity-80">{label}</p>
                <p className="text-lg font-extrabold">{count}</p>
              </div>
              {idx < 3 && <ChevronRight className="size-4 text-muted-foreground opacity-40" />}
            </div>
          ))}
        </div>
      </div>

      {/* Top skills */}
      {d.top_skills && d.top_skills.length > 0 && (
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
          <h3 className="text-sm font-bold text-foreground mb-4">Top Skills in Your Cohort</h3>
          <div className="space-y-2.5">
            {d.top_skills.slice(0, 8).map(({ name, student_count }: { name: string; student_count: number }) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-foreground font-semibold w-28 truncate">{name}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (student_count / (d.top_skills[0]?.student_count || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right font-bold">{student_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Students Tab
// ─────────────────────────────────────────────────────────────────────────────
function StudentsTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["college-students", page, debouncedSearch],
    queryFn: () => ApiClient.getCollegeStudents(page, 20, debouncedSearch),
    staleTime: 30_000,
  });

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
    setTimeout(() => setDebouncedSearch(v), 400);
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search students by name or college…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 rounded-xl text-xs"
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {data?.total ?? 0} student{data?.total !== 1 ? "s" : ""} enrolled
          </p>
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/60">
                  <tr>
                    {["Student", "College", "Batch", "Verified Skills", "Avg Trust", "Passport"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(data?.students ?? []).map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                            {s.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-foreground font-bold text-xs">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px] truncate">
                        {s.college}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {s.batch_year ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-success">
                          {s.verified_skills ?? 0}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /{s.total_skills ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold ${
                            (s.avg_trust_score ?? 0) >= 70
                              ? "text-success"
                              : (s.avg_trust_score ?? 0) >= 50
                              ? "text-warning-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {parseFloat(s.avg_trust_score ?? 0).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.passport_token ? (
                          <Link
                            to="/passport/$token"
                            params={{ token: s.passport_token }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success-soft border border-success/30 text-success text-[11px] font-bold"
                          >
                            <ShieldCheck className="size-3" />
                            Valid
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {(data?.total_pages ?? 0) > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Page {page} of {data?.total_pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (data?.total_pages ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Tab
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["college-analytics"],
    queryFn: () => ApiClient.getCollegeAnalytics(),
    staleTime: 60_000,
  });

  if (isLoading) return <LoadingState />;
  if (!data?.success) return <ErrorState message="Could not load analytics." />;

  const funnel = data.placement_funnel as Record<string, number>;
  const trustDist = data.trust_distribution as Record<string, number>;

  const funnelSteps = [
    { key: "enrolled", label: "Enrolled", color: "bg-primary" },
    { key: "attempted_verification", label: "Attempted", color: "bg-accent" },
    { key: "verified", label: "Verified", color: "bg-primary" },
    { key: "passported", label: "Passported", color: "bg-warning" },
    { key: "in_pipeline", label: "In Pipeline", color: "bg-accent" },
    { key: "placed", label: "Placed", color: "bg-success" },
  ];

  const maxFunnel = Math.max(...funnelSteps.map((s) => funnel[s.key] ?? 0), 1);

  return (
    <div className="space-y-8">
      {/* Placement funnel */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
        <h3 className="text-sm font-bold text-foreground mb-5">Placement Funnel</h3>
        <div className="space-y-3">
          {funnelSteps.map(({ key, label, color }) => {
            const count = funnel[key] ?? 0;
            const pct = Math.round((count / maxFunnel) * 100);
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-28 flex-shrink-0 font-medium">{label}</span>
                <div className="flex-1 h-3.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-foreground w-10 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust distribution */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
        <h3 className="text-sm font-bold text-foreground mb-5">Trust Score Distribution</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { key: "very_high", label: "≥80% (Very High)", color: "text-success", bg: "bg-success-soft/30 border-success/20" },
            { key: "high", label: "60–80% (High)", color: "text-primary", bg: "bg-primary-soft/30 border-primary/20" },
            { key: "medium", label: "40–60% (Medium)", color: "text-warning-foreground", bg: "bg-warning-soft/30 border-warning/20" },
            { key: "low", label: "<40% (Low)", color: "text-muted-foreground", bg: "bg-secondary border-border" },
          ].map(({ key, label, color, bg }) => (
            <div key={key} className={`rounded-2xl border p-4 text-center ${bg}`}>
              <p className={`text-2xl font-bold font-display ${color}`}>{trustDist[key] ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skill distribution */}
      {data.skill_distribution && data.skill_distribution.length > 0 && (
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
          <h3 className="text-sm font-bold text-foreground mb-4">Top Skills with Avg Trust</h3>
          <div className="space-y-2.5">
            {data.skill_distribution.slice(0, 10).map((s: any) => (
              <div key={s.skill} className="flex items-center gap-3">
                <span className="text-xs text-foreground font-semibold w-32 truncate">{s.skill}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${Math.min(100, s.avg_trust)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-28 text-right font-medium">
                  {s.student_count} students · {parseFloat(s.avg_trust).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drives Tab
// ─────────────────────────────────────────────────────────────────────────────
function DrivesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["college-analytics"],
    queryFn: () => ApiClient.getCollegeAnalytics(),
    staleTime: 60_000,
  });

  if (isLoading) return <LoadingState />;

  const drives = data?.recent_drives ?? [];

  if (drives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center rounded-3xl border border-dashed border-border bg-card/60 p-8">
        <Briefcase className="size-10 text-muted-foreground opacity-40" />
        <h3 className="text-sm font-bold text-foreground">No drives created yet</h3>
        <p className="text-xs text-muted-foreground">Create a job drive to connect your students with companies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drives.map((d: any) => (
        <div
          key={d.id}
          className="rounded-2xl border border-border/80 bg-card p-4 flex items-center gap-4 shadow-soft"
        >
          <div className={`p-2.5 rounded-xl ${d.status === "active" ? "bg-success-soft text-success border border-success/30" : "bg-secondary text-muted-foreground border border-border"}`}>
            <Briefcase className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{d.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {d.job_title ? `${d.job_title} · ` : ""}
              {d.drive_date
                ? new Date(d.drive_date).toLocaleDateString("en-IN", { dateStyle: "medium" })
                : "No date set"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {d.min_trust_score > 0 && (
              <span className="text-xs font-semibold text-muted-foreground">Min trust: {d.min_trust_score}%</span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                d.status === "active"
                  ? "bg-success-soft text-success border border-success/30"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {d.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New Drive Modal
// ─────────────────────────────────────────────────────────────────────────────
function NewDriveModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [driveDate, setDriveDate] = useState("");
  const [minTrust, setMinTrust] = useState(0);

  const mutation = useMutation({
    mutationFn: () =>
      ApiClient.createCollegeDrive({
        title,
        ...(description ? { description } : {}),
        ...(driveDate ? { drive_date: driveDate } : {}),
        min_trust_score: minTrust,
      }),
    onSuccess: () => {
      toast.success("Job drive created successfully!");
      qc.invalidateQueries({ queryKey: ["college-analytics"] });
      qc.invalidateQueries({ queryKey: ["college-dashboard"] });
      onClose();
    },
    onError: () => {
      toast.error("Failed to create drive. Please try again.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h2 className="text-base font-bold text-foreground">New Institutional Job Drive</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Drive Title *
            </label>
            <Input
              placeholder="e.g., Campus Recruitment 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Description
            </label>
            <textarea
              placeholder="Brief description of this drive…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-background border border-border text-foreground text-xs p-3 focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Drive Date
            </label>
            <Input
              type="datetime-local"
              value={driveDate}
              onChange={(e) => setDriveDate(e.target.value)}
              className="rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Minimum Trust Score Threshold: {minTrust}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minTrust}
              onChange={(e) => setMinTrust(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Students below this empirical threshold won't be shown in drive results.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl font-bold text-xs"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl font-bold text-xs"
            disabled={!title.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : null}
            Create Drive
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      <span className="text-xs font-semibold">Loading institutional metrics…</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
      <AlertCircle className="size-5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
