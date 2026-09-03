import React, { useState, useEffect } from "react";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  GitBranch,
  FileCode,
  FileText,
  BadgeAlert,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface SkillVerificationCenterProps {
  onStartAssessment?: (skillName: string) => void;
}

export function SkillVerificationCenter({ onStartAssessment }: SkillVerificationCenterProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [integrityData, setIntegrityData] = useState<any | null>(null);
  const [powData, setPowData] = useState<any | null>(null);
  const [skillsProof, setSkillsProof] = useState<any[]>([]);

  const loadVerificationData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyRes, proofRes, powRes, integrityRes] = await Promise.allSettled([
        ApiClient.getSkillVerificationHistory(),
        ApiClient.getSkillProof(),
        ApiClient.getProofOfWork(),
        ApiClient.getSkillIntegrity(),
      ]);

      if (historyRes.status === "fulfilled" && historyRes.value?.attempts) {
        setHistory(historyRes.value.attempts);
      }
      if (proofRes.status === "fulfilled" && proofRes.value?.skills) {
        setSkillsProof(proofRes.value.skills);
      }
      if (powRes.status === "fulfilled" && powRes.value?.proof_of_work) {
        setPowData(powRes.value.proof_of_work);
      }
      if (integrityRes.status === "fulfilled" && integrityRes.value) {
        setIntegrityData(integrityRes.value);
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load skill verification records. Please check connectivity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationData();
  }, []);

  // Compute metrics from actual backend data
  const verifiedSkills = skillsProof.filter((s) => s.is_verified || s.verification_level !== "Not Verified");
  const pendingSkills = skillsProof.filter((s) => !s.is_verified && s.verification_level === "Not Verified");

  const avgConfidence = skillsProof.length > 0
    ? Math.round(skillsProof.reduce((acc, s) => acc + (s.confidence_score || 0), 0) / skillsProof.length)
    : 0;

  // Determine overall integrity status from audits
  const audits = integrityData?.audits || [];
  const hasMismatch = audits.some((a: any) => a.status === "EVIDENCE_MISMATCH");
  const overallIntegrity = hasMismatch
    ? "EVIDENCE_MISMATCH"
    : verifiedSkills.length > 0
    ? "VERIFIED"
    : "NOT_VERIFIED";

  // Collect all unique backend recommendations
  const recommendations: string[] = [];
  audits.forEach((a: any) => {
    if (Array.isArray(a.recommendations)) {
      a.recommendations.forEach((r: string) => {
        if (!recommendations.includes(r)) recommendations.push(r);
      });
    }
  });
  if (recommendations.length === 0 && pendingSkills.length > 0) {
    recommendations.push(`Complete adaptive verification for claimed skill: ${pendingSkills[0]?.skill_name || "your top skill"}`);
  }
  if (!powData?.has_proof_of_work) {
    recommendations.push("Connect GitHub to automatically verify code commit quality & framework usage.");
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-soft animate-pulse space-y-6">
        <div className="h-6 w-48 bg-muted rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
        </div>
        <div className="h-48 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-soft">
        <AlertTriangle className="size-10 text-destructive mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground">Failed to Load Verification Center</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
        <Button size="sm" onClick={loadVerificationData} className="rounded-xl font-bold">
          <RefreshCw className="size-3.5 mr-1.5" />
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-2">
              <ShieldCheck className="size-3.5" />
              Skill Verification Center 2.0
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Proof-of-Skill Integrity & Evidence Hub
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Empirical multi-factor skill verification powered by automated code quality analysis,
              deterministic technical assessments, and anti-fraud evidence mismatch detection.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadVerificationData}
              className="rounded-xl font-bold text-xs"
            >
              <RefreshCw className="size-3.5 mr-1.5" />
              Refresh
            </Button>
            {pendingSkills.length > 0 && onStartAssessment && (
              <Button
                size="sm"
                onClick={() => onStartAssessment(pendingSkills[0]?.skill_name)}
                className="rounded-xl font-bold text-xs bg-primary text-primary-foreground shadow-sm"
              >
                <Award className="size-3.5 mr-1.5" />
                Verify {pendingSkills[0]?.skill_name}
              </Button>
            )}
          </div>
        </div>

        {/* 3 Core Metric KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-3 mt-6 pt-6 border-t border-border/60">
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Overall Verification Status</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold tracking-wide uppercase ${
                  overallIntegrity === "VERIFIED"
                    ? "bg-success-soft text-success border border-success/30"
                    : overallIntegrity === "EVIDENCE_MISMATCH"
                    ? "bg-warning-soft text-warning-foreground border border-warning/30"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {overallIntegrity === "VERIFIED" && <CheckCircle2 className="size-3.5" />}
                {overallIntegrity === "EVIDENCE_MISMATCH" && <BadgeAlert className="size-3.5" />}
                {overallIntegrity}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {overallIntegrity === "VERIFIED"
                ? "Skills verified with empirical multi-factor evidence."
                : overallIntegrity === "EVIDENCE_MISMATCH"
                ? "Self-declared claims diverge from empirical testing. See feedback below."
                : "No assessments completed yet. Take an assessment to earn verified status."}
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/50 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Composite Evidence Score</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-3xl font-extrabold text-foreground">
                {avgConfidence}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">/ 100</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, avgConfidence))}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Weighted across assessments, projects, PoW, and credentials.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/50 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Verified vs Claimed</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-3xl font-extrabold text-success">
                {verifiedSkills.length}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                verified of {skillsProof.length} claimed
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {pendingSkills.length > 0
                ? `${pendingSkills.length} skill(s) pending empirical assessment.`
                : "All claimed skills have verified evidence."}
            </p>
          </div>
        </div>
      </div>

      {/* Actionable Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-3xl border border-primary/20 bg-primary-soft/15 p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-5 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">
              Evidence Integrity Recommendations
            </h3>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-xl border border-primary/10 bg-background/80 p-3 text-xs text-foreground"
              >
                <ArrowRight className="size-3.5 mt-0.5 text-primary shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills Breakdown: Verified & Pending */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verified Skills */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" />
              <h3 className="font-display text-base font-bold text-foreground">Verified Skills</h3>
            </div>
            <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success">
              {verifiedSkills.length} Active
            </span>
          </div>

          {verifiedSkills.length > 0 ? (
            <div className="space-y-3">
              {verifiedSkills.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/60 bg-background/50 p-4 transition-all hover:border-success/40"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">{s.skill_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Level: <strong className="text-foreground">{s.verification_level}</strong> · Confidence: {s.confidence_score}%
                      </p>
                    </div>
                    <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-extrabold text-success">
                      Score: {s.confidence_score}%
                    </span>
                  </div>

                  {/* Signal Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border/50">
                    {s.evidence?.has_assessment && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        <Award className="size-2.5 text-primary" /> Assessment Verified
                      </span>
                    )}
                    {s.evidence?.has_github && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        <GitBranch className="size-2.5 text-accent" /> Code Evidence
                      </span>
                    )}
                    {s.evidence?.has_project && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        <Layers className="size-2.5 text-info" /> Project Portfolio
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No skills verified yet.</p>
              <p className="text-[11px] mt-1">Take an assessment below to earn your first verified skill badge.</p>
            </div>
          )}
        </div>

        {/* Pending Verification */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-warning-foreground" />
              <h3 className="font-display text-base font-bold text-foreground">Pending Verification</h3>
            </div>
            <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-bold text-warning-foreground">
              {pendingSkills.length} Claimed
            </span>
          </div>

          {pendingSkills.length > 0 ? (
            <div className="space-y-3">
              {pendingSkills.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/60 bg-background/50 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">{s.skill_name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Self-declared claim · Needs empirical test
                    </p>
                  </div>
                  {onStartAssessment && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStartAssessment(s.skill_name)}
                      className="rounded-xl font-bold text-xs"
                    >
                      Start Assessment
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="size-8 mx-auto mb-2 text-success opacity-60" />
              <p className="text-xs font-semibold">All skills are verified!</p>
              <p className="text-[11px] mt-1">You have zero unverified skill claims.</p>
            </div>
          )}
        </div>
      </div>

      {/* Verification History Log */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
        <h3 className="font-display text-base font-bold text-foreground mb-1">
          Verification History & Audit Log
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Chronological record of all technical assessment attempts and deterministic evaluations.
        </p>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="pb-3 pr-4">Skill</th>
                  <th className="pb-3 pr-4">Score</th>
                  <th className="pb-3 pr-4">Level</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Attempt #</th>
                  <th className="pb-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="py-3 pr-4 font-bold text-foreground">{h.skill_name}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded font-extrabold text-[11px] ${
                          h.passed ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {Math.round(h.score)}%
                      </span>
                    </td>
                    <td className="py-3 pr-4 capitalize">{h.verified_level || "Not Verified"}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          h.status === "completed"
                            ? "bg-success-soft text-success"
                            : h.status === "expired"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning-soft text-warning-foreground"
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{h.attempt_number}</td>
                    <td className="py-3 text-muted-foreground">
                      {h.started_at ? new Date(h.started_at).toLocaleDateString() : "Recent"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-xs">
            No assessment history logged yet.
          </div>
        )}
      </div>
    </div>
  );
}
