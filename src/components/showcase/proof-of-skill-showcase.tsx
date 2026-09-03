import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  Code2,
  BrainCircuit,
  Search,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Lock,
  GitBranch,
  Terminal,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProofOfSkillShowcase() {
  const [activeTab, setActiveTab] = useState<"passport" | "pow" | "match" | "interview">("passport");
  const [isVerifyingSignature, setIsVerifyingSignature] = useState(false);
  const [signatureVerified, setSignatureVerified] = useState(false);
  const navigate = useNavigate();

  const handleVerify = () => {
    setIsVerifyingSignature(true);
    setTimeout(() => {
      setIsVerifyingSignature(false);
      setSignatureVerified(true);
    }, 600);
  };

  return (
    <section className="relative py-24 overflow-hidden" aria-labelledby="showcase-title">
      {/* Background ambient light */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-primary/10 blur-3xl -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft/50 px-4 py-1.5 text-xs font-bold text-primary backdrop-blur-md">
            <Sparkles className="size-3.5" />
            <span>SkillBridge 2.0 Core Architecture</span>
          </div>

          <h2
            id="showcase-title"
            className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-foreground"
          >
            Proof-of-Skill{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              In Action.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Move beyond unverified resumes. SkillBridge combines cryptographic proof, static code
            analysis, and AI-driven precision matching into a verifiable hiring standard.
          </p>
        </div>

        {/* Showcase Interactive Tabs */}
        <div className="mt-12 flex flex-wrap justify-center gap-2 sm:gap-3">
          {[
            { id: "passport", label: "Cryptographic Passport", icon: ShieldCheck },
            { id: "pow", label: "GitHub Proof-of-Work", icon: Code2 },
            { id: "match", label: "Precision Match 2.0", icon: Search },
            { id: "interview", label: "Adaptive AI Interview", icon: BrainCircuit },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSignatureVerified(false);
                }}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]"
                    : "border border-border/80 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Cryptographic Passport */}
        {activeTab === "passport" && (
          <div className="mt-8 rounded-3xl border border-primary/25 bg-card/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 text-emerald-500 px-3 py-1 text-xs font-bold">
                  <Lock className="size-3.5" />
                  <span>RS256 Asymmetric Signature Verified</span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
                  Mathematical Tamper Resistance with Zero PII
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every verified skill is sealed with an RS256 private key. Recruiters can verify
                  credentials offline or online using the public key—without exposing the candidate's
                  phone number, address, or sensitive private data.
                </p>

                <div className="rounded-2xl border border-border/70 bg-background/60 p-4 font-mono text-xs space-y-1.5 text-muted-foreground">
                  <div className="flex items-center justify-between text-foreground font-semibold">
                    <span>Credential ID: cred_sb_2026_981a</span>
                    <span className="text-emerald-500 font-bold">● ACTIVE</span>
                  </div>
                  <p>Algorithm: RS256 (RSA-SHA256 • 2048-bit PKCS#1)</p>
                  <p>Canonical Hash: 3ef82bac48...1429da</p>
                  <p className="truncate text-primary font-mono text-[11px]">
                    Signature: 0rQy98KwK5IX5uXQ3oXuyJgOApom-tax1KUwyMlXcWMQs8yuv...
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifyingSignature}
                    className="rounded-xl font-bold gap-2"
                  >
                    <ShieldCheck className="size-4" />
                    {isVerifyingSignature
                      ? "Verifying Signature..."
                      : signatureVerified
                      ? "Signature Mathematically Valid!"
                      : "Test Cryptographic Verification"}
                  </Button>

                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/passport/$token",
                        params: { token: "sb_pass_lifecycle_a2f3fac68e2b" },
                      })
                    }
                    className="rounded-xl font-semibold gap-1.5"
                  >
                    <span>View Public Passport</span>
                    <ExternalLink className="size-3.5" />
                  </Button>
                </div>

                {signatureVerified && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 animate-in fade-in">
                    <CheckCircle2 className="size-4" />
                    <span>
                      Public Key Matched! Zero PII disclosed • Validated against Neon PostgreSQL
                    </span>
                  </div>
                )}
              </div>

              {/* Live Passport Card Visualizer */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-card via-card/90 to-emerald-500/5 p-6 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border/70 pb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        SkillBridge Passport
                      </p>
                      <h4 className="font-display text-lg font-extrabold text-foreground">
                        Arjun Kumar
                      </h4>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 font-bold">
                      <ShieldCheck className="size-6" />
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Verified Level</span>
                      <span className="font-bold text-foreground">Advanced • Top 5%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Key Skills</span>
                      <span className="font-semibold text-primary">React, TypeScript, CSS</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Proof-of-Work</span>
                      <span className="font-semibold text-emerald-500">8 Repositories Analyzed</span>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border/80 bg-background/80 p-3 text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">
                      Cryptographic Verification QR
                    </p>
                    <div className="mx-auto my-2 size-24 rounded-xl bg-foreground/10 flex items-center justify-center border border-border/60">
                      <div className="size-20 grid grid-cols-4 gap-1 p-1 bg-background rounded-lg">
                        {Array.from({ length: 16 }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`rounded-sm ${
                              (idx * 7) % 3 === 0 ? "bg-primary" : "bg-foreground/20"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">
                      sb_pass_lifecycle_a2f3...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: GitHub Proof-of-Work */}
        {activeTab === "pow" && (
          <div className="mt-8 rounded-3xl border border-primary/25 bg-card/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-3 py-1 text-xs font-bold">
                  <Code2 className="size-3.5" />
                  <span>Automated AST & Repository Intelligence</span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
                  Proof-of-Work Over Claims
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  SkillBridge inspects real GitHub repositories, extracting package manifests, AST
                  syntax trees, and commit cadence. Skills are certified only when backed by working,
                  production-grade code.
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-2">
                  <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5 text-center">
                    <p className="font-display text-2xl font-extrabold text-primary">8</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Repositories Scanned</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5 text-center">
                    <p className="font-display text-2xl font-extrabold text-emerald-500">94.2%</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Original Code Ratio</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5 text-center col-span-2 sm:col-span-1">
                    <p className="font-display text-2xl font-extrabold text-accent">0</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Integrity Mismatches</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button asChild className="rounded-xl font-bold">
                    <Link to="/login">
                      <span>Explore Proof-of-Work</span>
                      <ArrowRight className="size-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Terminal View */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-border/80 bg-background/90 p-5 font-mono text-xs shadow-xl">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-3 text-muted-foreground">
                    <div className="flex gap-1.5">
                      <span className="size-2.5 rounded-full bg-red-500/80" />
                      <span className="size-2.5 rounded-full bg-yellow-500/80" />
                      <span className="size-2.5 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-[11px] text-muted-foreground">pow-analyzer --repo</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <p className="text-emerald-500">$ skillbridge-pow analyze --target=distributed-queue</p>
                    <p className="text-muted-foreground">🔍 Scanning AST nodes...</p>
                    <p className="text-foreground">✓ Detected React 19 JSX runtime</p>
                    <p className="text-foreground">✓ TypeScript strict mode: true</p>
                    <p className="text-foreground">✓ 42 unit test suites verified</p>
                    <p className="text-primary font-semibold">★ Confidence Score: 96% (Expert)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Precision Match 2.0 */}
        {activeTab === "match" && (
          <div className="mt-8 rounded-3xl border border-primary/25 bg-card/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-lg bg-accent/15 text-accent px-3 py-1 text-xs font-bold">
                  <Search className="size-3.5" />
                  <span>Deterministic Multi-Attribute Talent Engine</span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
                  Zero Keyword Spam. 100% Proven Talent.
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Recruiters search across required skills, minimum proof levels, and verified
                  certifications. The Precision Match 2.0 engine evaluates candidates in under 350ms
                  using optimized SQL joins without N+1 query loops.
                </p>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">React & TypeScript Match</span>
                    <span className="font-bold text-emerald-500">100% Exact Match</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-full" />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Proof-of-Work Verification Cutoff</span>
                    <span className="font-bold text-primary">Advanced Tier (≥80%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                    <div className="h-full bg-primary rounded-full w-[92%]" />
                  </div>
                </div>

                <div className="pt-2">
                  <Button asChild className="rounded-xl font-bold">
                    <Link to="/login">
                      <span>Launch Recruiter Search</span>
                      <ArrowRight className="size-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Recruiter Candidate Card Preview */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        AK
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-foreground">Arjun Kumar</h5>
                        <p className="text-[11px] text-muted-foreground">Anna University · MCA</p>
                      </div>
                    </div>
                    <span className="rounded-xl bg-emerald-500/10 px-2.5 py-1 text-xs font-extrabold text-emerald-500">
                      94% Match
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-semibold text-primary">
                      ✓ React (Expert)
                    </span>
                    <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-semibold text-primary">
                      ✓ TypeScript
                    </span>
                    <span className="rounded-lg bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
                      ✓ CSS
                    </span>
                  </div>

                  <div className="border-t border-border/60 pt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Candidate Status</span>
                    <span className="font-semibold text-foreground">Available Immediately</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Adaptive AI Interview 2.0 */}
        {activeTab === "interview" && (
          <div className="mt-8 rounded-3xl border border-primary/25 bg-card/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-3 py-1 text-xs font-bold">
                  <BrainCircuit className="size-3.5" />
                  <span>Gemini 3.7 Flash Dynamic Progression</span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
                  Adaptive 4-Stage AI Technical Interview
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Questions dynamically branch based on candidate responses using Bloom's Taxonomy:
                  Conceptual Foundation → Practical Debugging → Architectural Trade-offs → Behavioral
                  Execution.
                </p>

                <div className="space-y-2 pt-2">
                  {[
                    { stage: "Stage 1", label: "Conceptual Mastery", desc: "Core mental models & syntax internals" },
                    { stage: "Stage 2", label: "Practical Debugging", desc: "Real bug triage & memory leak resolution" },
                    { stage: "Stage 3", label: "Architecture & Scale", desc: "Trade-off evaluation under production load" },
                    { stage: "Stage 4", label: "Comprehensive Rubric", desc: "Structured scorecard with deterministic fallback" },
                  ].map((s) => (
                    <div
                      key={s.stage}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-2.5 text-xs"
                    >
                      <span className="rounded-lg bg-primary/15 px-2 py-0.5 font-mono font-bold text-primary text-[10px]">
                        {s.stage}
                      </span>
                      <div>
                        <span className="font-bold text-foreground mr-2">{s.label}:</span>
                        <span className="text-muted-foreground">{s.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scorecard Preview */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">
                        AI Scorecard
                      </p>
                      <h5 className="font-display text-sm font-bold text-foreground">
                        Frontend Engineering Evaluation
                      </h5>
                    </div>
                    <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                      Grade: A
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Technical Depth</span>
                      <span className="font-bold text-foreground">92 / 100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Problem Solving</span>
                      <span className="font-bold text-foreground">88 / 100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Architecture Trade-offs</span>
                      <span className="font-bold text-foreground">95 / 100</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-primary-soft/60 p-3 text-[11px] text-primary">
                    <p className="font-semibold">Gemini Verdict:</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Demonstrates strong mental model of React concurrency and state synchronization.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
