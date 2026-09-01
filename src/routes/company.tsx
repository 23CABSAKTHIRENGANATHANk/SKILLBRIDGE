import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Globe,
  MapPin,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CursorDot } from "@/components/cursor-dot";
import { LocationCard } from "@/components/location-card";
import { JobCard } from "@/components/job-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import { Button } from "@/components/ui/button";
import { useCompanyQuery } from "@/hooks/use-api";
import { demoCompany } from "@/data/demo";

export const Route = createFileRoute("/company")({
  head: () => ({
    meta: [
      { title: "Northwind Labs — SkillBridge" },
      {
        name: "description",
        content: "Learn more about company profiles, open positions, and geocoded office locations on SkillBridge.",
      },
    ],
  }),
  component: CompanyPage,
});

function CompanyPage() {
  const { company: apiCompany, companyJobs, loading } = useCompanyQuery("c1");
  const company = apiCompany || demoCompany;

  return (
    <div className="min-h-screen">
      <CursorDot />
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        {/* Company header */}
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-[2rem] border bg-card p-8 shadow-soft sm:p-10">
            <div className="grid-field pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              {/* Logo */}
              <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-primary-soft text-primary shadow-soft">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt=""
                    className="size-20 rounded-3xl object-cover"
                  />
                ) : (
                  <Building2 className="size-8" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {company.name}
                  </h1>
                  {company.verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                      <VerifiedCheckmark />
                      Verified Company
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {company.industry && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="size-3.5" aria-hidden="true" />
                      {company.industry}
                    </span>
                  )}
                  {company.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {company.city}
                    </span>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Globe className="size-3.5" aria-hidden="true" />
                      Website
                    </a>
                  )}
                </div>

                {company.about && (
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {company.about}
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Stats */}
        <ScrollReveal delay={100}>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Users, label: "Team Size", value: 85, suffix: "+" },
              { icon: BadgeCheck, label: "Active Roles", value: companyJobs.length || 4, suffix: "" },
              { icon: ArrowRight, label: "Avg Response Time", value: 48, suffix: "h" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="card-lift flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-soft"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <stat.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-2xl font-extrabold leading-none">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Grid: Jobs + Geocoded Location */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Jobs */}
          <section aria-labelledby="company-jobs-title">
            <ScrollReveal>
              <div className="flex items-center justify-between">
                <h2
                  id="company-jobs-title"
                  className="font-display text-xl font-bold"
                >
                  Open Positions
                </h2>
                <Button variant="ghost" size="sm" className="text-xs" asChild>
                  <Link to="/jobs">View all jobs</Link>
                </Button>
              </div>
            </ScrollReveal>
            <div className="mt-4 space-y-4">
              {companyJobs.length > 0 ? (
                companyJobs.map((job, i) => (
                  <ScrollReveal key={job.id} delay={i * 100} direction="up">
                    <JobCard job={job} />
                  </ScrollReveal>
                ))
              ) : (
                <ScrollReveal>
                  <div className="flex flex-col items-center rounded-3xl border border-dashed bg-card/60 py-14 text-center">
                    <Building2 className="size-8 text-muted-foreground" />
                    <p className="mt-3 font-display font-bold">No open positions</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Check back soon for new opportunities.
                    </p>
                  </div>
                </ScrollReveal>
              )}
            </div>
          </section>

          {/* Location with real Geocoded Coordinates */}
          <div className="space-y-6">
            <ScrollReveal delay={200}>
              <LocationCard company={company} />
            </ScrollReveal>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

/** Animated checkmark for verified badge */
function VerifiedCheckmark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d="M5 13l4 4L19 7"
        strokeDasharray="24"
        strokeDashoffset="0"
        style={{
          animation: "sb-draw-check 600ms cubic-bezier(0.22, 1, 0.36, 1) 400ms both",
        }}
      />
    </svg>
  );
}
