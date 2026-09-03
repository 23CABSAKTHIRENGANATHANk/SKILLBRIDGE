import { useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Video,
  FileCode,
  GraduationCap,
  ExternalLink,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  ArrowRight,
  Tv,
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LearningResource } from "@/types/skillbridge";
import { toast } from "sonner";

export const Route = createFileRoute("/learning")({
  component: LearningPage,
});

function LearningPage() {
  return (
    <ProtectedRoute requiredRole="student">
      <LearningContent />
    </ProtectedRoute>
  );
}

const SKILL_FILTERS = [
  "All",
  "TypeScript",
  "React",
  "Node.js",
  "PostgreSQL",
  "Docker",
  "Python",
  "AWS",
  "System Design",
];

const TYPE_FILTERS = [
  { key: "all", label: "All Resources", icon: BookOpen },
  { key: "video", label: "YouTube Videos", icon: Video },
  { key: "course", label: "Full Courses", icon: GraduationCap },
  { key: "documentation", label: "Official Docs", icon: FileCode },
];

function LearningContent() {
  const queryClient = useQueryClient();
  const searchParams: any = useSearch({ strict: false });
  const initialSkill = searchParams?.skill || "All";

  const [selectedSkill, setSelectedSkill] = useState<string>(initialSkill);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["learning-resources", selectedSkill, selectedType],
    queryFn: () => ApiClient.getLearningResources(selectedSkill, selectedType),
  });

  const progressMutation = useMutation({
    mutationFn: ({ resourceId, status }: { resourceId: string; status: "started" | "completed" }) =>
      ApiClient.updateLearningProgress(resourceId, { status, progress: status === "completed" ? 100 : 0 }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["learning-resources"] });
      toast.success(variables.status === "completed" ? "Learning marked complete." : "Learning started.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update learning progress."),
  });

  const resources = data?.resources || [];

  const filtered = resources.filter((res: LearningResource) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      res.title.toLowerCase().includes(q) ||
      res.provider.toLowerCase().includes(q) ||
      res.skill.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Header Hero */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <BookOpen className="size-3.5" />
            <span>Curated Learning Engine</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Learn, Watch, Practice & Build
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Verified, publicly accessible documentation, reputable open courses, and canonical YouTube video tutorials mapped directly to your target skill gaps.
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div className="space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search courses, videos, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {TYPE_FILTERS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedType(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    selectedType === key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Skill Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="size-3" /> Skill:
            </span>
            {SKILL_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSkill(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedSkill === s
                    ? "bg-primary/20 text-primary border border-primary/30 font-bold"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3">
            <BookOpen className="size-10 mx-auto text-muted-foreground/40" />
            <h3 className="font-display text-base font-bold text-foreground">No resources found</h3>
            <p className="text-xs text-muted-foreground">
              Try changing your skill or resource type filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((res: LearningResource) => {
              const isVideo = res.resource_type === "video" || res.resource_type === "playlist";
              const isDoc = res.resource_type === "documentation";
              const isCourse = res.resource_type === "course";

              return (
                <div
                  key={res.id}
                  className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 transition-all hover:border-primary/50 hover:shadow-soft group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {isVideo ? <Video className="size-3" /> : isDoc ? <FileCode className="size-3" /> : <GraduationCap className="size-3" />}
                        {res.resource_type}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {res.is_free ? "Free Resource" : "Verified Course"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {res.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>{res.provider}</span>
                        {res.duration && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="size-3" /> {res.duration}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {res.relevance_reason && (
                      <p className="text-[11px] text-muted-foreground bg-secondary/50 p-2.5 rounded-xl border border-border/60 leading-relaxed">
                        <Sparkles className="size-3 inline mr-1 text-primary" />
                        {res.relevance_reason}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground capitalize">
                      {res.progress?.status === "completed" ? "Completed" : `${res.level} Level`}
                    </span>
                    <div className="flex items-center gap-2">
                      {res.progress?.status !== "completed" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={progressMutation.isPending}
                          onClick={() => progressMutation.mutate({ resourceId: res.id, status: res.progress ? "completed" : "started" })}
                          className="rounded-xl text-xs font-bold"
                        >
                          {res.progress ? "Mark complete" : "Start"}
                        </Button>
                      )}
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        <span>Open {isVideo ? "Video" : isDoc ? "Docs" : "Course"}</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Link back to Roadmap and Verify */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-display text-sm font-bold">Finished learning this topic?</h4>
            <p className="text-xs text-muted-foreground">
              Build a portfolio project or complete an assessment to update your verified Skill Passport.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/career-roadmap">
              <Button variant="outline" size="sm" className="font-bold text-xs rounded-xl">
                My Roadmap
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="sm" className="font-bold text-xs rounded-xl">
                Verify Skill <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
