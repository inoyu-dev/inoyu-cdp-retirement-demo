/** Chart palette aligned with globals.css --chart-* tokens. */
export const CHART_COLORS = [
  "oklch(0.55 0.14 255)",
  "oklch(0.62 0.12 180)",
  "oklch(0.72 0.14 85)",
  "oklch(0.48 0.08 255)",
  "oklch(0.75 0.15 85)",
] as const;

export const CHART_HOTSPOT = "oklch(0.75 0.16 75)";
export const CHART_MUTED = "oklch(0.68 0.02 260 / 0.35)";

export const chartTooltipStyle = {
  contentStyle: {
    background: "oklch(0.18 0.025 260 / 0.95)",
    border: "1px solid oklch(1 0 0 / 12%)",
    borderRadius: "0.75rem",
    fontSize: "12px",
  },
  labelStyle: { color: "oklch(0.97 0.005 260)" },
  itemStyle: { color: "oklch(0.85 0.02 260)" },
} as const;

/** Shared motion for live quiz charts — Recharts + CSS pulse on data change. */
export const quizChartMotion = {
  duration: 850,
  easing: "ease-out" as const,
  begin: 0,
};
