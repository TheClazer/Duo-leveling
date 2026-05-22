"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeKey = "jinwoo" | "chahaein" | "shared";

type Ctx = {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ initial, children }: { initial: ThemeKey; children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeKey>(initial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
