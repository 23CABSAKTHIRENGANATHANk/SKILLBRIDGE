import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Award, Sparkles, Loader2, BrainCircuit } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface SkillAssessmentModalProps {
  skillName: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAssessmentCompleted?: () => void;
}

export function SkillAssessmentModal({
  skillName,
  isOpen,
  onClose,
  onAssessmentCompleted,
}: SkillAssessmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<{
    id: string;
    index: number;
    category: string;
    question: string;
    options?: Record<string, string> | null;
  } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && skillName) {
      setResult(null);
      setAttemptId(null);
      setQuestion(null);
      setCurrentIndex(0);
      setTotalQuestions(0);
      setSelectedAnswer("");
      setLoading(true);
      ApiClient.startSkillVerification({ skill_name: skillName })
        .then(async (res) => {
          setAttemptId(res.attempt_id);
          setCurrentIndex(res.current_question_index);
          setTotalQuestions(res.total_questions);
          const questionRes = await ApiClient.getSkillVerificationQuestion(
            res.attempt_id,
            res.current_question_index,
          );
          setQuestion(questionRes.question ?? null);
        })
        .catch(() => {
          toast.error("Failed to load skill assessment questions.");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, skillName]);

  const handleSubmit = async () => {
    if (!attemptId || !question || !selectedAnswer) return;
    setSubmitting(true);
    try {
      const answerRes = await ApiClient.submitSkillVerificationAnswer(
        { question_id: question.id, answer: selectedAnswer },
        attemptId,
      );
      setSelectedAnswer("");
      if (answerRes.is_last_question) {
        const completeRes = await ApiClient.completeSkillVerification(attemptId);
        setResult({
          score: completeRes.score,
          level: completeRes.verified_level,
          knowledge_score: completeRes.breakdown["Conceptual Foundations"] ?? 0,
          problem_solving_score: completeRes.breakdown["Debugging & Optimization"] ?? 0,
          practical_score: completeRes.breakdown["Practical Implementation"] ?? 0,
          summary: completeRes.message,
        });
        toast.success(completeRes.message || "Skill assessment successfully verified!");
        onAssessmentCompleted?.();
      } else {
        const nextRes = await ApiClient.getSkillVerificationQuestion(attemptId, answerRes.next_index);
        setCurrentIndex(answerRes.next_index);
        setQuestion(nextRes.question ?? null);
      }
    } catch {
      toast.error("Failed to save or evaluate this assessment answer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-3xl border border-border/80 bg-card p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold">
            <BrainCircuit className="size-5" />
            <span className="text-xs uppercase tracking-wider font-extrabold">SkillBridge 2.0 Proof of Skill</span>
          </div>
          <DialogTitle className="font-display text-2xl font-bold text-foreground">
            {skillName} Competency Verification
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Objective technical evaluation covering conceptual foundations, debugging, and production scenarios.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-semibold">Generating tailored technical questions...</p>
          </div>
        ) : result ? (
          /* Result Scorecard View */
          <div className="py-4 space-y-6">
            <div className="rounded-2xl border border-success/30 bg-success-soft/20 p-5 text-center">
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-success text-success-foreground mb-3 shadow-lg shadow-success/20">
                <Award className="size-8" />
              </div>
              <h3 className="font-display text-2xl font-black text-foreground">
                Score: {result.score}%
              </h3>
              <p className="text-xs font-bold text-success uppercase tracking-wider mt-0.5">
                Proficiency Level: {result.level}
              </p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
                {result.summary}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-center">
                <p className="text-[11px] font-semibold text-muted-foreground">Knowledge</p>
                <p className="text-lg font-bold text-foreground">{result.knowledge_score}%</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-center">
                <p className="text-[11px] font-semibold text-muted-foreground">Problem Solving</p>
                <p className="text-lg font-bold text-foreground">{result.problem_solving_score}%</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-center">
                <p className="text-[11px] font-semibold text-muted-foreground">Practical</p>
                <p className="text-lg font-bold text-foreground">{result.practical_score}%</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={onClose} className="rounded-xl font-bold text-xs">
                Back to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          /* Questions Form View */
          <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {question ? (
              <div className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                    Question {currentIndex + 1} of {totalQuestions} · {question.category}
                  </span>
                  {selectedAnswer && (
                    <span className="text-xs text-success font-bold flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Selected
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {question.question}
                </p>
                <div className="space-y-2 pt-1">
                  {Object.entries(question.options ?? {}).map(([key, label]) => {
                    const isSelected = selectedAnswer === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedAnswer(key)}
                        aria-pressed={isSelected}
                        className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground font-bold shadow-sm"
                            : "border-border/60 bg-background text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        }`}
                      >
                        <span className={`flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {key}
                        </span>
                        <span className="leading-tight pt-0.5">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">No question is available for this assessment.</p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-xs text-muted-foreground">
                {currentIndex} of {totalQuestions} answered
              </span>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !question || !selectedAnswer}
                className="rounded-xl font-bold text-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Grading Answers...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 mr-1.5" />
                    Submit & Verify Skill
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
