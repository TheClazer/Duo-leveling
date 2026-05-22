import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  safelist: [
    // Habit color palette (lib/habits.ts) — referenced via interpolated strings
    "bg-violet-500", "bg-orange-500", "bg-pink-400", "bg-amber-400", "bg-emerald-400", "bg-sky-400",
    "ring-violet-400/60", "ring-orange-400/60", "ring-pink-400/60", "ring-amber-400/60", "ring-emerald-400/60", "ring-sky-400/60",
  ],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        bg: {
          base: "rgb(var(--bg-base) / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
          card: "rgb(var(--bg-card) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-primary) / <alpha-value>)",
          secondary: "rgb(var(--accent-secondary) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "rgb(var(--text-primary) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
        },
        glow: "rgb(var(--border-glow) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        "tighter-display": "-0.04em",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      backdropBlur: { xs: "2px" },
      transitionTimingFunction: {
        // Custom Apple-feel ease-out-quart. Use `ease-snap` explicitly where
        // you want snappier feel. We deliberately do NOT override DEFAULT here —
        // tailwindcss-animate's Dialog/Popover/Tooltip animations depend on
        // Tailwind's base defaults, and overriding them makes the enter
        // animation never reach its end state.
        "snap": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-up": "slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "system-glitch": "systemGlitch 0.35s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 12px rgb(var(--border-glow) / 0.3)" },
          "50%": { boxShadow: "0 0 24px rgb(var(--border-glow) / 0.6)" },
        },
        systemGlitch: {
          "0%": { transform: "translateX(0)", opacity: "0" },
          "10%": { transform: "translateX(-1px)", opacity: "1" },
          "20%": { transform: "translateX(1px)" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
