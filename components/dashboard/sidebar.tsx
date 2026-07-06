"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Database,
  BarChart3,
  Trophy,
  FileText,
  LineChart,
  Settings,
  Landmark,
  LogOut,
  Shield,
  Video,
  X,
  MessageSquare,
  Code2,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

const overview = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/colleges", label: "Colleges", icon: Landmark },
  { to: "/app/students", label: "Students", icon: Users },
  { to: "/app/assessments", label: "Assessments", icon: ClipboardList },
  { to: "/app/question-bank", label: "Question Bank", icon: Database },
  { to: "/app/coding-problems", label: "Coding Problems", icon: Code2 },
  { to: "/app/proctoring", label: "Live Proctoring", icon: Shield },
  { to: "/app/video-evidence", label: "Video Evidence", icon: Video },
] as const;

const reporting = [
  { to: "/app/results", label: "Results", icon: FileText },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
  { to: "/app/analytics", label: "Analytics", icon: LineChart },
  { to: "/app/feedback", label: "Feedback Insights", icon: MessageSquare },
] as const;

function NavGroup({ label, items, current, onItemClick }: { label: string; items: readonly any[]; current: string; onItemClick?: () => void }) {
  return (
    <div>
      <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? current === item.to : current.startsWith(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active && "text-accent")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState("admin");

  useEffect(() => {
    setMounted(true);
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) {
      setRole(storedRole.toLowerCase());
    }
  }, []);

  const isStudent = mounted && role === "student";

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    if (typeof window !== "undefined" && window.caches) {
      window.caches.delete("proctor-video-cache").catch(() => {});
    }
    window.location.href = "/sign-in";
  };

  const filteredOverview = isStudent
    ? [
        { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { to: "/app/study-materials", label: "Study Materials", icon: FileText },
      ]
    : [
        ...overview,
        { to: "/app/study-materials", label: "Study Materials", icon: FileText },
      ];

  const filteredReporting = isStudent
    ? [
        { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
        { to: "/app/analytics", label: "Analytics", icon: LineChart },
      ]
    : reporting;

  return (
    <>
      {/* Backdrop overlay on mobile */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col border-r border-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0 lg:z-10",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-14 px-5 flex items-center justify-between border-b border-border">
          <Logo />
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          <NavGroup label="Overview" items={filteredOverview} current={pathname || ""} onItemClick={onClose} />
          <NavGroup label="Reporting" items={filteredReporting} current={pathname || ""} onItemClick={onClose} />
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              System
            </p>
            <div className="space-y-0.5">
              <Link
                href="/app/settings"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  pathname?.startsWith("/app/settings")
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Settings className="size-4 shrink-0" />
                Settings
              </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-left">
                  <LogOut className="size-4 shrink-0" />
                  Logout
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be signed out of your account. You'll need to enter your credentials to access the console again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className={cn(buttonVariants({ variant: "destructive" }))}
                  >
                    Log out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </nav>
      {!isStudent && (
        <div className="p-3 border-t border-border">
          <div className="rounded-lg bg-surface p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
              Seat usage
            </p>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-accent" style={{ width: "72%" }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground tabular-nums">
              7,240 / 10,000 seats
            </p>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
