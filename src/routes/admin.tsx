import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  Building2,
  Briefcase,
  FileCheck,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Zap,
  ShieldCheck,
  BadgeCheck,
  XCircle,
  Check,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CursorDot } from "@/components/cursor-dot";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { ApiClient } from "@/lib/api-client";

function CompanyVerificationRow({ company }: { company: any }) {
  const [verified, setVerified] = useState(company.verified);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast: toastFn } = { toast: (m: any) => {} }; // use sonner below

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await ApiClient.verifyCompany(company.id, !verified);
      setVerified(!verified);
    } catch {
      // Keep the displayed state unchanged when the API rejects the update.
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        verified ? "border-success/30 bg-success-soft/10" : "border-border/70 bg-background/50"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 items-center justify-center rounded-xl ${
              verified ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Building2 className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">{company.name}</p>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                  <BadgeCheck className="size-3" /> Verified
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {company.industry} · {company.location} · {company.jobs} active jobs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            disabled={isUpdating}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              verified
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-success-soft text-success hover:bg-success/20"
            }`}
          >
            {isUpdating ? "Updating..." : verified ? "✕ Revoke Badge" : "✓ Approve Verification"}
          </button>
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "GSTIN", ok: company.checks.gstin },
          { label: "Domain Email", ok: company.checks.domain },
          { label: "Geocoded", ok: company.checks.geocoded },
          { label: "Admin Review", ok: company.checks.reviewed },
        ].map((check) => (
          <div
            key={check.label}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold ${
              check.ok ? "bg-success-soft/40 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            {check.ok ? <Check className="size-3" /> : <X className="size-3" />}
            {check.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — SkillBridge" },
      {
        name: "description",
        content: "Platform analytics and administrative controls for SkillBridge.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute requiredRole="admin">
      <AdminPage />
    </ProtectedRoute>
  ),
});

function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("analytics");
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [statsData, healthData] = await Promise.all([
        ApiClient.getPlatformStats(),
        ApiClient.getHealth().catch(() => null),
      ]);

      setStats(statsData ?? null);
      setHealth(healthData ?? null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Unable to load admin metrics right now.");
      setStats(null);
      setHealth(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    trend,
    color,
  }: {
    icon: any;
    label: string;
    value: number | string;
    trend?: string;
    color: string;
  }) => (
    <ScrollReveal className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1">
              <TrendingUp className="size-3" /> {trend} this week
            </p>
          )}
        </div>
        <div className={`rounded-2xl p-3 ${color}`}>
          <Icon className="size-6" />
        </div>
      </div>
    </ScrollReveal>
  );

  return (
    <div className="min-h-screen bg-background">
      <CursorDot />
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-muted-foreground">
                Platform-wide analytics, user management, and system monitoring.
              </p>
            </div>
            <Button
              onClick={fetchData}
              disabled={isRefreshing}
              variant="outline"
              className="rounded-xl font-bold"
            >
              <RefreshCw className={`size-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="flex items-center gap-1.5 mb-8 rounded-2xl border border-border/80 bg-card p-1.5 shadow-soft overflow-x-auto">
            {[
              { id: "analytics", label: "Analytics", icon: TrendingUp },
              { id: "users", label: "Users", icon: Users },
              { id: "jobs", label: "Jobs & Apps", icon: Briefcase },
              { id: "companies", label: "Companies", icon: Building2 },
              { id: "health", label: "System Health", icon: Zap },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {error && (
          <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground mb-4">Key Metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats && (
                  <>
                    <StatCard
                      icon={Briefcase}
                      label="Students"
                      value={stats.students ?? 0}
                      color="bg-blue-100 text-blue-600"
                    />
                    <StatCard
                      icon={Building2}
                      label="Companies"
                      value={stats.companies ?? 0}
                      color="bg-green-100 text-green-600"
                    />
                    <StatCard
                      icon={FileCheck}
                      label="Job Openings"
                      value={stats.opportunities ?? 0}
                      color="bg-red-100 text-red-600"
                    />
                    <StatCard
                      icon={CheckCircle2}
                      label="Applications"
                      value={stats.matches ?? 0}
                      color="bg-blue-100 text-blue-600"
                    />
                  </>
                )}
              </div>
            </div>

            <ScrollReveal>
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  Recent Activity
                </h3>
                <p className="text-sm text-muted-foreground">Activity records are not available from the API.</p>
              </div>
            </ScrollReveal>
          </div>
        )}

        {activeTab === "users" && (
          <ScrollReveal>
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">
                User Management
              </h3>
              <div className="space-y-3">
                {["Students", "Recruiters", "Admins"].map((role) => (
                  <div
                    key={role}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Users className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{role}</p>
                        <p className="text-xs text-muted-foreground">
                          Manage {role.toLowerCase()} accounts
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-lg text-xs font-bold">
                      Manage
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {activeTab === "jobs" && (
          <div className="space-y-6">
            <ScrollReveal>
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  Applications by Stage
                </h3>
                <p className="text-sm text-muted-foreground">Application stage breakdown is not available from the API.</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  Top Performing Jobs
                </h3>
                <p className="text-sm text-muted-foreground">Job performance records are not available from the API.</p>
              </div>
            </ScrollReveal>
          </div>
        )}

        {activeTab === "companies" && (
          <div className="space-y-6">
            <ScrollReveal>
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Company Verification Management
                  </h3>
                  <span className="text-xs font-bold bg-primary-soft text-primary px-2.5 py-1 rounded-full">
                    {stats?.companies ?? 0} Total Companies
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  Approve or revoke the <strong>Verified Employer</strong> trust badge. Verified
                  companies are ranked higher in student job feeds and receive a{" "}
                  <span className="text-success font-semibold">✓ Verified</span> badge on all job
                  cards.
                </p>

                <p className="text-sm text-muted-foreground">Company records are not available from the API.</p>
              </div>
            </ScrollReveal>
          </div>
        )}

        {activeTab === "health" && (
          <ScrollReveal>
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">
                System Health & Status
              </h3>
              <div className="space-y-4">
                {health && (
                  <>
                    <div className="rounded-2xl border border-green-300 bg-green-50 p-4 flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-foreground">Database Connection</p>
                        <p className="text-xs text-muted-foreground">Connected</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-green-300 bg-green-50 p-4 flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-foreground">API Status</p>
                        <p className="text-xs text-muted-foreground">All endpoints operational</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4 flex items-center gap-3">
                      <Zap className="size-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-foreground">System Uptime</p>
                        <p className="text-xs text-muted-foreground">
                          {health.uptime || "Unavailable"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
