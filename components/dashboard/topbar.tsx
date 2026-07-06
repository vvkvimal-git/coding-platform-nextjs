import { Bell, Search, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [userName, setUserName] = useState("Dr. Elena Vance");
  const [userRole, setUserRole] = useState("Faculty Admin");

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedRole = localStorage.getItem("userRole");
    if (storedName) setUserName(storedName);
    if (storedRole) {
      // Map roles to friendly names
      const friendlyRole = storedRole.charAt(0).toUpperCase() + storedRole.slice(1).toLowerCase();
      setUserRole(friendlyRole);
    }
  }, []);

  const initials = userName
    .replace(/^(dr\.|prof\.|mr\.|ms\.)\s+/i, "") // Strip prefixes for cleaner initials
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "EV";

  return (
    <header className="h-14 shrink-0 border-b border-border bg-background flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 gap-4">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md">
        <button
          onClick={onMenuClick}
          aria-label="Open sidebar"
          className="lg:hidden inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors shrink-0"
        >
          <Menu className="size-5" />
        </button>
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-4 sm:pr-16 rounded-md border border-border bg-surface text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded hidden sm:inline-block">
            ⌘K
          </kbd>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="relative inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
        >
          <Bell className="size-4" />
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-accent" />
        </button>
        <ThemeToggle />
        <div className="ml-2 flex items-center gap-2.5 pl-3 border-l border-border">
          <div className="size-8 rounded-full bg-gradient-to-br from-accent to-chart-2 flex items-center justify-center text-[11px] font-semibold text-accent-foreground">
            {initials}
          </div>
          <div className="hidden md:block leading-tight">
            <p className="text-[13px] font-medium">{userName}</p>
            <p className="text-[11px] text-muted-foreground">{userRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
