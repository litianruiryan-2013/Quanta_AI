import { useCallback, useEffect, useState } from "react";

/** Shared dark/light toggle — same localStorage key + DOM class the old
 * AppShell used, so every top-level page (Home, AI, Business, legacy /app)
 * stays in sync no matter which one is mounted. */
export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("quanta-theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("quanta-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return [theme, toggleTheme];
}
