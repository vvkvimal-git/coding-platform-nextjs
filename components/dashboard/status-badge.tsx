import { cn } from "@/lib/utils";

const tones = {
  live: "bg-accent/10 text-accent ring-accent/20",
  draft: "bg-muted text-muted-foreground ring-border",
  completed: "bg-chart-2/10 text-chart-2 ring-chart-2/20",
  scheduled: "bg-warning/10 text-warning ring-warning/20",
  active: "bg-accent/10 text-accent ring-accent/20",
  inactive: "bg-muted text-muted-foreground ring-border",
  invited: "bg-chart-2/10 text-chart-2 ring-chart-2/20",
} as const;

export function StatusBadge({ status }: { status: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
        tones[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
