import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground/30">
        <div className="size-4" />
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
