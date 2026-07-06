"use client";

import Link from "next/link";
import { ArrowRight, Download, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const hashLinks = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

export function LandingNav() {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    setIsAuthenticated(!!token);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-4 z-50 px-4 flex justify-center">
      <header
        className={cn(
          "w-full max-w-[1180px] rounded-full border border-border/70 transition-all duration-300",
          "bg-background/70 backdrop-blur-xl",
          scrolled
            ? "shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)] bg-background/85"
            : "shadow-none",
        )}
      >
        <div className="h-14 pl-5 pr-2 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden md:flex items-center gap-1">
              {hashLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-[13px] font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full hover:bg-surface transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/downloads"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full hover:bg-surface transition-colors"
              >
                <Download className="size-3.5" />
                Downloads
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            {isAuthenticated ? (
              <Link
                href="/app"
                className="hidden sm:inline-flex text-[13px] font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-full transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="hidden sm:inline-flex text-[13px] font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-full transition-colors"
              >
                Sign in
              </Link>
            )}
            <Link
              href={isAuthenticated ? "/app" : "/sign-in"}
              className="inline-flex items-center gap-1.5 bg-brand text-brand-foreground text-[13px] font-semibold pl-3.5 pr-3 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Get started <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
