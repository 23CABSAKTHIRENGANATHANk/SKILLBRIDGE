import { BadgeCheck, Briefcase } from "lucide-react";

const skills = ["React", "TypeScript", "Python", "Java", "PHP", "MySQL", "AI", "Cloud"];
const roles = [
  { title: "Full Stack Developer", meta: "Chennai · Full Time" },
  { title: "Software Engineer", meta: "Hyderabad · Full Time" },
  { title: "Data Analyst", meta: "Bengaluru · Full Time" },
  { title: "Internship", meta: "Remote · 6 months" },
];

/**
 * Signature SkillBridge hero visual: skill nodes connected by curved bridge
 * lines to opportunity cards. Purely decorative — hidden from assistive tech.
 */
export function CareerMap() {
  return (
    <div className="relative isolate rounded-4xl border bg-card/70 p-5 shadow-lift backdrop-blur-sm sm:p-7">
      <div
        aria-hidden="true"
        className="grid-field pointer-events-none absolute inset-0 rounded-4xl"
      />

      <div className="relative flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span>Your skills</span>
        <span className="text-accent">Live matching</span>
        <span>Opportunities</span>
      </div>

      <div className="relative mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)] items-center gap-2 sm:gap-4">
        <ul className="space-y-2">
          {skills.map((s, i) => (
            <li
              key={s}
              className="float-chip rounded-full border bg-background px-3 py-1.5 text-xs font-semibold shadow-soft"
              style={{ animationDelay: `${i * 0.35}s`, marginLeft: `${(i % 3) * 10}px` }}
            >
              {s}
            </li>
          ))}
        </ul>

        <svg
          viewBox="0 0 120 320"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="h-[320px] w-10 text-primary sm:w-20"
        >
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M0 ${40 + i * 70}C60 ${40 + i * 70} 60 ${44 + i * 68} 120 ${44 + i * 68}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeOpacity="0.55"
              className="dash-flow"
              style={{ animationDelay: `${i * 0.5}s` }}
            />
          ))}
        </svg>

        <ul className="space-y-2.5">
          {roles.map((r, i) => (
            <li
              key={r.title}
              className="float-chip rounded-2xl border bg-background p-3 shadow-soft"
              style={{ animationDelay: `${i * 0.6}s` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-bold sm:text-sm">
                  <Briefcase className="size-3.5 text-primary" aria-hidden="true" />
                  {r.title}
                </span>
                <BadgeCheck className="size-4 shrink-0 text-accent" aria-hidden="true" />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{r.meta}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
