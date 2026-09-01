import { cn } from "@/lib/utils";
import { BridgeLine } from "@/components/brand/logo";

/**
 * SkillBridge "Bridge Line" section divider — the signature brand element
 * that visually connects sections like a bridge connecting skills to opportunities.
 */
export function SectionDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-6", className)} aria-hidden="true">
      <BridgeLine className="max-w-xs text-primary/40" />
    </div>
  );
}
