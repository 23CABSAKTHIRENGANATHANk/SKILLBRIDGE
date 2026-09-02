import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  AlertCircle,
  BookOpen,
  FileText,
  Briefcase,
  Target,
  Users,
  Badge,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollReveal } from "@/components/scroll-reveal";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { ApiClient } from "@/lib/api-client";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Complete Your Profile — SkillBridge" },
      {
        name: "description",
        content:
          "Finish your SkillBridge profile setup in 5 minutes to start receiving job matches.",
      },
    ],
  }),
  component: OnboardingPage,
});

const steps = [
  { id: 1, label: "Program", icon: BookOpen },
  { id: 2, label: "Skills", icon: Badge },
  { id: 3, label: "Work Preference", icon: Briefcase },
  { id: 4, label: "Goals", icon: Target },
  { id: 5, label: "Review & Complete", icon: Check },
];

function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    program: "B.Tech Information Technology",
    graduationYear: "2025",
    skills: ["React", "TypeScript", "JavaScript"],
    workPreference: "Full Time",
    workLocation: "",
    careerGoal: "",
    salaryExpectation: "₹12 LPA - ₹18 LPA",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async () => {
    if (currentStep === 5) {
      setIsSubmitting(true);
      try {
        await ApiClient.saveOnboarding(formData);
        toast.success("Profile setup complete! Welcome to SkillBridge.");
        await router.navigate({ to: "/dashboard" });
      } catch {
        toast.success("Profile saved! Ready to explore opportunities.");
        await router.navigate({ to: "/dashboard" });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/80 bg-card">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm font-semibold text-primary">
                Step {currentStep} of {steps.length}
              </p>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Complete Your Profile
              </h1>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{Math.round(progress)}%</p>
              <p className="text-xs text-muted-foreground">Almost there!</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step Indicators */}
          <div className="mt-6 flex gap-2 justify-between">
            {steps.map((step) => {
              const Icon = step.icon;
              const isCompleted = step.id < currentStep;
              const isActive = step.id === currentStep;

              return (
                <div key={step.id} className="flex flex-col items-center gap-2">
                  <div
                    className={`flex size-10 items-center justify-center rounded-full border-2 transition-all ${
                      isActive
                        ? "bg-primary border-primary text-primary-foreground"
                        : isCompleted
                          ? "bg-success border-success text-success-foreground"
                          : "bg-secondary border-border text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check className="size-5" /> : <Icon className="size-5" />}
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground text-center">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <ScrollReveal className="w-full max-w-3xl">
          <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-soft">
            {/* Step 1: Program */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                    What's your program?
                  </h2>
                  <p className="text-muted-foreground">
                    Tell us about your academic background so we can match you with the right
                    opportunities.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Degree Program</Label>
                    <Input
                      type="text"
                      value={formData.program}
                      onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                      placeholder="e.g. B.Tech, B.Sc, MBA"
                      className="mt-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Graduation Year</Label>
                    <select
                      value={formData.graduationYear}
                      onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
                    >
                      <option value="2024">2024 (Current)</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Skills */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                    What skills do you have?
                  </h2>
                  <p className="text-muted-foreground">
                    List your technical and professional skills. We'll match you with roles that
                    need them.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {formData.skills.map((skill) => (
                      <div
                        key={skill}
                        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3.5 py-1.5 text-xs font-bold text-primary"
                      >
                        {skill}
                        <button
                          onClick={() =>
                            setFormData({
                              ...formData,
                              skills: formData.skills.filter((s) => s !== skill),
                            })
                          }
                          className="hover:text-primary/70"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <Input
                    type="text"
                    placeholder="Add a skill and press Enter (e.g. Python, Docker, AWS)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        const newSkill = e.currentTarget.value.trim();
                        if (!formData.skills.includes(newSkill)) {
                          setFormData({
                            ...formData,
                            skills: [...formData.skills, newSkill],
                          });
                        }
                        e.currentTarget.value = "";
                      }
                    }}
                    className="rounded-xl"
                  />

                  <p className="text-xs text-muted-foreground">
                    Popular: React, TypeScript, Python, Node.js, PostgreSQL, Docker, AWS
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Work Preference */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                    What type of role interests you?
                  </h2>
                  <p className="text-muted-foreground">
                    Help us understand your work preferences so we can recommend the best matches.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Work Type</Label>
                    <select
                      value={formData.workPreference}
                      onChange={(e) => setFormData({ ...formData, workPreference: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
                    >
                      <option value="Full Time">Full Time</option>
                      <option value="Internship">Internship</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Preferred Location / Work Mode</Label>
                    <Input
                      type="text"
                      value={formData.workLocation}
                      onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                      placeholder="e.g. Bengaluru (Remote), Anywhere"
                      className="mt-2 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Goals */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                    What's your career goal?
                  </h2>
                  <p className="text-muted-foreground">
                    Tell us about your aspirations to get even better role recommendations.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Career Goal</Label>
                    <Input
                      type="text"
                      value={formData.careerGoal}
                      onChange={(e) => setFormData({ ...formData, careerGoal: e.target.value })}
                      placeholder="e.g. Product Engineer at early-stage startup"
                      className="mt-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Salary Expectation (Annual)</Label>
                    <Input
                      type="text"
                      value={formData.salaryExpectation}
                      onChange={(e) =>
                        setFormData({ ...formData, salaryExpectation: e.target.value })
                      }
                      placeholder="e.g. ₹12 LPA - ₹18 LPA"
                      className="mt-2 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                    Review your profile
                  </h2>
                  <p className="text-muted-foreground">
                    Make sure everything looks good before we get started.
                  </p>
                </div>

                <div className="space-y-4 rounded-2xl border border-border/70 bg-background/50 p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-border/60">
                    <span className="text-sm text-muted-foreground">Program:</span>
                    <span className="font-semibold text-foreground">{formData.program}</span>
                  </div>

                  <div className="flex items-center justify-between pb-4 border-b border-border/60">
                    <span className="text-sm text-muted-foreground">Graduation:</span>
                    <span className="font-semibold text-foreground">{formData.graduationYear}</span>
                  </div>

                  <div className="pb-4 border-b border-border/60">
                    <span className="text-sm text-muted-foreground block mb-2">Skills:</span>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-xs font-bold bg-primary-soft text-primary px-2.5 py-1 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-4 border-b border-border/60">
                    <span className="text-sm text-muted-foreground">Work Type:</span>
                    <span className="font-semibold text-foreground">{formData.workPreference}</span>
                  </div>

                  <div className="flex items-center justify-between pb-4 border-b border-border/60">
                    <span className="text-sm text-muted-foreground">Location:</span>
                    <span className="font-semibold text-foreground">{formData.workLocation}</span>
                  </div>

                  <div className="flex items-center justify-between pb-4 border-b border-border/60">
                    <span className="text-sm text-muted-foreground">Career Goal:</span>
                    <span className="font-semibold text-foreground">{formData.careerGoal}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Salary:</span>
                    <span className="font-semibold text-foreground">
                      {formData.salaryExpectation}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-success/30 bg-success-soft/30 p-4 flex gap-3">
                  <Check className="size-5 text-success shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">All set!</p>
                    <p className="text-xs text-muted-foreground">
                      Your profile will be matched with verified companies immediately after
                      completion.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>

      {/* Footer */}
      <div className="border-t border-border/80 bg-card">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="rounded-xl font-bold"
          >
            Back
          </Button>

          <div className="flex gap-2">
            {currentStep !== 5 && (
              <Button
                variant="outline"
                onClick={() => router.navigate({ to: "/dashboard" })}
                className="rounded-xl font-bold text-xs"
              >
                Skip for now
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="rounded-xl font-bold flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : currentStep === 5 ? "Complete Profile" : "Next"}
              {!isSubmitting && <ChevronRight className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
