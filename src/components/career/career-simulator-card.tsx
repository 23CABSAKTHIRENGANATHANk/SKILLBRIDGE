import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Check, Plus, Loader2 } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { toast } from "sonner";

const POPULAR_SIM_SKILLS = [
  "Docker",
  "AWS",
  "Python",
  "PostgreSQL",
  "System Design",
  "Kubernetes",
  "Redis",
  "GraphQL",
];

export function CareerSimulatorCard() {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["Docker", "AWS"]);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSimulate = async () => {
    if (selectedSkills.length === 0) {
      toast.error("Please select at least one skill to project growth.");
      return;
    }
    setLoading(true);
    try {
      const res = await ApiClient.simulateCareer(selectedSkills);
      setSimResult(res);
      toast.success("Projected career readiness calculated!");
    } catch {
      toast.error("Failed to run simulation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <TrendingUp className="size-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Career Growth Simulator</h2>
        </div>
        <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-primary-soft text-primary uppercase tracking-wider">
          What if I learn...?
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Select target competencies to deterministically model your projected readiness and newly unlocked opportunities.
      </p>

      {/* Selectable Skill Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {POPULAR_SIM_SKILLS.map((skill) => {
          const isSelected = selectedSkills.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                  : "border border-border/70 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {isSelected ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
              {skill}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end mb-6">
        <Button
          onClick={handleSimulate}
          disabled={loading || selectedSkills.length === 0}
          className="rounded-xl font-bold text-xs"
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
              Calculating Projections...
            </>
          ) : (
            <>
              <Sparkles className="size-3.5 mr-1.5" />
              Run Career Simulation
            </>
          )}
        </Button>
      </div>

      {simResult && (
        <div className="rounded-2xl border border-primary/20 bg-primary-soft/30 p-5 space-y-4 animate-in fade-in-50 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/60 bg-background/80 p-3.5 text-center">
              <p className="text-[11px] font-semibold text-muted-foreground">Current Readiness</p>
              <p className="text-2xl font-black text-foreground mt-0.5">{simResult.current_readiness}%</p>
            </div>
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3.5 text-center">
              <p className="text-[11px] font-bold text-primary">Projected Readiness</p>
              <p className="text-2xl font-black text-primary mt-0.5">{simResult.projected_readiness}%</p>
            </div>
            <div className="rounded-xl border border-success/30 bg-success-soft/30 p-3.5 text-center">
              <p className="text-[11px] font-bold text-success">Growth Boost</p>
              <p className="text-2xl font-black text-success mt-0.5">+{simResult.growth_delta}%</p>
            </div>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground pt-1">
            <p className="font-semibold text-foreground">
              ✨ Unlocks <strong className="text-primary">{simResult.high_fit_jobs_unlocked} high-match positions</strong> including:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(simResult.potential_roles || []).map((role: string, i: number) => (
                <span key={i} className="px-2.5 py-1 rounded-md bg-card text-foreground border border-border/70 text-[11px] font-bold">
                  {role}
                </span>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/80 italic border-t border-border/40 pt-2">
            ℹ️ {simResult.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
