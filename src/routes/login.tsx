import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Zap,
  Briefcase,
  GraduationCap,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user) {
      const destination =
        search.redirect || (user.role === "recruiter" ? "/recruiter" : "/dashboard");
      navigate({ to: destination as any });
    }
  }, [isAuthLoading, isAuthenticated, user, navigate, search.redirect]);

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) return;

    setStatus("submitting");

    try {
      const result = await login({ email: email.trim(), password });
      setStatus("success");
      toast.success("Welcome back to SkillBridge!");

      setTimeout(() => {
        const destination =
          search.redirect || (result.user.role === "recruiter" ? "/recruiter" : "/dashboard");
        navigate({ to: destination as any });
      }, 500);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to sign in. Please try again.");
      toast.error(err.message || "Login failed");
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPassword: string = "password123") => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setStatus("submitting");
    try {
      const result = await login({ email: demoEmail, password: demoPassword });
      setStatus("success");
      toast.success("Welcome to SkillBridge 2.0 Demo!");
      setTimeout(() => {
        const destination =
          search.redirect || (result.user.role === "recruiter" ? "/recruiter" : "/dashboard");
        navigate({ to: destination as any });
      }, 300);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to sign in.");
      toast.error(err.message || "Login failed");
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden bg-background">
      {/* Ambient background blur elements */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-accent/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-primary-soft/30 blur-3xl -z-10"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: Hero Branding (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-6">
          <Link to="/" className="inline-block transition-transform hover:scale-105">
            <Logo />
          </Link>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/60 px-3.5 py-1 text-xs font-semibold text-primary backdrop-blur-md">
              <Sparkles className="size-3.5" />
              <span>Skill-First Intelligence</span>
            </div>

            <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl leading-[1.15]">
              Where Skills Meet{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                Opportunity.
              </span>
            </h1>

            <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-md">
              Sign in to your SkillBridge account to access real-time skill matching, track active
              job applications, and engage with top recruiters.
            </p>
          </div>

          {/* Interactive Feature Badges */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-md shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">For Students</p>
                <p className="text-xs text-muted-foreground">
                  Deterministic skill matches & 1-tap applications
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-md shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Briefcase className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">For Recruiters</p>
                <p className="text-xs text-muted-foreground">
                  Automated talent pipeline & geocoded company profiles
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Login Card */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl shadow-2xl transition-all">
            {/* Mobile Logo Branding */}
            <div className="mb-6 flex flex-col items-center text-center lg:hidden">
              <Link to="/" className="inline-block">
                <Logo />
              </Link>
              <h2 className="mt-3 font-display text-2xl font-bold text-foreground">Welcome Back</h2>
              <p className="text-xs text-muted-foreground">Sign in to your SkillBridge workspace</p>
            </div>

            {/* Desktop Heading */}
            <div className="hidden lg:block mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">Welcome Back</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your credentials to access your SkillBridge dashboard.
              </p>
            </div>

            {/* Global Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-shake"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* 1-Click Presentation Demo Bar */}
            <div className="mb-5 rounded-2xl border border-primary/25 bg-primary-soft/40 p-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Sparkles className="size-3.5" />
                  <span>1-Click Presentation Demo</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border/60">
                  Ready to Demo
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={status === "submitting"}
                  onClick={() => handleQuickLogin("student@skillbridge.dev", "password123")}
                  className="h-auto flex flex-col items-start p-2 rounded-xl border-border/80 hover:border-primary/50 hover:bg-primary/5 text-left transition-all"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <GraduationCap className="size-3.5 text-primary" />
                    <span>Student Persona</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Arjun Kumar • MCA</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={status === "submitting"}
                  onClick={() => handleQuickLogin("recruiter@northwind.dev", "password123")}
                  className="h-auto flex flex-col items-start p-2 rounded-xl border-border/80 hover:border-accent/50 hover:bg-accent/5 text-left transition-all"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Briefcase className="size-3.5 text-accent" />
                    <span>Recruiter Persona</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Northwind Labs</span>
                </Button>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="size-4" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@university.edu or you@company.dev"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    disabled={status === "submitting"}
                    className={`pl-9 rounded-xl border-border/80 bg-background/60 focus:bg-background ${
                      fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] font-medium text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        "Password reset instructions will be sent to your registered email.",
                      )
                    }
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Lock className="size-4" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password)
                        setFieldErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    disabled={status === "submitting"}
                    className={`pl-9 pr-10 rounded-xl border-border/80 bg-background/60 focus:bg-background ${
                      fieldErrors.password
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] font-medium text-destructive">{fieldErrors.password}</p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-border text-primary focus:ring-primary/30"
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-xs text-muted-foreground font-normal cursor-pointer"
                >
                  Remember this device
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={status === "submitting"}
                className="w-full mt-2 h-11 rounded-xl font-display font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/35 active:scale-[0.98]"
              >
                {status === "submitting" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Signing in...</span>
                  </span>
                ) : status === "success" ? (
                  <span className="flex items-center gap-2 text-primary-foreground">
                    <CheckCircle2 className="size-4" />
                    <span>Welcome back!</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Sign In</span>
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center text-xs text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-bold text-primary hover:underline transition-colors"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
