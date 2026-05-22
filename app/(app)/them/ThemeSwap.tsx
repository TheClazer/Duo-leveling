"use client";

import { useEffect } from "react";
import { useTheme, type ThemeKey } from "@/components/theme/ThemeProvider";

export function ThemeSwap({ theme }: { theme: ThemeKey }) {
  const { theme: current, setTheme } = useTheme();
  useEffect(() => {
    const prev = current;
    setTheme(theme);
    return () => setTheme(prev);
    // We only want to react to a change in target theme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  return null;
}
