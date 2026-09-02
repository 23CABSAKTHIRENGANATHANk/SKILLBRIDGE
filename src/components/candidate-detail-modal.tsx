import {
  X,
  ExternalLink,
  Download,
  Mail,
  Phone,
  MapPin,
  FileText,
  Award,
  Video,
  Calendar,
  CheckCircle2,
  BadgeCheck,
  ShieldCheck,
  Star,
  Send,
  Sparkles,
} from "lucide-react";
import type { Candidate } from "@/types/skillbridge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { ApiClient } from "@/lib/api-client";

export function CandidateDetailModal({
  candidate,
  note,
  onNoteChange,
  onClose,
  onUpdateStage,
}: {
  candidate: Candidate;
  note: string;
  onNoteChange?: (note: string) => void;
  onClose: () => void;
  onUpdateStage?: (appId: string, stage: string, name: string) => void;
}) {
  const roleFitScore =
    candidate.roleFitScore ?? candidate.match?.role_fit_score ?? candidate.match?.score ?? null;
  const fitLevel =
    candidate.match?.fit_level || (roleFitScore === null ? "Not assessed" : roleFitScore >= 85 ? "Strong Fit" : "Moderate Fit");

  // Recruiter Endorsement State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Interview Scheduling State
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [interviewDateTime, setInterviewDateTime] = useState("");
  const [interviewMeetingLink, setInterviewMeetingLink] = useState(
    "https://meet.google.com/skillbridge-interview",
  );
  const [interviewNotes, setInterviewNotes] = useState(
    "Live technical screening on core role requirements.",
  );
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      toast.error("Please write a brief endorsement note.");
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      await ApiClient.submitFeedback({
        application_id: candidate.appId || candidate.id,
        rating: feedbackRating,
        review_text: feedbackText.trim(),
      });
      setFeedbackSubmitted(true);
      toast.success(
        `Endorsement for ${candidate.name} submitted and visible on their trust profile!`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Candidate endorsement could not be saved.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!interviewDateTime) {
      toast.error("Please select a date and time for the interview.");
      return;
    }
    setIsScheduling(true);
    try {
      await ApiClient.scheduleInterview({
        application_id: candidate.appId || candidate.id,
        scheduled_at: interviewDateTime,
        meeting_link: interviewMeetingLink,
        notes: interviewNotes,
      });
      toast.success(`Interview invitation scheduled for ${candidate.name}!`);
      setShowScheduleForm(false);
      onUpdateStage?.(candidate.appId || candidate.id, "interview", candidate.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Interview could not be scheduled.");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/80 bg-card p-8 shadow-xl"
        style={{ animation: "sb-scale-in 200ms ease-out both" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-2 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close modal"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-border/60">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-foreground">
            {candidate.avatarUrl ? (
              <img src={candidate.avatarUrl} alt="" className="size-16 rounded-2xl object-cover" />
            ) : (
              <span className="text-2xl font-bold">
                {candidate.name?.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-2xl font-bold text-foreground">{candidate.name}</h2>
              {/* Student Identity & Academic Trust Badge */}
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-success-soft text-success px-2 py-0.5 rounded-full">
                <BadgeCheck className="size-3" /> Verified Academic
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {candidate.college} · Batch of {candidate.graduationYear}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  fitLevel.includes("Strong")
                    ? "bg-success-soft text-success"
                    : "bg-warning-soft text-warning-foreground"
                }`}
              >
                {fitLevel}
              </span>
              <span className="text-xs font-bold bg-primary-soft text-primary px-2.5 py-0.5 rounded-full">
                Role Fit: {roleFitScore === null ? "Not assessed" : `${roleFitScore}%`}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  candidate.stage === "applied"
                    ? "bg-primary-soft text-primary"
                    : candidate.stage === "shortlisted"
                      ? "bg-accent-soft text-accent"
                      : candidate.stage === "interview"
                        ? "bg-warning-soft text-warning-foreground"
                        : "bg-success-soft text-success"
                }`}
              >
                {candidate.stage.charAt(0).toUpperCase() + candidate.stage.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Trust Indicators Row */}
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft/30 px-3 py-1.5 text-xs font-bold text-success">
            <ShieldCheck className="size-3.5" /> Identity Verified
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft/30 px-3 py-1.5 text-xs font-bold text-success">
            <BadgeCheck className="size-3.5" /> Email Confirmed
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft/30 px-3 py-1.5 text-xs font-bold text-success">
            <FileText className="size-3.5" /> Resume Verified
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft/30 px-3 py-1.5 text-xs font-bold text-success">
            <Phone className="size-3.5" /> Phone Verified
          </span>
        </div>

        {/* Contact & Links */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <a
            href={`mailto:${candidate.id}@skillbridge.dev`}
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-3 hover:bg-background/70 transition-colors"
          >
            <Mail className="size-4 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Email</p>
              <p className="text-xs font-bold text-foreground truncate">student@skillbridge.dev</p>
            </div>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-3 hover:bg-background/70 transition-colors"
          >
            <Phone className="size-4 text-accent" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Phone (Verified)</p>
              <p className="text-xs font-bold text-foreground">+91 98765 43210</p>
            </div>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-3 hover:bg-background/70 transition-colors"
          >
            <MapPin className="size-4 text-warning-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Location</p>
              <p className="text-xs font-bold text-foreground truncate">
                {candidate.location || "Not provided"}
              </p>
            </div>
          </a>
          <a
            href={ApiClient.getApiUrl(`/student/resume/download/${candidate.id}`)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-3 hover:bg-background/70 transition-colors"
          >
            <FileText className="size-4 text-success" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Secure Resume</p>
              <p className="text-xs font-bold text-primary">Download PDF</p>
            </div>
          </a>
        </div>

        {/* Skills */}
        <div className="mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Verified Skills</p>
          <div className="flex flex-wrap gap-2">
            {candidate.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-secondary/60 px-2.5 py-1 text-xs font-medium text-secondary-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Experience */}
        {candidate.experience && (
          <div className="mb-6 rounded-2xl border border-border/70 bg-background/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="size-4 text-primary" />
              <p className="text-sm font-bold text-foreground">Experience</p>
            </div>
            <p className="text-sm text-muted-foreground">{candidate.experience}</p>
          </div>
        )}

        {/* Match Strengths */}
        {candidate.match?.strengths && (
          <div className="mb-6 rounded-2xl border border-border/70 bg-background/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="size-4 text-success" />
              <p className="text-sm font-bold text-foreground">Strengths</p>
            </div>
            <ul className="space-y-1">
              {candidate.match.strengths.map((strength, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="inline-block size-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Proof-of-Skill Fit Matrix */}
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary-soft/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="text-sm font-bold text-foreground">AI Proof-of-Skill Breakdown</p>
            </div>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
              {candidate.match?.verified_confidence === undefined ? "Not assessed" : `${candidate.match.verified_confidence}% Confidence`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-card border border-border/60">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Skill Fit</p>
              <p className="text-base font-extrabold text-foreground">{candidate.match?.skill_fit === undefined ? "Not assessed" : `${candidate.match.skill_fit}%`}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border/60">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Exp Fit</p>
              <p className="text-base font-extrabold text-foreground">{candidate.match?.experience_fit === undefined ? "Not assessed" : `${candidate.match.experience_fit}%`}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border/60">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Edu Fit</p>
              <p className="text-base font-extrabold text-foreground">{candidate.match?.education_fit || 100}%</p>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border/60">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Location</p>
              <p className="text-base font-extrabold text-foreground">{candidate.match?.location_fit === undefined ? "Not assessed" : `${candidate.match.location_fit}%`}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>Why this match: </strong>
            {candidate.match?.explanation || "Candidate demonstrates solid technical alignment with demonstrated competency in key requirements."}
          </p>
        </div>

        {/* Recruiter Endorsement */}
        <div className="mb-6 rounded-2xl border border-accent/30 bg-accent-soft/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="size-4 text-accent" />
            <p className="text-sm font-bold text-foreground">Submit Recruiter Endorsement</p>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Your verified endorsement will appear on the candidate's public trust profile and
            improve their hiring chances platform-wide.
          </p>

          {feedbackSubmitted ? (
            <div className="flex items-center gap-2 text-success text-sm font-bold py-2">
              <CheckCircle2 className="size-5" />
              Endorsement submitted and published to trust profile!
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-3">
              {/* Star Rating */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-muted-foreground mr-2">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className={`text-lg transition-colors ${star <= feedbackRating ? "text-warning-foreground" : "text-muted-foreground/40"}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g. Strong React fundamentals, excellent communication, collaborative approach..."
                className="min-h-[80px] rounded-xl border-border bg-background text-xs"
              />
              <Button
                type="submit"
                disabled={isSubmittingFeedback || !feedbackText.trim()}
                size="sm"
                className="rounded-xl font-bold"
              >
                <Send className="size-3.5 mr-1.5" />
                {isSubmittingFeedback ? "Submitting..." : "Submit Endorsement"}
              </Button>
            </form>
          )}
        </div>

        {/* Recruiter Note */}
        <div className="mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
            Your Private Hiring Notes
          </p>
          <Textarea
            value={note}
            onChange={(e) => onNoteChange?.(e.target.value)}
            placeholder="Add assessment notes, interview impressions, or follow-up reminders..."
            className="min-h-[100px] rounded-xl border-border bg-background"
          />
        </div>

        {/* Interactive Interview Scheduling Panel */}
        {showScheduleForm && (
          <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Video className="size-4" />
                <span>Schedule Live Technical Interview</span>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Interview Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={interviewDateTime}
                  onChange={(e) => setInterviewDateTime(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Meeting URL (Google Meet / Zoom)
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={interviewMeetingLink}
                  onChange={(e) => setInterviewMeetingLink(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Agenda / Preparation Notes
              </label>
              <input
                type="text"
                placeholder="e.g. 45-min React pairing session & system design overview"
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground"
              />
            </div>

            <Button
              onClick={handleConfirmSchedule}
              disabled={isScheduling || !interviewDateTime}
              className="w-full rounded-xl font-bold text-xs gap-2"
            >
              <Calendar className="size-3.5" />
              {isScheduling ? "Scheduling..." : "Confirm & Send Interview Invitation"}
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {candidate.stage === "applied" && (
            <Button
              onClick={() =>
                onUpdateStage?.(candidate.appId || candidate.id, "shortlisted", candidate.name)
              }
              className="rounded-xl font-bold flex items-center gap-2 flex-1"
            >
              <CheckCircle2 className="size-4" /> Mark Shortlisted
            </Button>
          )}
          {(candidate.stage === "applied" || candidate.stage === "shortlisted") && (
            <Button
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              variant={showScheduleForm ? "secondary" : "outline"}
              className="rounded-xl font-bold flex items-center gap-2 flex-1"
            >
              <Video className="size-4" />{" "}
              {showScheduleForm ? "Close Scheduler" : "Schedule Interview"}
            </Button>
          )}
          {candidate.stage === "interview" && (
            <Button
              onClick={() =>
                onUpdateStage?.(candidate.appId || candidate.id, "offer", candidate.name)
              }
              className="rounded-xl font-bold flex items-center gap-2 flex-1 bg-success hover:bg-success/90 text-success-foreground"
            >
              <Award className="size-4" /> Send Offer
            </Button>
          )}
          <Button onClick={onClose} variant="outline" className="rounded-xl font-bold flex-1">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
