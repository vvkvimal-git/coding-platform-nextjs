import { useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "axiom-theme";

function getInitial(): Theme {
  if (typeof document === "undefined") return "dark";
  if (document.documentElement.classList.contains("dark")) return "dark";
  return "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitial);

  useEffect(() => {
    setThemeState(getInitial());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
