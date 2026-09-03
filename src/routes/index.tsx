import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Users,
  Briefcase,
  Building2,
  Zap,
  CheckCircle2,
  Shield,
  BarChart3,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CursorDot } from "@/components/cursor-dot";
import { CareerMap } from "@/components/career-map";
import { JourneyPath } from "@/components/journey-path";
import { JobCard } from "@/components/job-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import { SectionDivider } from "@/components/section-divider";
import { OpportunityModal } from "@/components/opportunity-modal";
import { BridgeLine } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useMagnetic } from "@/hooks/use-magnetic";
import { useParallax } from "@/hooks/use-parallax";
import { Link } from "@tanstack/react-router";
import { useJobsQuery, usePlatformStatsQuery } from "@/hooks/use-api";
import { ProofOfSkillShowcase } from "@/components/showcase/proof-of-skill-showcase";
import type { Job } from "@/types/skillbridge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkillBridge — Where Skills Meet Opportunity" },
      {
        name: "description",
        content:
          "SkillBridge connects students and early-career professionals with verified job opportunities through transparent skill matching. Discover, match, and launch your career.",
      },
    ],
  }),
  component: Index,
});

/* ========================================================================
   HERO SECTION
   ======================================================================== */

function HeroCTA() {
  const btnRef = useMagnetic<HTMLButtonElement>(0.25);
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Button
        ref={btnRef}
        size="lg"
        data-cta
        className="btn-ripple group rounded-full px-8 py-6 text-base font-bold shadow-glow transition-shadow duration-300 hover:shadow-lift"
        asChild
      >
        <Link to="/jobs">
          Explore Opportunities
          <ArrowRight
            className="ml-1 size-5 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </Button>

      <Button
        size="lg"
        variant="outline"
        className="rounded-full px-6 py-6 text-base font-semibold border-border/80 hover:bg-card/80 backdrop-blur-md"
        asChild
      >
        <Link
          to="/passport/$token"
          params={{ token: "sb_pass_lifecycle_a2f3fac68e2b" }}
        >
          <ShieldCheck className="mr-1.5 size-5 text-emerald-500" />
          Verify Live Passport
        </Link>
      </Button>
    </div>
  );
}

function HeroSection() {
  const { ref: parallaxRef, getTransform } = useParallax<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden" ref={parallaxRef}>
      {/* Background glows */}
      <div className="sb-hero-glow sb-hero-glow-1" style={getTransform(2)} aria-hidden="true" />
      <div className="sb-hero-glow sb-hero-glow-2" style={getTransform(3)} aria-hidden="true" />
      <div
        className="grid-field pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:pb-24 lg:pt-20">
        {/* Left: Text content */}
        <div className="max-w-xl">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft/60 px-3.5 py-1 text-xs font-bold text-primary backdrop-blur-md"
            style={{ animation: "sb-fade-in 500ms cubic-bezier(0.22, 1, 0.36, 1) 100ms both" }}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>SkillBridge 2.0 • AI-Verified Proof-of-Skill Platform</span>
          </div>

          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            {["Where", "Skills", "Meet"].map((word, i) => (
              <span
                key={word}
                className="mr-3 inline-block"
                style={{
                  animation: `sb-slide-up 600ms cubic-bezier(0.22, 1, 0.36, 1) ${200 + i * 80}ms both`,
                }}
              >
                {word}
              </span>
            ))}
            <br />
            <span
              className="bridge-gradient-text inline-block"
              style={{
                animation: "sb-slide-up 600ms cubic-bezier(0.22, 1, 0.36, 1) 500ms both",
              }}
            >
              Opportunity.
            </span>
          </h1>

          <p
            className="mt-6 text-lg leading-relaxed text-muted-foreground"
            style={{ animation: "sb-blur-clear 600ms cubic-bezier(0.22, 1, 0.36, 1) 600ms both" }}
          >
            SkillBridge connects students and early-career professionals with verified opportunities
            through transparent skill matching. Build your profile, discover your match score, and
            launch your career.
          </p>

          <div style={{ animation: "sb-slide-up 500ms cubic-bezier(0.22, 1, 0.36, 1) 750ms both" }}>
            <HeroCTA />
          </div>

          <div
            className="mt-6 flex items-center gap-4 text-sm text-muted-foreground"
            style={{ animation: "sb-fade-in 500ms ease 900ms both" }}
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> Free forever
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="size-4 text-accent" aria-hidden="true" /> Verified companies
            </span>
          </div>
        </div>

        {/* Right: Digital Bridge visual */}
        <div
          className="relative"
          style={{
            animation: "sb-scale-in 700ms cubic-bezier(0.22, 1, 0.36, 1) 400ms both",
            ...getTransform(5),
          }}
        >
          <CareerMap />
        </div>
      </div>
    </section>
  );
}

/* ========================================================================
   STATS SECTION
   ======================================================================== */

function StatsSection() {
  const stats = usePlatformStatsQuery();
  const statItems = [
    { icon: Users, label: "Students", value: stats?.students ?? 0 },
    { icon: Briefcase, label: "Opportunities", value: stats?.opportunities ?? 0 },
    { icon: Building2, label: "Companies", value: stats?.companies ?? 0 },
    { icon: Zap, label: "Matches Made", value: stats?.matches ?? 0 },
  ];

  return (
    <section
      className="relative border-y bg-card/60 py-14 backdrop-blur-sm"
      aria-label="Platform statistics"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4">
        {statItems.map((stat, i) => (
          <ScrollReveal key={stat.label} delay={i * 80} direction="up">
            <div className="flex flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <stat.icon className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-3 font-display text-3xl font-extrabold leading-none">
                <AnimatedCounter value={stat.value} />
              </p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{stat.label}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================
   HOW IT WORKS — CAREER JOURNEY
   ======================================================================== */

function JourneySection() {
  return (
    <section className="py-20" aria-labelledby="journey-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            How It Works
          </p>
          <h2
            id="journey-title"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Your Career <span className="bridge-gradient-text">Journey</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            From discovering opportunities to landing your dream role — SkillBridge guides you
            through every step.
          </p>
        </ScrollReveal>
        <div className="mt-14">
          <JourneyPath />
        </div>
      </div>
    </section>
  );
}

/* ========================================================================
   FEATURES SECTION
   ======================================================================== */

const features = [
  {
    icon: Zap,
    title: "Transparent Matching",
    description: "See exactly why you're matched — every skill scored, no black-box algorithms.",
  },
  {
    icon: Shield,
    title: "Verified Companies",
    description:
      "Only admin-verified employers can post opportunities. Your trust is non-negotiable.",
  },
  {
    icon: BarChart3,
    title: "Career Analytics",
    description:
      "Track applications, interview rates, and profile strength — all in one dashboard.",
  },
  {
    icon: Sparkles,
    title: "Smart Recommendations",
    description: "AI-powered suggestions based on your skills, interests, and career goals.",
  },
];

function FeaturesSection() {
  return (
    <section className="py-20 surface-gradient" aria-labelledby="features-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Platform Features
          </p>
          <h2
            id="features-title"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Built for <span className="bridge-gradient-text">Modern Careers</span>
          </h2>
        </ScrollReveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feat, i) => (
            <ScrollReveal key={feat.title} delay={i * 100} blur>
              <div className="group card-lift rounded-3xl border bg-card p-6 shadow-soft">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3">
                  <feat.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feat.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========================================================================
   OPPORTUNITY GRID
   ======================================================================== */

function OpportunitySection({ onSelectJob }: { onSelectJob: (job: Job) => void }) {
  const { jobs: featuredJobs, loading: jobsLoading } = useJobsQuery();
  const jobsToShow = featuredJobs.slice(0, 4);

  return (
    <section className="py-20" aria-labelledby="opportunities-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Featured</p>
            <h2
              id="opportunities-title"
              className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
            >
              Latest <span className="bridge-gradient-text">Opportunities</span>
            </h2>
          </div>
          <Button variant="outline" asChild className="group">
            <Link to="/jobs">
              View all jobs
              <ArrowRight
                className="ml-1 size-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </Button>
        </ScrollReveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {jobsLoading ? (
            <div className="col-span-full rounded-3xl border border-dashed bg-card/60 p-12 text-center text-sm text-muted-foreground">
              Loading opportunities...
            </div>
          ) : jobsToShow.length > 0 ? (
            jobsToShow.map((job, i) => (
              <ScrollReveal key={job.id} delay={i * 100} direction="up">
                <JobCard job={job} onSelect={onSelectJob} />
              </ScrollReveal>
            ))
          ) : (
            <div className="col-span-full rounded-3xl border border-dashed bg-card/60 p-12 text-center">
              <p className="font-display text-xl font-bold">No opportunities available</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The live job feed is empty right now.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ========================================================================
   CTA SECTION
   ======================================================================== */

function CTASection() {
  const btnRef = useMagnetic<HTMLButtonElement>(0.25);

  return (
    <section className="py-20" aria-labelledby="cta-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-[2rem] bridge-gradient-bg p-10 text-center sm:p-16">
            <div
              className="grid-field pointer-events-none absolute inset-0 opacity-20"
              aria-hidden="true"
            />
            <div className="relative">
              <h2
                id="cta-title"
                className="font-display text-3xl font-extrabold text-white sm:text-4xl"
              >
                Ready to Bridge the Gap?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                Join thousands of students already discovering their perfect career match on
                SkillBridge.
              </p>
              <Button
                ref={btnRef}
                size="lg"
                data-cta
                className="btn-ripple mt-8 rounded-full bg-white px-8 py-6 text-base font-bold text-primary shadow-lift transition-all duration-300 hover:bg-white/90 hover:shadow-glow"
                asChild
              >
                <Link to="/dashboard">
                  Get Started — It&apos;s Free
                  <ArrowRight className="ml-1 size-5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ========================================================================
   FOOTER
   ======================================================================== */

function Footer() {
  return (
    <footer className="border-t bg-card/60 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-lg font-extrabold">
              Skill<span className="bridge-gradient-text">Bridge</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Where skills meet opportunity. Connecting talent with verified career paths.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Platform</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/jobs" className="link-underline hover:text-foreground">
                  Explore Jobs
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="link-underline hover:text-foreground">
                  For Students
                </Link>
              </li>
              <li>
                <Link to="/recruiter" className="link-underline hover:text-foreground">
                  For Recruiters
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-foreground cursor-default">About</span>
              </li>
              <li>
                <span className="hover:text-foreground cursor-default">Blog</span>
              </li>
              <li>
                <span className="hover:text-foreground cursor-default">Careers</span>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-foreground cursor-default">Privacy</span>
              </li>
              <li>
                <span className="hover:text-foreground cursor-default">Terms</span>
              </li>
            </ul>
          </div>
        </div>
        <BridgeLine className="mx-auto mt-10 max-w-xs text-primary/30" />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} SkillBridge. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ========================================================================
   PAGE COMPONENT
   ======================================================================== */

function Index() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  return (
    <div className="min-h-screen">
      <CursorDot />
      <SiteHeader />
      <main>
        <HeroSection />
        <StatsSection />
        <SectionDivider />
        <ProofOfSkillShowcase />
        <SectionDivider />
        <JourneySection />
        <SectionDivider />
        <FeaturesSection />
        <SectionDivider />
        <OpportunitySection onSelectJob={(job) => setSelectedJob(job)} />
        <CTASection />
      </main>
      <Footer />
      <BottomNav />

      {/* Signature Opportunity & Apply Modal */}
      <OpportunityModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}
