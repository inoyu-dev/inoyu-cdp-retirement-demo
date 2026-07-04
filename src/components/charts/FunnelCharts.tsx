"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QuizFunnelAggregate } from "@/lib/types";
import { CHART_COLORS, CHART_HOTSPOT, CHART_MUTED, chartTooltipStyle } from "./chart-theme";

type Props = {
  aggregate: QuizFunnelAggregate;
};

export function FunnelBarChart({ aggregate }: Props) {
  const data = aggregate.steps.map((s) => ({
    name: `Step ${s.step}`,
    label: s.title,
    entered: s.entered,
    abandoned: s.abandoned,
    active: s.activeNow,
    hotspot: aggregate.hotspotStep === s.step,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_MUTED} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          {...chartTooltipStyle}
          formatter={(value, name) => [value ?? 0, name === "entered" ? "Entered" : String(name)]}
          labelFormatter={(_, payload) =>
            (payload?.[0]?.payload as { label?: string } | undefined)?.label ?? ""
          }
        />
        <Bar dataKey="entered" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.hotspot ? CHART_HOTSPOT : CHART_COLORS[0]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelAreaChart({ aggregate }: Props) {
  const data = aggregate.steps.map((s) => ({
    step: s.step,
    name: s.title.split(" ")[0],
    visitors: s.entered,
    dropOff: Math.round(s.dropOffRate * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="funnelArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.45} />
            <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_MUTED} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip {...chartTooltipStyle} />
        <Area
          type="monotone"
          dataKey="visitors"
          stroke={CHART_COLORS[1]}
          strokeWidth={2.5}
          fill="url(#funnelArea)"
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
