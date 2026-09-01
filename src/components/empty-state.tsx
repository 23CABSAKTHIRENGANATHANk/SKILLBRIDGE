import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BridgeLine } from "@/components/brand/logo";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed bg-card/60 px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-5 font-display text-lg font-bold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      <BridgeLine className="mt-6 max-w-[220px] text-primary/50" />
      {actionLabel && (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
