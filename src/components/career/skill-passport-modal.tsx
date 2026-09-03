import { useState } from "react";
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

  const shareUrl = passportToken
    ? `${window.location.origin}/passport/${passportToken}`
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

  const handleShowQr = async () => {
    if (!passportToken) return;
    setQrOpen(true);
    if (!qrUrl) {
      try {
        const res = await ApiClient.getPassportQr(passportToken);
        setQrUrl(res.qr_code_svg_url);
      } catch {
        toast.error("Failed to load QR code.");
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl rounded-3xl border border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-bold">
              <ShieldCheck className="size-5" />
              <span className="text-xs uppercase tracking-wider font-extrabold">Skill Passport 2.0</span>
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-foreground">
              Verifiable Cryptographic Passport
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A tamper-evident, RS256-signed credential link that strictly excludes all private PII.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Share link box */}
            <div className="rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="truncate text-xs font-mono text-foreground font-semibold">
                {shareUrl || "Generating credential token..."}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handleCopy}
                  size="sm"
                  className="rounded-xl font-bold text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 mr-1" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 mr-1" /> Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowQr}
                  className="rounded-xl font-bold text-xs gap-1 border-border"
                >
                  <QrCode className="size-3.5" /> QR
                </Button>
              </div>
            </div>

            {/* Passport Live Preview Card */}
            <div className="rounded-2xl border border-border/80 bg-background/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-1.5">
                    {profile?.student?.name || "Student Candidate"}
                    <BadgeCheck className="size-4 text-primary" />
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {profile?.student?.program} · {profile?.student?.college}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                    <Lock className="size-3" /> RS256 Valid
                  </span>
                </div>
              </div>

              {/* Verified Skills */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Skill Evidence ({profile?.skill_proof?.length || 0})
                </p>
                <div className="flex flex-wrap gap-2">
                  {(profile?.skill_proof || []).map((sk: any) => (
                    <span
                      key={sk.skill_id}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-card border border-border/80 text-xs font-bold text-foreground"
                    >
                      <Sparkles className="size-3 text-primary" />
                      {sk.skill_name} · {sk.confidence_score}%
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 border-t border-border/40 pt-3">
                <ShieldCheck className="size-3.5 text-success" />
                <span>Zero PII Protection: Phone, email, and private storage keys are strictly redacted.</span>
              </div>
            </div>

            {/* Cryptographic Management Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReissue}
                  disabled={isReissuing}
                  className="rounded-xl text-xs font-bold gap-1 border-border"
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

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose} className="rounded-xl font-bold text-xs">
                  Close
                </Button>
                <Button
                  onClick={() => shareUrl && window.open(shareUrl, "_blank")}
                  disabled={!shareUrl}
                  className="rounded-xl font-bold text-xs"
                >
                  <ExternalLink className="size-3.5 mr-1" /> Open Public View
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-xs rounded-3xl border border-border/80 bg-card p-6 text-center space-y-4 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">Passport QR Badge</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Scan to verify credentials directly on the public SkillBridge authority.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-white rounded-2xl inline-block mx-auto">
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code" className="size-44" />
            ) : (
              <div className="size-44 flex items-center justify-center text-xs text-muted-foreground">
                Loading QR...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
