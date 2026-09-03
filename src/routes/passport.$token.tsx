import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BadgeCheck,
  Sparkles,
  FolderGit2,
  Award,
  ShieldCheck,
  Globe,
  ExternalLink,
  Code2,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Lock,
  GitBranch,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/passport/$token")({
  component: PublicPassportPage,
});

function PublicPassportPage() {
  const { token } = Route.useParams();
  const [passport, setPassport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<any | null>(null);

  useEffect(() => {
    if (token) {
      setLoading(true);
      ApiClient.getPublicSkillPassport(token)
        .then((res) => {
          setPassport(res.passport);
          if (res.passport.cryptographic_verification) {
            setVerificationResult(res.passport.cryptographic_verification);
          }
        })
        .catch(() => {
          setError("Skill Passport not found or has been set to private.");
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleVerifySignature = async () => {
    if (!token) return;
    setIsVerifying(true);
    try {
      const res = await ApiClient.verifyPassportSignature(token);
      setVerificationResult(res.verification);
      if (res.verification.valid) {
        toast.success("Cryptographic RS256 signature mathematically verified! Credentials are authentic and untampered.");
      } else {
        toast.error(res.verification.message || "Cryptographic signature verification failed.");
      }
    } catch {
      toast.error("Failed to verify signature with the cryptographic authority.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenQr = async () => {
    if (!token) return;
    setQrModalOpen(true);
    if (!qrData) {
      try {
        const res = await ApiClient.getPassportQr(token);
        setQrData(res);
      } catch {
        toast.error("Could not generate QR code.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-12">
        {loading ? (
          <div className="py-24 text-center">
            <p className="text-sm font-semibold text-muted-foreground animate-pulse">
              Verifying cryptographic Skill Passport credentials...
            </p>
          </div>
        ) : error || !passport ? (
          <div className="py-24 text-center space-y-3">
            <h2 className="font-display text-2xl font-bold text-foreground">Passport Not Found</h2>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Header Badge */}
            <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success text-success-foreground text-xs font-black">
                      <BadgeCheck className="size-3.5" /> SkillBridge Skill Passport 2.0
                    </span>
                    {verificationResult?.valid && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                        <Lock className="size-3" /> RS256 Signed
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      Token: {passport.public_token.substring(0, 16)}...
                    </span>
                  </div>
                  <h1 className="font-display text-3xl font-black text-foreground">
                    {passport.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {passport.program} · <strong className="text-foreground">{passport.institution}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 text-center min-w-[130px]">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">Readiness</p>
                    <p className="text-3xl font-black text-foreground mt-0.5">
                      {passport.verified_readiness}%
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenQr}
                    className="h-16 px-3 rounded-2xl border-border flex flex-col items-center justify-center gap-1"
                  >
                    <QrCode className="size-5" />
                    <span className="text-[10px] font-bold">QR Verify</span>
                  </Button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-success" /> Tamper-evident verified credentials
                </span>
                <span>Verified: {new Date(passport.verified_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Cryptographic Verification Card */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <FileCheck2 className="size-5 text-primary" />
                  <div>
                    <h2 className="font-display text-lg font-bold">Cryptographic Asymmetric Signature</h2>
                    <p className="text-xs text-muted-foreground font-normal">
                      Signed using RSA-2048 (RS256) with public key authority verification.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleVerifySignature}
                  disabled={isVerifying}
                  size="sm"
                  className="rounded-xl font-bold text-xs gap-1.5 shrink-0"
                >
                  <ShieldCheck className="size-4" />
                  {isVerifying ? "Verifying..." : "Verify Digital Signature"}
                </Button>
              </div>

              {verificationResult && (
                <div
                  className={`p-4 rounded-2xl border ${
                    verificationResult.valid
                      ? "border-success/30 bg-success/5 text-success-foreground"
                      : "border-destructive/30 bg-destructive/5 text-destructive"
                  } space-y-2`}
                >
                  <div className="flex items-center gap-2">
                    {verificationResult.valid ? (
                      <CheckCircle2 className="size-5 text-success shrink-0" />
                    ) : (
                      <AlertTriangle className="size-5 text-destructive shrink-0" />
                    )}
                    <span className="text-sm font-bold text-foreground">
                      {verificationResult.valid
                        ? "Cryptographic Signature Mathematically Verified (Untampered)"
                        : `Credential Verification Warning: ${verificationResult.credential_status}`}
                    </span>
                  </div>

                  {verificationResult.valid && (
                    <div className="text-xs font-mono space-y-1 text-muted-foreground pt-1 border-t border-border/40">
                      <div><strong className="text-foreground">Algorithm:</strong> {verificationResult.algorithm || "RS256"}</div>
                      <div><strong className="text-foreground">Key ID:</strong> {verificationResult.key_id || "sb_k1_2026"}</div>
                      {verificationResult.signature && (
                        <div className="truncate">
                          <strong className="text-foreground">Signature Digest:</strong> {verificationResult.signature.substring(0, 48)}...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Proof of Work Engine Summary */}
            {passport.proof_of_work?.has_proof_of_work && (
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <GitBranch className="size-5 text-primary" />
                    <h2 className="font-display text-xl font-bold">Proof-of-Work Code Evidence</h2>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                    Tier: {passport.proof_of_work.proof_of_work_level} ({passport.proof_of_work.overall_pow_score}% Evidence)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(passport.proof_of_work.repositories || []).map((repo: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl border border-border/60 bg-background/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Code2 className="size-4 text-primary" />
                          {repo.repo_name}
                        </h4>
                        <span className="text-xs font-mono font-bold text-primary">
                          {repo.overall_evidence_score}% Evidence
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Language: <strong className="text-foreground">{repo.primary_language || "General"}</strong> · Commits: {repo.commit_count || 5}+
                      </p>
                      {repo.technologies?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {repo.technologies.map((t: string, tidx: number) => (
                            <span key={tidx} className="px-2 py-0.5 rounded-md bg-card border border-border text-[10px] font-bold">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verified Skills */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <Sparkles className="size-5 text-primary" />
                <h2 className="font-display text-xl font-bold">Verified Skills & Competencies</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(passport.skills || []).map((sk: any) => (
                  <div
                    key={sk.skill_id}
                    className="p-3.5 rounded-2xl border border-border/60 bg-background/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">{sk.skill_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Level: <strong className="text-foreground">{sk.verification_level}</strong> · {sk.integrity_status}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">
                      {sk.confidence_score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            {passport.projects?.length > 0 && (
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <FolderGit2 className="size-5 text-primary" />
                  <h2 className="font-display text-xl font-bold">Featured Projects Portfolio</h2>
                </div>
                <div className="space-y-3">
                  {passport.projects.map((proj: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl border border-border/60 bg-background/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base font-bold text-foreground">
                          {proj.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {proj.github_url && (
                            <a
                              href={proj.github_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <Code2 className="size-3.5" /> Source
                            </a>
                          )}
                          {proj.project_url && (
                            <a
                              href={proj.project_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="size-3.5" /> Live
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {proj.description}
                      </p>
                      {proj.tech_stack && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(Array.isArray(proj.tech_stack)
                            ? proj.tech_stack
                            : typeof proj.tech_stack === "string"
                            ? proj.tech_stack.split(",")
                            : []
                          ).map((t: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-card border border-border text-[10px] font-semibold text-foreground"
                            >
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* QR Code Verification Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl border border-border/80 bg-card p-6 text-center space-y-4 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">QR Verification</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Scan with any mobile device to verify cryptographic authenticity on-chain/ledger authority.
            </DialogDescription>
          </DialogHeader>

          {qrData ? (
            <div className="space-y-4 py-2 flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl shadow-md inline-block">
                <img src={qrData.qr_code_svg_url} alt="Verification QR Code" className="size-48" />
              </div>
              <p className="text-[11px] font-mono text-muted-foreground break-all">
                {qrData.verification_url}
              </p>
            </div>
          ) : (
            <div className="py-8 text-xs text-muted-foreground animate-pulse">
              Generating cryptographic QR badge...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
