import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Copy, Check, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-3xl border border-border/80 bg-card p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold">
            <ShieldCheck className="size-5" />
            <span className="text-xs uppercase tracking-wider font-extrabold">Public-Safe Skill Passport</span>
          </div>
          <DialogTitle className="font-display text-2xl font-bold text-foreground">
            Verifiable Candidate Passport
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            A tamper-evident, recruiter-ready credentials link that strictly excludes all private PII.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Share link box */}
          <div className="rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 flex items-center justify-between gap-3">
            <div className="truncate text-xs font-mono text-foreground font-semibold">
              {shareUrl}
            </div>
            <Button
              onClick={handleCopy}
              size="sm"
              className="rounded-xl font-bold text-xs shrink-0"
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
              <div className="text-right">
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-success text-success-foreground">
                  Verified Active
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

            {/* Verified Projects */}
            {profile?.projects?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Featured Projects ({profile.projects.length})
                </p>
                <div className="space-y-2">
                  {profile.projects.map((pr: any) => (
                    <div key={pr.id} className="text-xs p-2.5 rounded-xl bg-card border border-border/60">
                      <p className="font-bold text-foreground">{pr.title}</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">{pr.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 border-t border-border/40 pt-3">
              <ShieldCheck className="size-3.5 text-success" />
              <span>Zero PII Protection: Phone, email, and private storage keys are redacted.</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
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
      </DialogContent>
    </Dialog>
  );
}
