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
  const [questions, setQuestions] = useState<Array<{
    id: string;
    category: string;
    question: string;
    options: Record<string, string>;
  }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && skillName) {
      setResult(null);
      setAnswers({});
      setLoading(true);
      ApiClient.getSkillAssessment(skillName)
        .then((res) => {
          setQuestions(res.questions || []);
        })
        .catch(() => {
          toast.error("Failed to load skill assessment questions.");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, skillName]);

  const handleSelectOption = (qId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionKey }));
  };

  const handleSubmit = async () => {
    if (!skillName) return;
    setSubmitting(true);
    try {
      const res = await ApiClient.submitSkillAssessment({
        skill_name: skillName,
        answers,
      });
      setResult(res.result);
      toast.success(res.message || "Skill assessment successfully verified!");
      onAssessmentCompleted?.();
    } catch {
      toast.error("Failed to evaluate assessment.");
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
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                    Question {idx + 1} · {q.category}
                  </span>
                  {answers[q.id] && (
                    <span className="text-xs text-success font-bold flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Selected
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {q.question}
                </p>
                <div className="space-y-2 pt-1">
                  {Object.entries(q.options).map(([key, label]) => {
                    const isSelected = answers[q.id] === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectOption(q.id, key)}
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
            ))}

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-xs text-muted-foreground">
                {Object.keys(answers).length} of {questions.length} answered
              </span>
              <Button
                onClick={handleSubmit}
                disabled={submitting || Object.keys(answers).length < questions.length}
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
