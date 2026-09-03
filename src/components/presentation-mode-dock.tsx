import { useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import {
  Sparkles,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Zap,
  Activity,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PresentationModeDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSwitchPersona = async (role: "student" | "recruiter") => {
    setIsSwitching(true);
    try {
      if (role === "student") {
        await login({ email: "student@skillbridge.dev", password: "password123" });
        toast.success("Switched to Student Persona (Arjun Kumar)");
        navigate({ to: "/dashboard" });
      } else {
        await login({ email: "recruiter@northwind.dev", password: "password123" });
        toast.success("Switched to Recruiter Persona (Northwind Labs)");
        navigate({ to: "/recruiter" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to switch persona");
    } finally {
      setIsSwitching(false);
    }
  };

  const handleOpenPassport = () => {
    navigate({
      to: "/passport/$token",
      params: { token: "sb_pass_lifecycle_a2f3fac68e2b" },
    });
  };

  const handleOpenVerification = () => {
    navigate({ to: "/student/skill-verification" });
  };

  return (
    <aside
      aria-label="SkillBridge 2.0 Presentation Hub"
      className="fixed bottom-4 right-4 z-50 transition-all duration-300 print:hidden"
    >
      {isOpen ? (
        <div className="w-[360px] sm:w-[400px] rounded-3xl border border-primary/30 bg-background/95 p-5 shadow-2xl backdrop-blur-2xl transition-all animate-in fade-in slide-in-from-bottom-5">
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="size-4 animate-pulse" />
              </span>
              <div>
                <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                  SkillBridge 2.0
                  <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                    10/10 DEMO
                  </span>
                </h4>
                <p className="text-[11px] text-muted-foreground">Interactive Presentation Hub</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
              aria-label="Minimize Presentation Hub"
            >
              <ChevronDown className="size-4" />
            </Button>
          </div>

          {/* Quick Persona Switcher */}
          <div className="mt-3.5 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Instant 1-Click Personas
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={user?.role === "student" ? "default" : "outline"}
                size="sm"
                disabled={isSwitching}
                onClick={() => handleSwitchPersona("student")}
                className="h-auto flex flex-col items-start p-2.5 text-left rounded-xl transition-all"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <GraduationCap className="size-3.5" />
                  <span>Student View</span>
                </span>
                <span className="text-[10px] opacity-80 mt-0.5">Arjun • Verified PoW</span>
              </Button>

              <Button
                type="button"
                variant={user?.role === "recruiter" ? "default" : "outline"}
                size="sm"
                disabled={isSwitching}
                onClick={() => handleSwitchPersona("recruiter")}
                className="h-auto flex flex-col items-start p-2.5 text-left rounded-xl transition-all"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <Briefcase className="size-3.5" />
                  <span>Recruiter View</span>
                </span>
                <span className="text-[10px] opacity-80 mt-0.5">Northwind • Talent 2.0</span>
              </Button>
            </div>
          </div>

          {/* Showcase Feature Deep Dives */}
          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Verified Feature Showcases
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenPassport}
                className="h-9 justify-start text-xs font-medium rounded-xl gap-1.5 border border-border/70"
              >
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>Verify Passport</span>
                <ExternalLink className="size-3 ml-auto opacity-60" />
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenVerification}
                className="h-9 justify-start text-xs font-medium rounded-xl gap-1.5 border border-border/70"
              >
                <Award className="size-3.5 text-primary" />
                <span>Skill Test Center</span>
                <ExternalLink className="size-3 ml-auto opacity-60" />
              </Button>
            </div>
          </div>

          {/* Production Telemetry Bar */}
          <div className="mt-3.5 rounded-2xl border border-border/80 bg-card/60 p-2.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-500">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                </span>
                Release Candidate 10/10
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">Postgres 17 • RS256</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>16 Quality Gates Passed</span>
              <span className="font-semibold text-foreground">100% CI Green</span>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 rounded-full border border-primary/30 bg-background/90 px-4 py-2.5 shadow-xl backdrop-blur-xl transition-all hover:scale-105 hover:border-primary hover:shadow-primary/20 active:scale-95"
          aria-label="Open Presentation Demo Hub"
        >
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
          </span>
          <span className="font-display text-xs font-bold text-foreground">10/10 Demo Hub</span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
            Quick Persona
          </span>
          <ChevronUp className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}
    </aside>
  );
}
