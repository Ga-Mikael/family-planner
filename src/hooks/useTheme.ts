import { useState, useEffect } from "react";

const OVERRIDE_KEY = "fp-theme-override";

export function useTheme() {
  const getSystemDark = () =>
    typeof window !== "undefined"
      ? window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
      : false;

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const override = localStorage.getItem(OVERRIDE_KEY);
    if (override !== null) return override === "dark";
    return getSystemDark();
  });

  // Apply data-theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Listen to system preference changes (only if no manual override)
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(OVERRIDE_KEY) === null) setIsDark(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => {
    setIsDark((d) => {
      const next = !d;
      localStorage.setItem(OVERRIDE_KEY, next ? "dark" : "light");
      return next;
    });
  };

  const resetToSystem = () => {
    localStorage.removeItem(OVERRIDE_KEY);
    setIsDark(getSystemDark());
  };

  return { isDark, toggleTheme, resetToSystem };
}
