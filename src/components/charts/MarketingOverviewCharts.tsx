"use client";

import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { VisitorProfile } from "@/lib/types";
import { CHART_COLORS, chartTooltipStyle } from "./chart-theme";

type Props = {
  profiles: VisitorProfile[];
};

export default function MarketingOverviewCharts({ profiles }: Props) {
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profiles) {
      counts[p.trafficSource] = (counts[p.trafficSource] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [profiles]);

  const funnelData = useMemo(() => {
    const completed = profiles.filter((p) => p.quiz?.completedAt).length;
    const started = profiles.filter((p) => p.quizFunnel?.maxStepReached).length;
    const abandoned = profiles.filter((p) => p.quizFunnel?.abandonedAtStep).length;
    const browsing = Math.max(0, profiles.length - started);
    return [
      { name: "Completed", value: completed, fill: CHART_COLORS[1] },
      { name: "In progress", value: Math.max(0, started - completed - abandoned), fill: CHART_COLORS[0] },
      { name: "Abandoned", value: abandoned, fill: CHART_COLORS[4] },
      { name: "Browsing", value: browsing, fill: CHART_COLORS[2] },
    ].filter((d) => d.value > 0);
  }, [profiles]);

  const completionRate = profiles.length
    ? Math.round((profiles.filter((p) => p.quiz?.completedAt).length / profiles.length) * 100)
    : 0;

  const radialData = [{ name: "Completion", value: completionRate, fill: CHART_COLORS[0] }];

  if (profiles.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-border/60 bg-card/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Completion rate</p>
        <ResponsiveContainer width="100%" height={140}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="100%"
            data={radialData}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar background dataKey="value" cornerRadius={8} animationDuration={900} />
            <Tooltip {...chartTooltipStyle} formatter={(value) => [`${value ?? 0}%`, "Rate"]} />
          </RadialBarChart>
        </ResponsiveContainer>
        <p className="text-center text-2xl font-semibold tabular-nums text-primary">{completionRate}%</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Traffic sources</p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={sourceData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={58}
              paddingAngle={3}
              animationDuration={700}
            >
              {sourceData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...chartTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Visitor outcomes</p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={funnelData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={58}
              animationDuration={700}
            >
              {funnelData.map((entry, i) => (
                <Cell key={entry.name} fill={entry.fill ?? CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...chartTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
