import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface CareerCoachModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetRole?: string;
  readinessScore?: number;
}

interface Message {
  id: string;
  sender: "user" | "coach";
  text: string;
  action?: string;
  skills?: string[];
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "What should I learn next?",
  "Why is my readiness score low?",
  "Which skill should I prioritize?",
  "Which projects should I build?",
];

export function CareerCoachModal({
  open,
  onOpenChange,
  targetRole = "Software Developer",
  readinessScore = 50,
}: CareerCoachModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      sender: "coach",
      text: `Hello! I am your SkillBridge AI Career Coach. I have analyzed your verified skills for ${targetRole} (${readinessScore}% ready). How can I guide your career evolution today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    const userMsg: Message = {
      id: "user_" + Date.now(),
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSending(true);

    try {
      const res = await ApiClient.sendCareerCoachMessage(text);
      const coachMsg: Message = {
        id: "coach_" + Date.now(),
        sender: "coach",
        text: res.reply,
        action: res.recommended_next_action,
        skills: res.skills_to_focus_on,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (err) {
      toast.error("Career coach was unable to respond. Please try again.");
      const errorMsg: Message = {
        id: "err_" + Date.now(),
        sender: "coach",
        text: "I'm having trouble analyzing your request right now. Please check your skill roadmap or try asking another question.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border bg-card">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border/80 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Bot className="size-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <span>AI Career Coach</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Grounded in Your Profile
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Targeting {targetRole} • {readinessScore}% Career Ready
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[450px]">
          {messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Sparkles className="size-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? "bg-primary text-primary-foreground font-medium rounded-tr-none"
                      : "bg-secondary/60 text-foreground border border-border/60 rounded-tl-none space-y-2.5"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {m.action && (
                    <div className="p-2.5 rounded-xl bg-background/80 border border-border/70 text-foreground space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Recommended Next Action
                      </span>
                      <p className="font-bold">{m.action}</p>
                    </div>
                  )}

                  {m.skills && m.skills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-muted-foreground">Focus Skills:</span>
                      {m.skills.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="flex size-7 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0 mt-0.5">
                    <User className="size-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-3">
              <div className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Loader2 className="size-3.5 animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-secondary/60 border border-border/60 p-4 text-xs text-muted-foreground animate-pulse">
                Analyzing your skills and roadmap...
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-6 py-2 border-t border-border/50 bg-background/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={isSending}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-primary-soft hover:text-primary transition-colors whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              placeholder="Ask your career coach anything..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isSending}
              className="rounded-xl"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isSending || !inputMessage.trim()}
              className="rounded-xl shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
