import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  delta,
  helper,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: { value: string; trend: "up" | "down" | "flat" };
  helper?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-surface",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        {icon && <div className="text-muted-foreground/70">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold",
              delta.trend === "up" && "text-accent",
              delta.trend === "down" && "text-destructive",
              delta.trend === "flat" && "text-muted-foreground",
            )}
          >
            {delta.trend === "up" && <ArrowUpRight className="size-3" />}
            {delta.trend === "down" && <ArrowDownRight className="size-3" />}
            {delta.value}
          </span>
        )}
      </div>
      {helper && (
        <p className="mt-2 text-[11px] text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
