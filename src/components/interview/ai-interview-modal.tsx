import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Video, Award, CheckCircle2, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface AIInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole?: string;
}

export function AIInterviewModal({
  isOpen,
  onClose,
  targetRole = "Full Stack Engineer",
}: AIInterviewModalProps) {
  const [step, setStep] = useState<"intro" | "questions" | "scorecard">("intro");
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [questions, setQuestions] = useState<Array<{ id: string; category: string; question: string }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scorecard, setScorecard] = useState<any | null>(null);

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getAIInterviewSession(targetRole);
      setQuestions(res.questions || []);
      setStep("questions");
    } catch {
      toast.error("Failed to initialize AI interview session.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleSubmitInterview = async () => {
    setEvaluating(true);
    try {
      const res = await ApiClient.evaluateAIInterview({
        role: targetRole,
        answers,
      });
      setScorecard(res.scorecard);
      setStep("scorecard");
      toast.success("AI interview evaluation completed!");
    } catch {
      toast.error("Failed to generate interview scorecard.");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl rounded-3xl border border-border/80 bg-card p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold">
            <Video className="size-5" />
            <span className="text-xs uppercase tracking-wider font-extrabold">SkillBridge 2.0 AI Interview Studio</span>
          </div>
          <DialogTitle className="font-display text-2xl font-bold text-foreground">
            AI Pre-Screen Interview: {targetRole}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Practice and record structured responses for recruiters to evaluate before live rounds.
          </DialogDescription>
        </DialogHeader>

        {step === "intro" && (
          <div className="py-6 space-y-5 text-center">
            <div className="size-16 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
              <Video className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-foreground">
                Ready for your technical pre-screen?
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                You will be presented with 4 curated questions covering system architecture, problem solving, scenarios, and communication.
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <Button onClick={startInterview} disabled={loading} className="rounded-xl font-bold text-xs">
                {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Sparkles className="size-3.5 mr-1.5" />}
                Begin Assessment Session
              </Button>
            </div>
          </div>
        )}

        {step === "questions" && (
          <div className="py-3 space-y-5 max-h-[60vh] overflow-y-auto pr-2">
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                    Question {idx + 1} · {q.category}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {q.question}
                </p>
                <Textarea
                  placeholder="Explain your approach, trade-offs, and lessons learned (STAR format)..."
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="rounded-xl border-border bg-background text-xs min-h-[90px]"
                />
              </div>
            ))}

            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button
                onClick={handleSubmitInterview}
                disabled={evaluating || Object.values(answers).some((a) => !a.trim())}
                className="rounded-xl font-bold text-xs"
              >
                {evaluating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Generating Scorecard...
                  </>
                ) : (
                  <>
                    <Award className="size-3.5 mr-1.5" />
                    Submit & Evaluate Interview
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "scorecard" && scorecard && (
          <div className="py-3 space-y-5">
            <div className="rounded-2xl border border-success/30 bg-success-soft/20 p-5 text-center">
              <h3 className="font-display text-2xl font-black text-foreground">
                Overall Score: {scorecard.overall_score}%
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                {scorecard.evaluator_notes}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-center">
                <p className="text-[11px] font-semibold text-muted-foreground">Technical</p>
                <p className="text-lg font-bold text-foreground">{scorecard.technical_score}%</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-center">
                <p className="text-[11px] font-semibold text-muted-foreground">Problem Solving</p>
                <p className="text-lg font-bold text-foreground">{scorecard.problem_solving_score}%</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-center">
                <p className="text-[11px] font-semibold text-muted-foreground">Communication</p>
                <p className="text-lg font-bold text-foreground">{scorecard.communication_score}%</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-center">
                <p className="text-[11px] font-semibold text-muted-foreground">Role Fit</p>
                <p className="text-lg font-bold text-foreground">{scorecard.role_fit_score}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl border border-success/30 bg-success-soft/10 p-4 space-y-2">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-success" /> Key Strengths
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {(scorecard.strengths || []).map((s: string, i: number) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-warning/30 bg-warning-soft/10 p-4 space-y-2">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="size-4 text-warning-foreground" /> Improvement Areas
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {(scorecard.improvements || []).map((s: string, i: number) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={onClose} className="rounded-xl font-bold text-xs">
                Close Studio
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
