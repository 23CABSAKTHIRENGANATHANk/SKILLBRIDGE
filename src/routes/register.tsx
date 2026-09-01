import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
  User,
  Building,
  GraduationCap,
  Briefcase,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { register, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<"student" | "recruiter">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Student specific
  const [college, setCollege] = useState("");
  const [program, setProgram] = useState("");

  // Recruiter specific
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user) {
      navigate({ to: user.role === "recruiter" ? "/recruiter" : "/dashboard" as any });
    }
  }, [isAuthLoading, isAuthenticated, user, navigate]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Full name is required";

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

    if (role === "student") {
      if (!college.trim()) errors.college = "College / University name is required";
    } else {
      if (!companyName.trim()) errors.companyName = "Company name is required";
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
      const result = await register({
        email: email.trim(),
        password,
        role,
        name: name.trim(),
        college: role === "student" ? college.trim() : undefined,
        program: role === "student" ? program.trim() : undefined,
        company_name: role === "recruiter" ? companyName.trim() : undefined,
        industry: role === "recruiter" ? industry.trim() : undefined,
      });

      setStatus("success");
      toast.success("Account created successfully! Welcome to SkillBridge.");

      setTimeout(() => {
        navigate({ to: result.user.role === "recruiter" ? "/recruiter" : "/dashboard" as any });
      }, 500);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to create account. Please check your details.");
      toast.error(err.message || "Registration failed");
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden bg-background">
      {/* Ambient backgrounds */}
      <div className="pointer-events-none absolute -top-40 -right-40 size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* Top Brand Header */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-block">
              <Logo />
            </Link>
            <h1 className="mt-3 font-display text-2xl font-bold text-foreground sm:text-3xl">
              Create your account
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Join SkillBridge to connect skills with verified career opportunities
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/80 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRole("student");
                setFieldErrors({});
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                role === "student"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="size-4 text-primary" />
              <span>I'm a Student</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole("recruiter");
                setFieldErrors({});
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                role === "recruiter"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="size-4 text-accent" />
              <span>I'm a Recruiter</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-foreground">
                {role === "student" ? "Full Name" : "Your Name / Title"}
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <User className="size-4" />
                </div>
                <Input
                  id="name"
                  type="text"
                  placeholder={role === "student" ? "Kavitha S" : "HR Director / Talent Lead"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={status === "submitting"}
                  className={`pl-9 rounded-xl border-border/80 bg-background/60 ${
                    fieldErrors.name ? "border-destructive" : ""
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-[11px] font-medium text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-email" className="text-xs font-semibold text-foreground">
                Work / Academic Email
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Mail className="size-4" />
                </div>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder={role === "student" ? "you@university.edu" : "talent@company.dev"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "submitting"}
                  className={`pl-9 rounded-xl border-border/80 bg-background/60 ${
                    fieldErrors.email ? "border-destructive" : ""
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] font-medium text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            {/* Student Specific Fields */}
            {role === "student" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="college" className="text-xs font-semibold text-foreground">
                    College / University
                  </Label>
                  <Input
                    id="college"
                    type="text"
                    placeholder="e.g. PSG Tech"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    disabled={status === "submitting"}
                    className={`rounded-xl border-border/80 bg-background/60 ${
                      fieldErrors.college ? "border-destructive" : ""
                    }`}
                  />
                  {fieldErrors.college && (
                    <p className="text-[11px] font-medium text-destructive">{fieldErrors.college}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="program" className="text-xs font-semibold text-foreground">
                    Degree / Program
                  </Label>
                  <Input
                    id="program"
                    type="text"
                    placeholder="e.g. B.Tech IT, MCA"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    disabled={status === "submitting"}
                    className="rounded-xl border-border/80 bg-background/60"
                  />
                </div>
              </div>
            ) : (
              /* Recruiter Specific Fields */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName" className="text-xs font-semibold text-foreground">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="e.g. AcroTech Labs"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={status === "submitting"}
                    className={`rounded-xl border-border/80 bg-background/60 ${
                      fieldErrors.companyName ? "border-destructive" : ""
                    }`}
                  />
                  {fieldErrors.companyName && (
                    <p className="text-[11px] font-medium text-destructive">{fieldErrors.companyName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="industry" className="text-xs font-semibold text-foreground">
                    Industry
                  </Label>
                  <Input
                    id="industry"
                    type="text"
                    placeholder="e.g. Cloud Platforms, AI"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    disabled={status === "submitting"}
                    className="rounded-xl border-border/80 bg-background/60"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-password" className="text-xs font-semibold text-foreground">
                Password (min. 6 characters)
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="size-4" />
                </div>
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={status === "submitting"}
                  className={`pl-9 pr-10 rounded-xl border-border/80 bg-background/60 ${
                    fieldErrors.password ? "border-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] font-medium text-destructive">{fieldErrors.password}</p>
              )}
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
                  <span>Creating Account...</span>
                </span>
              ) : status === "success" ? (
                <span className="flex items-center gap-2 text-primary-foreground">
                  <CheckCircle2 className="size-4" />
                  <span>Account Created!</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Create Account</span>
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
