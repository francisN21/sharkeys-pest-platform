"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  // During SSR + initial hydration, resolvedTheme can be undefined.
  // Render a stable button that won't change text until resolvedTheme exists.
  const isReady = resolvedTheme === "light" || resolvedTheme === "dark";
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        if (!isReady) return; // ignore clicks until theme is resolved
        setTheme(isDark ? "light" : "dark");
      }}
      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--card))",
        color: "rgb(var(--fg))",
      }}
      aria-label="Toggle theme"
      title="Toggle theme"
      disabled={!isReady}
    >
      {isReady ? (isDark ? "☀️ Light" : "🌙 Dark") : "Theme…"}
    </button>
  );
}
