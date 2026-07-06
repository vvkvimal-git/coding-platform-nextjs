"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { useAuthRenewal } from "@/hooks/use-auth-renewal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useAuthRenewal();

  useEffect(() => {
    const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!accessToken) {
      setCheckingAuth(false);
      setHasToken(false);
      router.push("/sign-in");
    } else {
      setHasToken(true);
      setCheckingAuth(false);
    }
  }, [router]);

  if (checkingAuth || !hasToken) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand" />
        <p className="mt-2 text-xs text-muted-foreground font-medium">Verifying session credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
