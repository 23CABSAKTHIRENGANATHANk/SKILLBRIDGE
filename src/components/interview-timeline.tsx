import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Phone,
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  Copy,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface Interview {
  id: string;
  jobTitle: string;
  company: string;
  companyLogo?: string;
  scheduledAt: Date;
  duration: number; // in minutes
  interviewer: {
    name: string;
    role: string;
    email: string;
  };
  type: "phone" | "video" | "in-person";
  location?: string;
  meetingLink?: string;
  status: "scheduled" | "completed" | "cancelled" | "in-progress";
  notes?: string;
  feedback?: string;
  feedbackScore?: number;
}

export function InterviewTimeline({ interviews: initialInterviews }: { interviews: Interview[] }) {
  const [interviews, setInterviews] = useState(initialInterviews);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedInterviews = [...interviews].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );

  const upcomingInterviews = sortedInterviews.filter((i) =>
    ["scheduled", "in-progress"].includes(i.status),
  );
  const pastInterviews = sortedInterviews.filter((i) =>
    ["completed", "cancelled"].includes(i.status),
  );

  const handleCopyMeetingLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Meeting link copied to clipboard!");
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const defaultBadge = {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      icon: Calendar,
    };
    const badges: Record<
      string,
      { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
    > = {
      scheduled: defaultBadge,
      "in-progress": { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", icon: Clock },
      completed: { bg: "bg-green-50 border-green-200", text: "text-green-700", icon: CheckCircle2 },
      cancelled: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: AlertCircle },
    };
    const badge = badges[status] ?? defaultBadge;
    const Icon = badge.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text}`}
      >
        <Icon className="size-3" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Scheduled"}
      </span>
    );
  };

  const InterviewCard = ({ interview }: { interview: Interview }) => {
    const isExpanded = expandedId === interview.id;
    const TypeIcon =
      interview.type === "video" ? Video : interview.type === "phone" ? Phone : MapPin;

    return (
      <div
        key={interview.id}
        className="rounded-2xl border border-border/70 bg-card overflow-hidden hover:shadow-md transition-all"
      >
        <button
          onClick={() => setExpandedId(isExpanded ? null : interview.id)}
          className="w-full p-4 text-left hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
              {interview.companyLogo ? (
                <img
                  src={interview.companyLogo}
                  alt={interview.company}
                  className="size-12 rounded-lg object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-secondary-foreground">
                  {interview.company.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground">{interview.jobTitle}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{interview.company}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" />
                  {formatDate(new Date(interview.scheduledAt))}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatTime(new Date(interview.scheduledAt))}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <TypeIcon className="size-3" />
                  {interview.type.charAt(0).toUpperCase() + interview.type.slice(1)}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              {getStatusBadge(interview.status)}
              {isExpanded ? (
                <Circle className="size-5 text-muted-foreground" />
              ) : (
                <Circle className="size-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border/60 p-4 space-y-4 bg-background/50">
            {/* Interviewer Info */}
            <div className="rounded-xl border border-border/70 bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Interviewer</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                  {(interview.interviewer?.name?.split(" ")?.[0]?.[0] || "I").toUpperCase()}
                  {(interview.interviewer?.name?.split(" ")?.[1]?.[0] || "").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {interview.interviewer?.name || "Interviewer"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {interview.interviewer?.role || "Hiring Team"}
                  </p>
                </div>
              </div>
              <a
                href={`mailto:${interview.interviewer.email}`}
                className="mt-2 text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <Phone className="size-3" />
                {interview.interviewer.email}
              </a>
            </div>

            {/* Interview Details */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/70 bg-background p-2">
                <p className="text-[10px] font-semibold text-muted-foreground">Date & Time</p>
                <p className="text-xs font-bold text-foreground mt-1">
                  {formatDate(new Date(interview.scheduledAt))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(new Date(interview.scheduledAt))}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background p-2">
                <p className="text-[10px] font-semibold text-muted-foreground">Duration</p>
                <p className="text-xs font-bold text-foreground mt-1">
                  {interview.duration} minutes
                </p>
              </div>
            </div>

            {/* Meeting Link (for video interviews) */}
            {interview.type === "video" && interview.meetingLink && (
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Video Meeting Link
                </p>
                <div className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2">
                  <code className="text-xs text-foreground font-mono flex-1 truncate">
                    {interview.meetingLink}
                  </code>
                  <button
                    onClick={() => handleCopyMeetingLink(interview.meetingLink!)}
                    className="p-1 rounded hover:bg-secondary/50 transition-colors"
                  >
                    <Copy className="size-4 text-primary" />
                  </button>
                </div>
                {interview.status === "scheduled" && (
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block"
                  >
                    <Button size="sm" className="rounded-lg text-xs font-bold w-full">
                      <Video className="size-3 mr-1" />
                      Join Meeting
                    </Button>
                  </a>
                )}
              </div>
            )}

            {/* Location (for in-person interviews) */}
            {interview.type === "in-person" && interview.location && (
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="size-3" />
                  Location
                </p>
                <p className="text-sm text-foreground font-semibold">{interview.location}</p>
              </div>
            )}

            {/* Notes */}
            {interview.notes && (
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                  <FileText className="size-3" />
                  Notes
                </p>
                <p className="text-xs text-muted-foreground">{interview.notes}</p>
              </div>
            )}

            {/* Feedback (for completed interviews) */}
            {interview.status === "completed" && interview.feedback && (
              <div className="rounded-xl border border-success/30 bg-success-soft/20 p-3">
                <p className="text-xs font-semibold text-success flex items-center gap-1 mb-2">
                  <CheckCircle2 className="size-3" />
                  Feedback
                </p>
                <p className="text-xs text-muted-foreground">{interview.feedback}</p>
                {interview.feedbackScore && (
                  <p className="text-xs font-bold text-success mt-2">
                    Score: {interview.feedbackScore}/5 ⭐
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {interview.status === "scheduled" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-xs font-bold flex-1"
                  >
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-xs font-bold flex-1"
                  >
                    Cancel
                  </Button>
                </>
              )}
              {interview.status === "in-progress" && (
                <Button size="sm" className="rounded-lg text-xs font-bold w-full">
                  <Video className="size-3 mr-1" />
                  Join Now
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Upcoming Interviews */}
      {upcomingInterviews.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            Upcoming Interviews
          </h2>
          <div className="space-y-3">
            {upcomingInterviews.map((interview) => (
              <InterviewCard key={interview.id} interview={interview} />
            ))}
          </div>
        </div>
      )}

      {/* Past Interviews */}
      {pastInterviews.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Past Interviews</h2>
          <div className="space-y-3">
            {pastInterviews.map((interview) => (
              <InterviewCard key={interview.id} interview={interview} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {interviews.length === 0 && (
        <div className="rounded-3xl border border-border/80 bg-card p-12 text-center">
          <Calendar className="size-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground font-semibold">No interviews scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">
            When you're shortlisted, interviews will appear here
          </p>
        </div>
      )}
    </div>
  );
}
