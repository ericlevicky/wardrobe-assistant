"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "feminine" | "masculine";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "feminine",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("feminine");

  // Restore saved preference on mount (guard against SSR / blocked storage)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("wardrobe-theme") as Theme | null;
      if (saved === "masculine" || saved === "feminine") {
        setTheme(saved);
      }
    } catch {
      // localStorage unavailable (e.g., private browsing with storage blocked)
    }
  }, []);

  // Apply/remove data-theme attribute and persist preference (guard against SSR)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const html = document.documentElement;
    if (theme === "masculine") {
      html.setAttribute("data-theme", "masculine");
    } else {
      html.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("wardrobe-theme", theme);
    } catch {
      // localStorage unavailable
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "feminine" ? "masculine" : "feminine"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
