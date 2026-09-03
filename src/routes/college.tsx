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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// @ts-ignore – route will be added to routeTree after generation
export const Route = createFileRoute("/college")({
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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a14] via-[#0d0d1a] to-[#090912]">
      <SiteHeader />

      {/* Page header */}
      <div className="border-b border-white/5 bg-gradient-to-b from-blue-950/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <GraduationCap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">College Placement Mode</h1>
                <p className="text-sm text-slate-400">
                  Manage students, verify skills, and track placement outcomes
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowDriveModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Job Drive
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === id
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "students" && <StudentsTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "drives" && <DrivesTab />}
      </div>

      {showDriveModal && (
        <NewDriveModal onClose={() => setShowDriveModal(false)} />
      )}
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
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Verified",
      value: d.verified_students,
      sub: `${d.verification_rate}% rate`,
      Icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Passported",
      value: d.passported_students,
      Icon: Award,
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
    },
    {
      label: "Active Drives",
      value: d.active_drives,
      Icon: Briefcase,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Avg Trust Score",
      value: `${d.avg_trust_score.toFixed(1)}%`,
      Icon: TrendingUp,
      color: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20",
    },
    {
      label: "Hired",
      value: d.placements["hired"] ?? 0,

      Icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* College name */}
      <div className="flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-slate-400">
          {d.college?.name ?? "Your College"}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map(({ label, value, sub, Icon, color, bg }) => (
          <div
            key={label}
            className={`rounded-xl border p-4 ${bg} flex items-center gap-3`}
          >
            <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              {sub && <p className="text-xs text-slate-500">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Placement pipeline */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Placement Pipeline</h3>
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { label: "Shortlisted", count: d.placements["shortlisted"] ?? 0, color: "bg-blue-500" },
            { label: "Interview", count: d.placements["interview"] ?? 0, color: "bg-violet-500" },
            { label: "Offer", count: d.placements["offer"] ?? 0, color: "bg-amber-500" },
            { label: "Hired", count: d.placements["hired"] ?? 0, color: "bg-emerald-500" },

          ].map(({ label, count, color }, idx) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`px-3 py-1.5 rounded-lg ${color}/20 border ${color.replace("bg-", "border-")}/30 text-center min-w-[80px]`}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-lg font-bold text-white">{count}</p>
              </div>
              {idx < 3 && <ChevronRight className="w-4 h-4 text-slate-600" />}
            </div>
          ))}
        </div>
      </div>

      {/* Top skills */}
      {d.top_skills && d.top_skills.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Top Skills in Your Cohort</h3>
          <div className="space-y-2">
            {d.top_skills.slice(0, 8).map(({ name, student_count }: { name: string; student_count: number }) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-slate-300 w-28 truncate">{name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (student_count / (d.top_skills[0]?.student_count || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-8 text-right">{student_count}</span>
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search students by name or college…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white"
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <p className="text-xs text-slate-400">
            {data?.total ?? 0} student{data?.total !== 1 ? "s" : ""} enrolled
          </p>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/10">
                <tr>
                  {["Student", "College", "Batch", "Verified Skills", "Avg Trust", "Passport"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(data?.students ?? []).map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
                          {s.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-white font-medium text-xs">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[140px] truncate">
                      {s.college}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {s.batch_year ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-emerald-400">
                        {s.verified_skills ?? 0}
                      </span>
                      <span className="text-xs text-slate-500">
                        /{s.total_skills ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold ${
                          (s.avg_trust_score ?? 0) >= 70
                            ? "text-emerald-400"
                            : (s.avg_trust_score ?? 0) >= 50
                              ? "text-amber-400"
                              : "text-slate-400"
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
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Valid
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-500">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data?.total_pages ?? 0) > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Page {page} of {data?.total_pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (data?.total_pages ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
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
    { key: "enrolled", label: "Enrolled", color: "bg-blue-500" },
    { key: "attempted_verification", label: "Attempted", color: "bg-violet-500" },
    { key: "verified", label: "Verified", color: "bg-sky-500" },
    { key: "passported", label: "Passported", color: "bg-amber-500" },
    { key: "in_pipeline", label: "In Pipeline", color: "bg-orange-500" },
    { key: "placed", label: "Placed", color: "bg-emerald-500" },
  ];

  const maxFunnel = Math.max(...funnelSteps.map((s) => funnel[s.key] ?? 0), 1);

  return (
    <div className="space-y-8">
      {/* Placement funnel */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-sm font-semibold text-white mb-5">Placement Funnel</h3>
        <div className="space-y-3">
          {funnelSteps.map(({ key, label, color }) => {
            const count = funnel[key] ?? 0;
            const pct = Math.round((count / maxFunnel) * 100);
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-28 flex-shrink-0">{label}</span>
                <div className="flex-1 h-4 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-white w-10 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust distribution */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-sm font-semibold text-white mb-5">Trust Score Distribution</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { key: "very_high", label: "≥80% (Very High)", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { key: "high", label: "60–80% (High)", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
            { key: "medium", label: "40–60% (Medium)", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { key: "low", label: "<40% (Low)", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
          ].map(({ key, label, color, bg }) => (
            <div key={key} className={`rounded-xl border p-4 text-center ${bg}`}>
              <p className={`text-2xl font-bold ${color}`}>{trustDist[key] ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skill distribution */}
      {data.skill_distribution && data.skill_distribution.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Top Skills with Avg Trust</h3>
          <div className="space-y-2.5">
            {data.skill_distribution.slice(0, 10).map((s: any) => (
              <div key={s.skill} className="flex items-center gap-3">
                <span className="text-xs text-slate-300 w-32 truncate">{s.skill}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, s.avg_trust)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-20 text-right">
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
// Drives Tab (read from analytics recent_drives)
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
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <Briefcase className="w-10 h-10 text-slate-600" />
        <h3 className="text-sm font-semibold text-white">No drives created yet</h3>
        <p className="text-xs text-slate-400">Create a job drive to connect your students with companies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drives.map((d: any) => (
        <div
          key={d.id}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-4"
        >
          <div className={`p-2.5 rounded-lg ${d.status === "active" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-slate-500/10 border-slate-500/20"} border`}>
            <Briefcase className={`w-4 h-4 ${d.status === "active" ? "text-emerald-400" : "text-slate-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{d.title}</p>
            <p className="text-xs text-slate-400">
              {d.job_title ? `${d.job_title} · ` : ""}
              {d.drive_date
                ? new Date(d.drive_date).toLocaleDateString("en-IN", { dateStyle: "medium" })
                : "No date set"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {d.min_trust_score > 0 && (
              <span className="text-xs text-slate-400">Min trust: {d.min_trust_score}%</span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                d.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-500/10 text-slate-400 border border-slate-500/30"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">New Job Drive</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Drive Title *
            </label>
            <Input
              placeholder="e.g., Campus Recruitment 2025"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Description
            </label>
            <textarea
              placeholder="Brief description of this drive…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Drive Date
            </label>
            <Input
              type="datetime-local"
              value={driveDate}
              onChange={(e) => setDriveDate(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Minimum Trust Score: {minTrust}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minTrust}
              onChange={(e) => setMinTrust(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Students below this threshold won't be shown in drive results.
            </p>
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            className="flex-1 border-white/10"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            disabled={!title.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
