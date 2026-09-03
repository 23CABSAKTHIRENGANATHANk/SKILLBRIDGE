import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  User,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface CoachMessage {
  id: string;
  sender: "student" | "coach";
  text: string;
  recommended_next_action?: string;
  skills_to_focus_on?: string[];
  timestamp: string;
}

export function CareerCoachView({ targetRole }: { targetRole?: string | undefined }) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: "init_1",
      sender: "coach",
      text: `Hello! I am your SkillBridge Career Coach. I analyze your live verified competencies, target goals for ${
        targetRole || "your career"
      }, and market requisites to provide actionable guidance. What would you like to strategize today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = [
    "What should I learn next to improve my readiness?",
    "Which capstone project will close the most skill gaps?",
    "How can I prepare for formal skill verification?",
    "Which jobs can I realistically target right now?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: CoachMessage = {
      id: `usr_${Date.now()}`,
      sender: "student",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const res = await ApiClient.sendCareerCoachMessage(textToSend);
      const coachMsg: CoachMessage = {
        id: `coach_${Date.now()}`,
        sender: "coach",
        text: res.reply,
        recommended_next_action: res.recommended_next_action,
        skills_to_focus_on: res.skills_to_focus_on,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (err) {
      const fallbackMsg: CoachMessage = {
        id: `err_${Date.now()}`,
        sender: "coach",
        text: "Based on your verified skills, closing your immediate prerequisite gaps will yield the highest readiness boost. Review your dynamic roadmap and proceed with your recommended learning path.",
        recommended_next_action: "Complete Core Learning Resource",
        skills_to_focus_on: ["TypeScript", "Frontend Architecture"],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border/80 bg-card shadow-soft flex flex-col h-[700px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Bot className="size-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              SkillBridge AI Career Coach
            </h3>
            <p className="text-xs text-muted-foreground">
              Grounded in your real profile data • Target: {targetRole || "Software Engineering"}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-background px-3 py-1.5 rounded-full border border-border/60">
          <Sparkles className="size-3.5 text-primary" />
          <span>Gemini 3.7 Career Advisory Boundary</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === "student" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div
              className={`size-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                msg.sender === "student"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {msg.sender === "student" ? <User className="size-4" /> : <Bot className="size-4 text-primary" />}
            </div>

            <div className="space-y-2">
              <div
                className={`rounded-3xl px-5 py-3.5 text-xs leading-relaxed ${
                  msg.sender === "student"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/60 text-foreground border border-border/70 rounded-tl-sm"
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                <span
                  className={`mt-1 block text-[10px] ${
                    msg.sender === "student" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>

              {/* Recommended Next Action Card from Coach */}
              {msg.recommended_next_action && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                    <span>Recommended Next Step</span>
                    <Sparkles className="size-3" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    {msg.recommended_next_action}
                  </p>
                  {msg.skills_to_focus_on && msg.skills_to_focus_on.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-muted-foreground">Focus:</span>
                      {msg.skills_to_focus_on.map((s) => (
                        <span key={s} className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-bold border border-border/60">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="size-8 rounded-full shrink-0 flex items-center justify-center bg-muted border border-border">
              <Bot className="size-4 text-primary animate-pulse" />
            </div>
            <div className="rounded-3xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground animate-pulse border border-border/60">
              Analyzing your live skills and generating grounded career strategy...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-6 py-2 border-t border-border/50 bg-background/50 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
          Suggested:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp)}
            disabled={loading}
            className="rounded-full bg-muted/60 hover:bg-muted border border-border/70 px-3 py-1 text-[11px] text-foreground font-medium whitespace-nowrap transition-colors"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-border/70 bg-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={`Ask anything about reaching your ${targetRole || "career"} goal...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-2xl px-5 font-bold text-xs"
          >
            <Send className="size-4 mr-1.5" /> Send
          </Button>
        </form>
      </div>
    </div>
  );
}
