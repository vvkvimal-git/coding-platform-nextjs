import { cn } from "@/lib/utils";

export function Logo({ className, label = true }: { className?: string; label?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative size-6 rounded-md bg-brand flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="size-3.5 text-brand-foreground" fill="currentColor" aria-hidden>
          <path d="M3 13c3-1 6-2 9-2 4 0 7 2 9 4-1-4-5-7-9-7-2 0-4 .5-5 1.5L3 13zm6 4c1 1 3 2 5 2 3 0 5-1 6-3-2 1-4 1.5-6 1.5-2 0-4-.2-5-.5z" />
        </svg>
      </div>
      {label && (
        <span className="text-[15px] font-semibold tracking-tight text-brand">
          Bluebirds Solutions
        </span>
      )}
    </div>
  );
}
