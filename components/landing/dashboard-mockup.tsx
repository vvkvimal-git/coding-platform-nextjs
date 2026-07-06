import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { trendData } from "@/lib/mock/data";

/**
 * Static, decorative dashboard mockup for the landing hero + showcase sections.
 * Pure presentation — no real data wiring.
 */
export function DashboardMockup() {
  const host =
    typeof window !== "undefined" && window.location?.host
      ? window.location.host
      : "app";
  return (
    <div className="relative rounded-xl border border-border bg-card shadow-2xl shadow-foreground/5 overflow-hidden">
      {/* Window chrome */}
      <div className="h-9 border-b border-border bg-surface flex items-center px-4 gap-1.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <div className="mx-auto text-[11px] font-mono text-muted-foreground">
          {host} / dashboard
        </div>
      </div>

      <div className="grid grid-cols-12">
        {/* Mini sidebar */}
        <div className="col-span-3 border-r border-border bg-sidebar p-3 space-y-1">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Overview
          </div>
          {["Dashboard", "Assessments", "Students", "Question Bank"].map((l, i) => (
            <div
              key={l}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] ${
                i === 0
                  ? "bg-sidebar-accent text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${i === 0 ? "bg-accent" : "bg-border"}`}
              />
              {l}
            </div>
          ))}
          <div className="px-2 py-1.5 mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Reporting
          </div>
          {["Results", "Leaderboard", "Reports"].map((l) => (
            <div
              key={l}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-muted-foreground"
            >
              <span className="size-1.5 rounded-full bg-border" />
              {l}
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="col-span-9 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Overview
              </p>
              <p className="text-sm font-semibold tracking-tight">Performance this week</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-border font-medium">
                7d
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-semibold">
                30d
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-border font-medium">
                90d
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Students", v: "8,240", d: "+12%" },
              { l: "Active", v: "24", d: "+4" },
              { l: "Completed", v: "1,402", d: "+82" },
              { l: "Avg Score", v: "82.4", d: "+0.6" },
            ].map((m) => (
              <div key={m.l} className="rounded-md border border-border bg-surface p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {m.l}
                </p>
                <p className="text-sm font-semibold tabular-nums mt-1">{m.v}</p>
                <p className="text-[9px] text-accent font-semibold mt-0.5">{m.d}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-border bg-surface p-3 h-32">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Assessment trend
            </p>
            <div className="h-[calc(100%-18px)]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={trendData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="mock-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="assessments"
                    stroke="var(--color-accent)"
                    strokeWidth={1.5}
                    fill="url(#mock-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface overflow-hidden">
            <div className="grid grid-cols-4 px-3 py-2 border-b border-border text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>Assessment</span>
              <span>Candidates</span>
              <span>Status</span>
              <span className="text-right">Score</span>
            </div>
            {[
              ["CS101 Mid-term", "412", "live", "78.4%"],
              ["Frontend Architect", "28", "draft", "—"],
              ["Quantum Dynamics", "156", "done", "64.2%"],
            ].map(([t, c, s, sc]) => (
              <div key={t} className="grid grid-cols-4 px-3 py-2 border-b border-border last:border-0 text-[11px] items-center">
                <span className="font-medium truncate">{t}</span>
                <span className="text-muted-foreground tabular-nums">{c}</span>
                <span>
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ring-inset ${
                      s === "live"
                        ? "bg-accent/10 text-accent ring-accent/20"
                        : s === "draft"
                          ? "bg-muted text-muted-foreground ring-border"
                          : "bg-chart-2/10 text-chart-2 ring-chart-2/20"
                    }`}
                  >
                    <span className="size-1 rounded-full bg-current" />
                    {s}
                  </span>
                </span>
                <span className="text-right tabular-nums font-medium">{sc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
