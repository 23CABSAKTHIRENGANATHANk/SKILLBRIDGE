import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  Sparkles,
  Calendar,
  MapPin,
  Briefcase,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Compass,
  Award,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { CareerGoal } from "@/types/skillbridge";

export const Route = createFileRoute("/career-goal")({
  component: CareerGoalPage,
});

function CareerGoalPage() {
  return (
    <ProtectedRoute requiredRole="student">
      <CareerGoalContent />
    </ProtectedRoute>
  );
}

const STANDARD_ROLES = [
  { name: "Full Stack Developer", icon: "💻", description: "Build end-to-end web apps with React, Node.js, and PostgreSQL", defaultWeeks: 16 },
  { name: "Frontend Developer", icon: "🎨", description: "Design responsive, high-performance UIs with modern React and TypeScript", defaultWeeks: 12 },
  { name: "Backend Developer", icon: "⚙️", description: "Architect scalable APIs, microservices, and databases", defaultWeeks: 16 },
  { name: "Python Developer", icon: "🐍", description: "Develop automated workflows, APIs, and data backends in Python", defaultWeeks: 12 },
  { name: "Java Developer", icon: "☕", description: "Enterprise software and Spring Boot microservice architectures", defaultWeeks: 16 },
  { name: "Data Analyst", icon: "📊", description: "Extract insights, write complex SQL, and build business dashboards", defaultWeeks: 12 },
  { name: "Data Scientist", icon: "📈", description: "Statistical modeling, predictive analytics, and machine learning pipelines", defaultWeeks: 20 },
  { name: "AI/ML Engineer", icon: "🤖", description: "Train and deploy deep learning models and LLM applications", defaultWeeks: 24 },
  { name: "Cloud Engineer", icon: "☁️", description: "Provision and scale infrastructure on AWS with Docker and Terraform", defaultWeeks: 16 },
  { name: "DevOps Engineer", icon: "🚀", description: "Automate CI/CD pipelines, container orchestration, and monitoring", defaultWeeks: 16 },
  { name: "Cybersecurity", icon: "🛡️", description: "Protect networks, audit vulnerabilities, and harden applications", defaultWeeks: 20 },
  { name: "UI/UX Designer", icon: "📐", description: "User research, wireframing, and interactive design prototypes", defaultWeeks: 12 },
  { name: "Mobile Developer", icon: "📱", description: "Build cross-platform iOS and Android applications with React Native", defaultWeeks: 16 },
];

function CareerGoalContent() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: goalData, isLoading } = useQuery({
    queryKey: ["career-goal"],
    queryFn: () => ApiClient.getCareerGoal(),
  });

  const [selectedRole, setSelectedRole] = useState<string>("");
  const [customRole, setCustomRole] = useState<string>("");
  const [timelineWeeks, setTimelineWeeks] = useState<number>(16);
  const [preferredLocation, setPreferredLocation] = useState<string>("");
  const [experienceLevel, setExperienceLevel] = useState<string>("entry");

  useEffect(() => {
    if (goalData?.goal) {
      const g = goalData.goal;
      const matchStandard = STANDARD_ROLES.find((r) => r.name.toLowerCase() === g.target_role.toLowerCase());
      if (matchStandard) {
        setSelectedRole(matchStandard.name);
      } else {
        setSelectedRole("Custom");
        setCustomRole(g.target_role);
      }
      setTimelineWeeks(g.target_timeline_weeks || 16);
      setPreferredLocation(g.preferred_location || "");
      setExperienceLevel(g.experience_level || "entry");
    }
  }, [goalData]);

  const effectiveRole = selectedRole === "Custom" ? customRole.trim() : selectedRole;

  const saveMutation = useMutation({
    mutationFn: () =>
      ApiClient.saveCareerGoal({
        target_role: effectiveRole,
        target_timeline_weeks: Number(timelineWeeks),
        ...(preferredLocation.trim() ? { preferred_location: preferredLocation.trim() } : {}),
        experience_level: experienceLevel,
      }),

    onSuccess: (res) => {
      toast.success("Career target saved! Your personalized roadmap has been generated.");
      qc.invalidateQueries({ queryKey: ["career-goal"] });
      qc.invalidateQueries({ queryKey: ["career-dashboard"] });
      qc.invalidateQueries({ queryKey: ["career-roadmap"] });
      qc.invalidateQueries({ queryKey: ["skill-gaps"] });
      navigate({ to: "/career-roadmap" as any });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save career target.");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Hero Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Compass className="size-3.5" />
            <span>Career Destination Setup</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
            Where Do You Want Your Career to Go?
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Choose your target engineering role. SkillBridge will analyze your real skills, calculate your exact readiness, and generate a personalized step-by-step roadmap.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="space-y-4">
          <Label className="text-base font-bold">1. Select Target Career Track</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STANDARD_ROLES.map((role) => {
              const isSelected = selectedRole === role.name;
              return (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role.name);
                    setTimelineWeeks(role.defaultWeeks);
                  }}
                  className={`flex flex-col text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                      : "border-border/80 bg-card hover:border-primary/50 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-2xl">{role.icon}</span>
                    {isSelected && <CheckCircle2 className="size-5 text-primary" />}
                  </div>
                  <h3 className="font-display text-sm font-bold text-foreground">{role.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {role.description}
                  </p>
                  <span className="mt-3 text-[11px] font-semibold text-primary">
                    Suggested Timeline: {role.defaultWeeks} weeks
                  </span>
                </button>
              );
            })}

            {/* Custom Option */}
            <button
              type="button"
              onClick={() => setSelectedRole("Custom")}
              className={`flex flex-col text-left p-4 rounded-2xl border transition-all ${
                selectedRole === "Custom"
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                  : "border-dashed border-border/80 bg-card hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-2xl">✨</span>
                {selectedRole === "Custom" && <CheckCircle2 className="size-5 text-primary" />}
              </div>
              <h3 className="font-display text-sm font-bold text-foreground">Custom Role</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Define your own specific job title or interdisciplinary career target.
              </p>
            </button>
          </div>

          {selectedRole === "Custom" && (
            <div className="p-4 rounded-2xl border border-primary/30 bg-card space-y-2 mt-2">
              <Label htmlFor="custom-role-input">Enter Custom Target Role</Label>
              <Input
                id="custom-role-input"
                placeholder="e.g. Embedded Firmware Engineer, ML Ops Architect"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Timeline & Parameters Form */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
          <h2 className="font-display text-base font-bold">2. Target Timeline & Preferences</h2>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="timeline-input" className="flex items-center gap-1.5">
                <Calendar className="size-4 text-primary" /> Target Timeline (Weeks)
              </Label>
              <Input
                id="timeline-input"
                type="number"
                min={4}
                max={52}
                value={timelineWeeks}
                onChange={(e) => setTimelineWeeks(Number(e.target.value))}
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">Standard timeline is 12 to 24 weeks.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-input" className="flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" /> Preferred Location
              </Label>
              <Input
                id="location-input"
                placeholder="e.g. Bengaluru, Remote, Chennai"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience-input" className="flex items-center gap-1.5">
                <Briefcase className="size-4 text-primary" /> Target Level
              </Label>
              <select
                id="experience-input"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium"
              >
                <option value="entry">Intern / Entry-Level (Fresher)</option>
                <option value="junior">Junior Developer (0-2 Yrs)</option>
                <option value="mid">Mid-Level Engineer (2-4 Yrs)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Link to="/dashboard">
            <Button variant="ghost" className="font-semibold text-xs">
              Back to Dashboard
            </Button>
          </Link>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!effectiveRole || saveMutation.isPending}
            className="rounded-full px-6 font-bold"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Generating Roadmap...
              </>
            ) : (
              <>
                Confirm & Generate Roadmap <ArrowRight className="size-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
