import { useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "schema-canvas-theme";

type Theme = "light" | "dark";

const getPreferredTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useMemo(
    () => () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    []
  );

  return { theme, toggleTheme };
}
