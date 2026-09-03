import React, { useEffect, useState } from "react";
import {
  FolderGit2,
  CheckCircle2,
  Clock,
  Code2,
  ExternalLink,
  Github,
  Play,
  Sparkles,
  Layers,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface ProjectItem {
  id: string;
  skill: string;
  title: string;
  description: string;
  deliverables: string[] | string;
  tech_stack: string[] | string;
  difficulty: string;
  repo_template_url: string;
  estimated_hours: number;
  user_progress?: {
    status: string;
    repository_url?: string;
    completed_at?: string;
  } | null;
}

export function BuildProjectsView() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [repoUrls, setRepoUrls] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ id: string; message: string; type: "success" | "error" } | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getRecommendedProjects();
      setProjects(res.projects || []);
    } catch (err) {
      console.error("Failed to load recommended projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleStartProject = async (projectId: string) => {
    try {
      setActionLoading(projectId);
      await ApiClient.startProject(projectId);
      setFeedback({ id: projectId, message: "Project started! Track your progress and submit your GitHub repository.", type: "success" });
      await fetchProjects();
    } catch (err) {
      setFeedback({ id: projectId, message: "Failed to start project.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteProject = async (projectId: string) => {
    const repoUrl = repoUrls[projectId] || "";
    if (!repoUrl.trim()) {
      setFeedback({ id: projectId, message: "Please provide a valid GitHub repository URL as tangible proof.", type: "error" });
      return;
    }

    try {
      setActionLoading(projectId);
      await ApiClient.completeProject(projectId, repoUrl);
      setFeedback({ id: projectId, message: "Project completed! Code proof recorded in your Knowledge Evolution Ledger.", type: "success" });
      await fetchProjects();
    } catch (err) {
      setFeedback({ id: projectId, message: "Failed to complete project.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-12 text-center shadow-soft animate-pulse space-y-4">
        <FolderGit2 className="mx-auto size-12 text-primary animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">
          Curating production-grade capstone blueprints closing your skill gaps...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-black text-foreground">
            Build This Next — Portfolio Blueprint Center
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real portfolio projects that supply tangible GitHub evidence to close your target career gaps.
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          {projects.length} Blueprints Available
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((proj) => {
          const deliverables = Array.isArray(proj.deliverables)
            ? proj.deliverables
            : typeof proj.deliverables === "string"
            ? (JSON.parse(proj.deliverables) as string[])
            : [];

          const techStack = Array.isArray(proj.tech_stack)
            ? proj.tech_stack
            : typeof proj.tech_stack === "string"
            ? (JSON.parse(proj.tech_stack) as string[])
            : [];

          const isCompleted = proj.user_progress?.status === "completed";
          const isInProgress = proj.user_progress?.status === "in_progress";

          return (
            <div
              key={proj.id}
              className={`rounded-3xl border p-6 transition-all duration-200 flex flex-col justify-between ${
                isCompleted
                  ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20"
                  : isInProgress
                  ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20"
                  : "border-border/80 bg-card hover:border-border"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      Target Skill: {proj.skill}
                    </span>
                    <h4 className="mt-2 font-display text-lg font-bold text-foreground">
                      {proj.title}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      isCompleted
                        ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                        : isInProgress
                        ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                        : "border-border text-muted-foreground bg-muted/40"
                    }`}
                  >
                    {isCompleted ? "Verified / Completed" : isInProgress ? "In Progress" : "Available"}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {proj.description}
                </p>

                {/* Tech Stack Chips */}
                {techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {techStack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-lg border border-border/70 bg-background px-2 py-0.5 text-[10px] font-medium text-foreground"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Deliverables checklist */}
                {deliverables.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Key Deliverables:
                    </p>
                    <ul className="space-y-1">
                      {deliverables.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback?.id === proj.id && (
                  <div
                    className={`rounded-xl p-3 text-xs font-semibold ${
                      feedback.type === "success"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div className="mt-6 pt-4 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> ~{proj.estimated_hours} Hours
                  </span>
                  <span className="font-semibold capitalize">Difficulty: {proj.difficulty}</span>
                </div>

                {isCompleted ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-600 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" /> Code Proof Submitted
                    </span>
                    {proj.user_progress?.repository_url && (
                      <a
                        href={proj.user_progress.repository_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] hover:underline"
                      >
                        <Github className="size-3" /> Repository
                      </a>
                    )}
                  </div>
                ) : isInProgress ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Github className="size-4 text-muted-foreground shrink-0" />
                      <input
                        type="url"
                        placeholder="https://github.com/username/project-repo"
                        value={repoUrls[proj.id] || ""}
                        onChange={(e) => setRepoUrls({ ...repoUrls, [proj.id]: e.target.value })}
                        className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <Button
                      onClick={() => handleCompleteProject(proj.id)}
                      disabled={actionLoading === proj.id}
                      className="w-full rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {actionLoading === proj.id ? "Submitting Proof..." : "Submit GitHub Proof & Complete"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {proj.repo_template_url && (
                      <a
                        href={proj.repo_template_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold">
                          <Github className="size-3.5 mr-1" /> View Starter Template
                        </Button>
                      </a>
                    )}
                    <Button
                      onClick={() => handleStartProject(proj.id)}
                      disabled={actionLoading === proj.id}
                      size="sm"
                      className="flex-1 rounded-xl text-xs font-bold"
                    >
                      <Play className="size-3.5 mr-1" /> Start Project
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
