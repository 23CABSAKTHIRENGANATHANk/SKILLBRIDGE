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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<{
    id: string;
    category: string;
    question: string;
  } | null>(null);
  const [stage, setStage] = useState(0);
  const [totalStages, setTotalStages] = useState(0);
  const [answer, setAnswer] = useState("");
  const [scorecard, setScorecard] = useState<any | null>(null);

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.startAdaptiveAIInterview({ target_role: targetRole });
      setSessionId(res.session_id);
      setStage(res.current_stage);
      setTotalStages(res.total_stages);
      setCurrentQuestion(res.current_question);
      setStep("questions");
    } catch {
      toast.error("Failed to initialize AI interview session.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInterview = async () => {
    if (!sessionId || !answer.trim()) return;
    setEvaluating(true);
    try {
      const answerRes = await ApiClient.submitAdaptiveAIInterviewAnswer(sessionId, answer);
      setAnswer("");
      if (answerRes.is_complete) {
        const completeRes = await ApiClient.completeAdaptiveAIInterview(sessionId);
        setScorecard(completeRes.scorecard);
        setStep("scorecard");
        toast.success("AI interview evaluation completed!");
      } else {
        setStage(answerRes.next_stage);
        setCurrentQuestion(answerRes.next_question);
      }
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
            {currentQuestion ? (
              <div className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                    Stage {stage + 1} of {totalStages} · {currentQuestion.category}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {currentQuestion.question}
                </p>
                <Textarea
                  placeholder="Explain your approach, trade-offs, and lessons learned (STAR format)..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="rounded-xl border-border bg-background text-xs min-h-[90px]"
                />
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">No interview question is available.</p>
            )}

            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button
                onClick={handleSubmitInterview}
                disabled={evaluating || !currentQuestion || !answer.trim()}
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
