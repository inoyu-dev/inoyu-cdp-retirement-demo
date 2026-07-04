"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AgentChartSpec } from "@/lib/unomi-mcp-tools";
import { CHART_COLORS, chartTooltipStyle } from "./chart-theme";

type Props = {
  chart: AgentChartSpec;
};

export default function RechartsAgentChart({ chart }: Props) {
  const data = chart.labels.map((label, i) => ({
    name: label,
    value: chart.values[i] ?? 0,
  }));

  if (chart.type === "pie") {
    return (
      <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
        <p className="text-sm font-medium">{chart.title}</p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...chartTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Source: {chart.source} CDP</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
      <p className="text-sm font-medium">{chart.title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 260)" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.02 260)" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...chartTooltipStyle} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Source: {chart.source} CDP · live query</p>
    </div>
  );
}
