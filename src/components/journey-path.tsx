import { useEffect, useRef, useState } from "react";

const steps = [
  { n: "01", label: "Discover", copy: "Browse verified roles filtered by your skills." },
  { n: "02", label: "Build Profile", copy: "Add skills, projects and certificates." },
  { n: "03", label: "Match", copy: "See a transparent score for every opportunity." },
  { n: "04", label: "Apply", copy: "One-tap apply with your bridge profile." },
  { n: "05", label: "Interview", copy: "Track every stage in one pipeline." },
  { n: "06", label: "Get Hired", copy: "Accept the offer and close the loop." },
];

export function JourneyPath() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-x-0 top-8 hidden h-24 w-full text-primary lg:block"
      >
        <path
          d="M20 100C200 100 220 20 400 20s220 80 400 80 180-80 380-80"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="2"
        />
        <path
          d="M20 100C200 100 220 20 400 20s220 80 400 80 180-80 380-80"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="1000"
          style={{
            strokeDashoffset: visible ? 0 : 1000,
            transition: "stroke-dashoffset 2s ease-out",
          }}
        />
      </svg>

      <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-3">
        {steps.map((s, i) => (
          <li
            key={s.n}
            className="rounded-3xl border bg-card p-4 shadow-soft transition-transform duration-500 lg:bg-card/85 lg:backdrop-blur-sm"
            style={{
              transitionDelay: `${i * 90}ms`,
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(16px)",
              transitionProperty: "opacity, transform",
              marginTop: i % 2 === 1 ? undefined : undefined,
            }}
          >
            <span className="font-display text-xs font-extrabold tracking-widest text-accent">
              {s.n}
            </span>
            <h3 className="mt-1.5 font-display text-base font-bold">{s.label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.copy}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
