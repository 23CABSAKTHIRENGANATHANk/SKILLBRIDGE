import { useState } from "react";
import { ShieldCheck, ShieldAlert, Shield, ChevronDown, ChevronUp } from "lucide-react";
import type { SkillTrustScore, TrustBreakdownItem } from "@/lib/api-client";

interface SkillTrustBadgeProps {
  trustScore: SkillTrustScore;
  compact?: boolean;
}

const CONFIDENCE_CONFIG = {
  very_high: {
    label: "Very High",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    bar: "bg-emerald-500",
    Icon: ShieldCheck,
  },
  high: {
    label: "High",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/30",
    bar: "bg-sky-500",
    Icon: ShieldCheck,
  },
  medium: {
    label: "Medium",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    bar: "bg-amber-500",
    Icon: Shield,
  },
  low: {
    label: "Low",
    color: "text-slate-400",
    bg: "bg-slate-500/10 border-slate-500/30",
    bar: "bg-slate-500",
    Icon: ShieldAlert,
  },
} as const;

const FACTOR_LABELS: Record<string, string> = {
  skill_verification: "Skill Verification (4-Stage)",
  assessment: "Quick Assessment",
  proof_of_work: "GitHub Proof-of-Work",
  project_evidence: "Project Evidence",
  ai_interview: "AI Adaptive Interview",
  resume_evidence: "Resume Detection",
  github_evidence: "GitHub Language Match",
  self_declared: "Self-Declaration",
};

export function SkillTrustBadge({ trustScore, compact = false }: SkillTrustBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const config = CONFIDENCE_CONFIG[trustScore.confidence] ?? CONFIDENCE_CONFIG.low;
  const { Icon } = config;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${config.bg} ${config.color}`}
        title={`Trust Score: ${trustScore.trust_score}% (${config.label})`}
      >
        <Icon className="w-3 h-3" />
        {trustScore.trust_score}%
      </span>
    );
  }

  return (
    <div className={`rounded-xl border ${config.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        aria-expanded={expanded}
        aria-label={`Trust score for ${trustScore.skill_name}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className="text-sm font-semibold text-white">{trustScore.skill_name}</span>
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Score bar */}
            <div className="w-20 h-1.5 rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-700 ${config.bar}`}
                style={{ width: `${trustScore.trust_score}%` }}
              />
            </div>
            <span className={`text-sm font-bold tabular-nums ${config.color}`}>
              {trustScore.trust_score}%
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Breakdown */}
      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-2">
          <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wider">
            Evidence Breakdown — What backs this score?
          </p>
          {trustScore.breakdown.map((item: TrustBreakdownItem) => (
            <BreakdownRow key={item.factor} item={item} barColor={config.bar} />
          ))}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Trust Score is an explainability metric only — not a hiring decision.
            </span>
            <span className={`text-sm font-bold ${config.color}`}>
              {trustScore.trust_score} / 100
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function BreakdownRow({ item, barColor }: { item: TrustBreakdownItem; barColor: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.present ? barColor : "bg-slate-600"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-xs font-medium text-slate-200 truncate">
            {FACTOR_LABELS[item.factor] ?? item.factor}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-400">{item.weight}% weight</span>
            <span className={`text-xs font-bold tabular-nums ${item.present ? "text-white" : "text-slate-500"}`}>
              {item.score}%
            </span>
          </div>
        </div>
        <div className="w-full h-1 rounded-full bg-white/10 mb-1">
          <div
            className={`h-full rounded-full transition-all duration-500 ${item.present ? barColor : "bg-slate-700"}`}
            style={{ width: `${item.score}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 truncate">{item.detail}</p>
      </div>
    </div>
  );
}
