import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Lock,
  RefreshCw,
  AlertOctagon,
  QrCode,
  Download,
  Search,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiClient } from "@/lib/api-client";

interface SkillPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  passportToken: string | null;
  profile: any;
}

export function SkillPassportModal({
  isOpen,
  onClose,
  passportToken,
  profile,
}: SkillPassportModalProps) {
  const [copied, setCopied] = useState(false);
  const [isReissuing, setIsReissuing] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [skillSearch, setSkillSearch] = useState("");

  const shareUrl = passportToken
    ? `${typeof window !== "undefined" ? window.location.origin : "https://skillbridge.dev"}/passport/${passportToken}`
    : null;

  const handleCopy = () => {
    if (!shareUrl) {
      toast.error("Generate a Skill Passport before sharing it.");
      return;
    }
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Shareable Skill Passport link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReissue = async () => {
    setIsReissuing(true);
    try {
      const res = await ApiClient.reissueSkillPassport();
      toast.success(res.message || "Skill Passport cryptographically re-signed with latest verified skills!");
    } catch {
      toast.error("Failed to re-sign credential.");
    } finally {
      setIsReissuing(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Are you sure you want to revoke this Skill Passport credential? Recruiters will see it as revoked.")) {
      return;
    }
    setIsRevoking(true);
    try {
      const res = await ApiClient.revokeSkillPassport("Revoked by candidate from dashboard");
      toast.success(res.message || "Skill Passport credential revoked.");
    } catch {
      toast.error("Failed to revoke credential.");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleShowQr = () => {
    if (!passportToken || !shareUrl) {
      toast.error("Generate a Skill Passport first.");
      return;
    }
    // Set immediate client-side QR for instant rendering
    const directQr = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(shareUrl)}&margin=10`;
    setQrUrl(directQr);
    setQrOpen(true);

    // Also request server metadata in background if needed
    ApiClient.getPassportQr(passportToken)
      .then((res) => {
        if (res?.qr_code_svg_url) {
          setQrUrl(res.qr_code_svg_url);
        }
      })
      .catch(() => {
        // Fallback to client-generated URL already active
      });
  };

  const handleDownloadQr = async () => {
    if (!qrUrl) return;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `skillbridge-passport-qr-${passportToken?.substring(0, 10) || "code"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("QR Code downloaded successfully!");
    } catch {
      window.open(qrUrl, "_blank");
    }
  };

  const skills = useMemo(() => {
    return (profile?.skill_proof || []).sort(
      (a: any, b: any) => (b.confidence_score || 0) - (a.confidence_score || 0)
    );
  }, [profile?.skill_proof]);

  const filteredSkills = useMemo(() => {
    if (!skillSearch.trim()) return skills;
    const query = skillSearch.toLowerCase();
    return skills.filter((sk: any) =>
      (sk.skill_name || "").toLowerCase().includes(query)
    );
  }, [skills, skillSearch]);

  const initials = useMemo(() => {
    const name = profile?.student?.name || "SC";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [profile?.student?.name]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-4" />
                </div>
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-primary">
                  Skill Passport 2.0
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-bold">
                <Lock className="size-3" /> RS256 Valid
              </span>
            </div>
            <DialogTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
              Verifiable Cryptographic Passport
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A tamper-evident, RS256-signed public credential link that proves your verified skills without exposing private PII.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Share link bar */}
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Share2 className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Public Verification Link
                  </p>
                  <p className="truncate text-xs font-mono font-medium text-foreground">
                    {shareUrl || "Generating credential token..."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 justify-end">
                <Button
                  onClick={handleCopy}
                  size="sm"
                  variant="default"
                  className="rounded-xl font-bold text-xs h-9 px-3 gap-1.5 shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-success-foreground" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowQr}
                  className="rounded-xl font-bold text-xs h-9 px-3 gap-1.5 border-border bg-card hover:bg-accent"
                >
                  <QrCode className="size-3.5 text-primary" /> QR Code
                </Button>
              </div>
            </div>

            {/* Passport Live Preview Card */}
            <div className="rounded-2xl border border-border/80 bg-background/80 p-5 space-y-4 shadow-inner">
              {/* Header Profile Info */}
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-display font-extrabold text-sm">
                    {initials}
                  </div>
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-foreground flex items-center gap-1.5">
                      {profile?.student?.name || "Student Candidate"}
                      <BadgeCheck className="size-4 text-primary fill-primary/10" />
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {profile?.student?.program || "Career Candidate"} {profile?.student?.college ? `· ${profile?.student?.college}` : ""}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Signature Integrity
                  </span>
                  <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Asymmetric RSA
                  </span>
                </div>
              </div>

              {/* Verified Skills Ledger */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Skill Evidence
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold">
                      {skills.length} Registered
                    </span>
                  </div>

                  {skills.length > 8 && (
                    <div className="relative w-full sm:w-48">
                      <Search className="size-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search skills..."
                        value={skillSearch}
                        onChange={(e) => setSkillSearch(e.target.value)}
                        className="w-full h-7 pl-7 pr-2.5 rounded-lg bg-card border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>

                {/* Badges Container with clean scrollbar */}
                <div className="max-h-48 overflow-y-auto pr-1 flex flex-wrap gap-1.5 rounded-xl border border-border/40 bg-card/40 p-2.5 scrollbar-thin">
                  {filteredSkills.length > 0 ? (
                    filteredSkills.map((sk: any) => {
                      const score = sk.confidence_score ?? 0;
                      const isHigh = score >= 70;
                      const isMedium = score >= 40;

                      return (
                        <span
                          key={sk.skill_id || sk.skill_name}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            isHigh
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : isMedium
                              ? "bg-primary/10 border border-primary/25 text-primary"
                              : "bg-muted/60 border border-border/80 text-foreground"
                          }`}
                        >
                          <Sparkles
                            className={`size-3 ${
                              isHigh
                                ? "text-emerald-500"
                                : isMedium
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <span>{sk.skill_name}</span>
                          <span className="opacity-60 text-[10px] font-mono">
                            • {score}%
                          </span>
                        </span>
                      );
                    })
                  ) : (
                    <div className="w-full py-4 text-center text-xs text-muted-foreground">
                      {skillSearch ? "No matching skills found." : "No skill evidence registered yet."}
                    </div>
                  )}
                </div>
              </div>

              {/* Zero PII Protection Notice */}
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 border-t border-border/40 pt-3">
                <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                <span>Zero PII Protection: Phone, email, and private storage keys are strictly redacted from public view.</span>
              </div>
            </div>

            {/* Cryptographic Management Bar */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-border/60">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReissue}
                  disabled={isReissuing}
                  className="rounded-xl text-xs font-bold gap-1.5 border-border bg-card"
                >
                  <RefreshCw className={`size-3.5 ${isReissuing ? "animate-spin" : ""}`} />
                  {isReissuing ? "Re-signing..." : "Re-sign Credential"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevoke}
                  disabled={isRevoking}
                  className="rounded-xl text-xs font-bold gap-1 text-destructive hover:bg-destructive/10"
                >
                  <AlertOctagon className="size-3.5" />
                  {isRevoking ? "Revoking..." : "Revoke"}
                </Button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" onClick={onClose} className="rounded-xl font-bold text-xs h-9 px-4">
                  Close
                </Button>
                <Button
                  onClick={() => shareUrl && window.open(shareUrl, "_blank")}
                  disabled={!shareUrl}
                  className="rounded-xl font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
                >
                  <ExternalLink className="size-3.5" /> Open Public View
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-xs rounded-3xl border border-border/80 bg-card p-6 text-center space-y-4 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="mx-auto size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-1">
              <QrCode className="size-5" />
            </div>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              Passport QR Badge
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Scan with any mobile camera or QR reader to verify RS256 cryptographic authenticity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-md border border-border/40">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="Skill Passport QR Code"
                  className="size-48 object-contain rounded-lg"
                  loading="eager"
                />
              ) : (
                <div className="size-48 flex items-center justify-center text-xs text-muted-foreground">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground truncate px-2 py-1 rounded-lg bg-background border border-border">
                {shareUrl}
              </p>
              
              <div className="flex items-center gap-2 justify-center pt-1">
                <Button
                  onClick={handleDownloadQr}
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold gap-1.5 flex-1 border-border"
                >
                  <Download className="size-3.5" /> Download QR
                </Button>
                <Button
                  onClick={handleCopy}
                  size="sm"
                  variant="default"
                  className="rounded-xl text-xs font-bold gap-1.5 flex-1"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy Link"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
