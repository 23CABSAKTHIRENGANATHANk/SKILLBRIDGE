import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Github,
  FileText,
  Brain,
  Briefcase,
  Star,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Info,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import type { SkillEvidenceItem, EvidenceEntry } from "@/lib/api-client";

type EvidenceTypeKey =
  | "skill_verification"
  | "assessment"
  | "proof_of_work"
  | "project_evidence"
  | "ai_interview"
  | "resume"
  | "github"
  | "self_declared";

type IntegrityKey = "VERIFIED" | "DEVELOPING" | "EVIDENCE_MISMATCH" | "NOT_VERIFIED";

interface EvidenceTypeConfig {
  label: string;
  Icon: React.ElementType;
  color: string;
}

interface IntegrityConfig {
  label: string;
  Icon: React.ElementType;
  color: string;
}

const EVIDENCE_TYPE_CONFIG: Record<EvidenceTypeKey, EvidenceTypeConfig> = {
  skill_verification: { label: "Skill Verification", Icon: ShieldCheck, color: "text-emerald-400" },
  assessment: { label: "Assessment", Icon: Brain, color: "text-violet-400" },
  proof_of_work: { label: "Proof-of-Work", Icon: Github, color: "text-sky-400" },
  project_evidence: { label: "Projects", Icon: Briefcase, color: "text-amber-400" },
  ai_interview: { label: "AI Interview", Icon: Brain, color: "text-pink-400" },
  resume: { label: "Resume", Icon: FileText, color: "text-slate-300" },
  github: { label: "GitHub Profile", Icon: Github, color: "text-sky-400" },
  self_declared: { label: "Self-Declared", Icon: Star, color: "text-slate-400" },
};

const EVIDENCE_TYPE_FALLBACK: EvidenceTypeConfig = {
  label: "Evidence",
  Icon: Star,
  color: "text-slate-400",
};

const INTEGRITY_CONFIG: Record<IntegrityKey, IntegrityConfig> = {
  VERIFIED: { label: "Verified", Icon: CheckCircle2, color: "text-emerald-400" },
  DEVELOPING: { label: "Developing", Icon: Clock, color: "text-amber-400" },
  EVIDENCE_MISMATCH: { label: "Mismatch", Icon: AlertCircle, color: "text-orange-400" },
  NOT_VERIFIED: { label: "Not Verified", Icon: AlertCircle, color: "text-slate-400" },
};

const INTEGRITY_FALLBACK: IntegrityConfig = {
  label: "Not Verified",
  Icon: AlertCircle,
  color: "text-slate-400",
};

function getEvidenceConfig(type: string): EvidenceTypeConfig {
  return EVIDENCE_TYPE_CONFIG[type as EvidenceTypeKey] ?? EVIDENCE_TYPE_FALLBACK;
}

function getIntegrityConfig(status: string): IntegrityConfig {
  return INTEGRITY_CONFIG[status as IntegrityKey] ?? INTEGRITY_FALLBACK;
}

export function SkillEvidenceGraph() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["skill-evidence-graph"],
    queryFn: () => ApiClient.getSkillEvidenceGraph(),
    staleTime: 2 * 60 * 1000,
  });

  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Building evidence graph from real data…</span>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">
          Could not load evidence graph.{" "}
          {error instanceof Error ? error.message : "Please try again."}
        </span>
      </div>
    );
  }

  const graph = data.evidence_graph ?? [];

  if (graph.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
        <Info className="w-8 h-8" />
        <p className="text-sm font-medium">No skills in your profile yet.</p>
        <p className="text-xs text-slate-500">
          Add skills to your profile to see your evidence graph.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Skill Evidence Graph</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real evidence from every verification source — click any skill to expand
          </p>
        </div>
        <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
          {graph.length} skill{graph.length !== 1 ? "s" : ""} analyzed
        </span>
      </div>

      {graph.map((skill: SkillEvidenceItem) => {
        const isOpen = expandedSkill === skill.skill_id;
        const integrity = getIntegrityConfig(skill.integrity_status);
        const IntegrityIcon = integrity.Icon;

        return (
          <div
            key={skill.skill_id}
            className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden transition-all"
          >
            {/* Skill header */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
              onClick={() => setExpandedSkill(isOpen ? null : skill.skill_id)}
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3 min-w-0">
                <ConfidenceRing pct={skill.final_confidence} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">
                      {skill.skill_name}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">{skill.proficiency}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <IntegrityIcon className={`w-3 h-3 ${integrity.color}`} />
                    <span className={`text-xs ${integrity.color}`}>{integrity.label}</span>
                    <span className="text-xs text-slate-500">
                      · {skill.evidence_count} evidence source
                      {skill.evidence_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-bold text-white tabular-nums">
                  {skill.final_confidence}%
                </span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {/* Evidence breakdown */}
            {isOpen && (
              <div className="border-t border-white/10 px-4 pb-4 pt-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                  Why is this skill at {skill.final_confidence}% confidence?
                </p>
                <div className="space-y-2">
                  {skill.evidence.map((ev: EvidenceEntry, idx: number) => (
                    <EvidenceRow key={`${ev.evidence_type}-${idx}`} ev={ev} />
                  ))}
                </div>
                {skill.evidence.length === 0 && (
                  <p className="text-xs text-slate-500 py-2">
                    No evidence sources found. Complete a verification or assessment to add
                    evidence.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfidenceRing({ pct }: { pct: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  const color =
    pct >= 80 ? "#10b981" : pct >= 60 ? "#38bdf8" : pct >= 40 ? "#f59e0b" : "#64748b";

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="flex-shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
        className="transition-all duration-700"
      />
      <text
        x="20"
        y="20"
        dominantBaseline="middle"
        textAnchor="middle"
        fill={color}
        fontSize="8"
        fontWeight="700"
      >
        {pct}
      </text>
    </svg>
  );
}

function EvidenceRow({ ev }: { ev: EvidenceEntry }) {
  const config = getEvidenceConfig(ev.evidence_type);
  const { Icon } = config;
  const hasData = ev.confidence > 0;

  return (
    <div className="flex items-start gap-3 py-1.5 px-3 rounded-lg bg-white/[0.02] border border-white/5">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-200">{config.label}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasData && (
              <span className="text-xs text-slate-400">{ev.verification_level}</span>
            )}
            <span
              className={`text-xs font-bold tabular-nums ${hasData ? "text-white" : "text-slate-500"}`}
            >
              {ev.confidence}%
            </span>
          </div>
        </div>
        <div className="w-full h-0.5 rounded-full bg-white/10 mt-1 mb-1">
          <div
            className={`h-full rounded-full transition-all duration-500 ${config.color.replace("text-", "bg-")}`}
            style={{ width: `${ev.confidence}%` }}
          />
        </div>
        {ev.timestamp && (
          <p className="text-xs text-slate-500">
            {new Date(ev.timestamp).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
