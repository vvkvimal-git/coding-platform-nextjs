"use client";

import Link from "next/link";
import { ArrowUpRight, ClipboardList, GraduationCap, Plus, TrendingUp, Users, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  AssessmentTrendChart,
  PerformanceDistributionChart,
  StudentGrowthChart,
} from "@/components/dashboard/charts";
import { apiFetch } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";

interface DashboardStats {
  totalStudents: number;
  activeAssessments: number;
  completedAttempts: number;
  avgScore: number;
  recentAssessments: Array<{
    id: number;
    title: string;
    duration: number;
    startTime: string;
    participants: number;
  }>;
  recentStudents: Array<{
    id: number;
    fullName: string;
    email: string;
    department: string;
    createdAt: string;
    collegeName: string;
  }>;
}

export default function Dashboard() {
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedName = localStorage.getItem("userName");
    const storedRole = localStorage.getItem("userRole");
    if (storedName) {
      setUserName(storedName);
    } else {
      setUserName("Elena");
    }
    if (storedRole) {
      setUserRole(storedRole.toLowerCase());
    } else {
      setUserRole("admin");
    }
  }, []);

  const { data: stats = null, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: () => apiFetch<DashboardStats>("/dashboard/stats"),
    enabled: mounted && userRole !== "student" && userRole !== "",
    refetchInterval: 5000,
  });

  const loading = (!mounted || isLoading) && stats === null;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-[10vh] text-center space-y-6">
        <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-foreground space-y-4 shadow-sm backdrop-blur-sm">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto animate-pulse">
            <AlertCircle className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              Something went wrong to load dashboard
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              We couldn't retrieve your institution stats. This may be due to a temporary network issue or server restart.
            </p>
          </div>
          <div className="pt-2">
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-brand text-brand-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userRole === "student") {
    return <StudentDashboard />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1440px]">
      <PageHeader
        eyebrow="Overview"
        title={`Good afternoon, ${userName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>A real-time snapshot of your institution's assessment program.</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 dark:bg-emerald-500/20 dark:border-emerald-500/30">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Syncing
            </span>
          </span>
        }
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-[13px] font-medium hover:bg-card transition-colors">
              Export
            </button>
            <Link 
              href="/app/assessments"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand text-brand-foreground text-[13px] font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="size-3.5" /> New assessment
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total students" value={stats?.totalStudents?.toLocaleString() ?? "0"} delta={{ value: "+12.4%", trend: "up" }} helper="vs. last 30 days" icon={<Users className="size-4" />} />
        <StatCard label="Active assessments" value={String(stats?.activeAssessments ?? 0)} delta={{ value: "+4", trend: "up" }} helper="across cohorts" icon={<ClipboardList className="size-4" />} />
        <StatCard label="Completed attempts" value={stats?.completedAttempts?.toLocaleString() ?? "0"} delta={{ value: "+82", trend: "up" }} helper="total candidate submissions" icon={<TrendingUp className="size-4" />} />
        <StatCard label="Average score" value={`${stats?.avgScore != null ? stats.avgScore.toFixed(1) : "0.0"}%`} delta={{ value: "+0.6", trend: "up" }} helper="of 100, mean score" icon={<GraduationCap className="size-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Assessment trend
              </p>
              <p className="text-sm font-semibold mt-1">Sessions over the last 12 months</p>
            </div>
            <div className="flex gap-1">
              {["7d", "30d", "12m"].map((p, i) => (
                <button
                  key={p}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                    i === 2 ? "bg-brand text-brand-foreground" : "bg-background border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <AssessmentTrendChart />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Performance distribution
            </p>
            <p className="text-sm font-semibold mt-1">By score band</p>
          </div>
          <div className="h-48">
            <PerformanceDistributionChart />
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              { label: "0–40", color: "var(--color-destructive)" },
              { label: "40–60", color: "var(--color-warning)" },
              { label: "60–75", color: "var(--color-chart-3)" },
              { label: "75–90", color: "var(--color-accent)" },
              { label: "90–100", color: "var(--color-chart-2)" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="size-2 rounded-sm" style={{ background: b.color }} />
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Student growth
            </p>
            <p className="text-sm font-semibold mt-1">Enrolled candidates, last 12 months</p>
          </div>
        </div>
        <div className="h-56">
          <StudentGrowthChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent assessments</h3>
            <Link href="/app/assessments" className="text-[12px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              View all <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {(stats?.recentAssessments ?? []).length === 0 ? (
              <li className="px-5 py-6 text-center text-xs text-muted-foreground">No recent assessments.</li>
            ) : (
              (stats?.recentAssessments ?? []).map((a) => (
                <li key={a.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-surface transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{a.duration} mins · started {new Date(a.startTime).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[12px] tabular-nums text-muted-foreground">{a.participants} candidates</span>
                    <StatusBadge status="live" />
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent student registrations</h3>
            <Link href="/app/students" className="text-[12px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              View all <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {(stats?.recentStudents ?? []).length === 0 ? (
              <li className="px-5 py-6 text-center text-xs text-muted-foreground">No recent registrations.</li>
            ) : (
              (stats?.recentStudents ?? []).map((s) => (
                <li key={s.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-surface transition-colors">
                  <div className="size-9 rounded-full bg-surface border border-border flex items-center justify-center text-[11px] font-semibold">
                    {s.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">{s.fullName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.department} · {s.collegeName}</p>
                  </div>
                  <StatusBadge status="active" />
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
