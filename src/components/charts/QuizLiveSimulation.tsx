"use client";

import type { ReactNode } from "react";
import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QuizStepId } from "@/lib/quiz-flow";
import {
  buildChannelFit,
  buildConcernWeights,
  buildNestEggProjection,
  buildReadinessFactors,
  formatCompactUsd,
  previewRetirementScore,
  savingsBandLabel,
  type QuizSimulationInput,
} from "@/lib/quiz-simulation";
import { useAnimatedNumber, useChartUpdatePulse } from "@/hooks/useAnimatedNumber";
import { cn } from "@/lib/utils";
import {
  CHART_COLORS,
  CHART_HOTSPOT,
  CHART_MUTED,
  chartTooltipStyle,
  quizChartMotion,
} from "./chart-theme";

type Props = {
  moduleId: QuizStepId;
  input: QuizSimulationInput;
  variant?: "compact" | "hero";
};

const barMotion = {
  isAnimationActive: true,
  animationDuration: quizChartMotion.duration,
  animationEasing: quizChartMotion.easing,
  animationBegin: quizChartMotion.begin,
} as const;

const areaMotion = {
  isAnimationActive: true,
  animationDuration: quizChartMotion.duration,
  animationEasing: quizChartMotion.easing,
  animationBegin: quizChartMotion.begin,
} as const;

function ChartShell({
  title,
  subtitle,
  children,
  variant,
  score,
  pulsing,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  variant: "compact" | "hero";
  score?: number;
  pulsing?: boolean;
}) {
  const animatedScore = useAnimatedNumber(score ?? 0, quizChartMotion.duration);

  return (
    <div
      className={
        variant === "hero"
          ? "rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm sm:p-5"
          : "mb-4 rounded-xl border border-border/50 bg-muted/20 p-3"
      }
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p
            className={
              variant === "hero"
                ? "text-sm font-semibold text-foreground"
                : "text-xs font-medium uppercase tracking-wide text-muted-foreground"
            }
          >
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {score !== undefined ? (
          <div
            className={cn(
              "shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-right transition-transform duration-300",
              pulsing && "quiz-live-score-pulse",
            )}
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Live score</p>
            <p className="text-lg font-semibold tabular-nums text-primary">{animatedScore}</p>
          </div>
        ) : null}
      </div>
      <div className={cn("quiz-live-chart", pulsing && "quiz-live-chart--updating")}>{children}</div>
    </div>
  );
}

export default function QuizLiveSimulation({ moduleId, input, variant = "compact" }: Props) {
  const gradientId = useId().replace(/:/g, "");
  const liveScore = useMemo(() => previewRetirementScore(input), [input]);
  const projection = useMemo(() => buildNestEggProjection(input), [input]);
  const factors = useMemo(() => buildReadinessFactors(input), [input]);
  const concerns = useMemo(() => buildConcernWeights(input.primaryConcern), [input.primaryConcern]);
  const channels = useMemo(() => buildChannelFit(input), [input]);

  const pulseDeps = useMemo(
    () => [
      input.age,
      input.retireYears,
      input.currentSavings,
      input.primaryConcern,
      input.contactChannel,
      input.contactRegion,
      moduleId,
    ],
    [input, moduleId],
  );
  const pulsing = useChartUpdatePulse(pulseDeps);

  const projectionKey = `${input.age}-${input.retireYears}-${input.currentSavings}`;
  const factorsKey = `${projectionKey}-${input.primaryConcern}`;
  const channelsKey = `${input.contactChannel}-${input.contactRegion}-${input.locale ?? "en"}`;
  const concernsKey = input.primaryConcern;

  const height = variant === "hero" ? 240 : 150;

  if (moduleId === 1) {
    const retireAge = input.age + input.retireYears;
    const heroSubtitle = `${savingsBandLabel(input.currentSavings)} - retire around age ${retireAge} - updates as you type`;
    const targetY = projection[projection.length - 1]?.target;

    return (
      <ChartShell
        variant={variant}
        title={variant === "hero" ? "Your retirement path" : "Savings projection"}
        subtitle={
          variant === "hero"
            ? heroSubtitle
            : `Based on ${input.retireYears} years and your savings band`
        }
        score={liveScore}
        pulsing={pulsing}
      >
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            key={projectionKey}
            data={projection}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.45} />
                <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_MUTED} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatCompactUsd(Number(v))}
              tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              {...chartTooltipStyle}
              formatter={(value, name) => [
                formatCompactUsd(Number(value ?? 0)),
                name === "projected" ? "Projected savings" : "Target band",
              ]}
            />
            {targetY !== undefined ? (
              <ReferenceLine
                key={`target-${targetY}`}
                y={targetY}
                stroke={CHART_COLORS[2]}
                strokeDasharray="4 4"
                label={{
                  value: "Target",
                  position: "insideTopRight",
                  fill: "oklch(0.72 0.14 85)",
                  fontSize: 10,
                }}
              />
            ) : null}
            <Area
              {...areaMotion}
              type="monotone"
              dataKey="projected"
              stroke={CHART_COLORS[0]}
              fill={`url(#${gradientId})`}
              strokeWidth={2}
              dot={variant === "hero" ? { r: 3, strokeWidth: 0 } : false}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  if (moduleId === 2) {
    return (
      <ChartShell
        variant={variant}
        title="Readiness snapshot"
        subtitle="How your answers shape the score so far"
        score={liveScore}
        pulsing={pulsing}
      >
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            key={factorsKey}
            data={factors}
            layout="vertical"
            margin={{ left: 4, right: 8, top: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_MUTED} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="factor"
              width={92}
              tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              {...chartTooltipStyle}
              formatter={(value) => [`${value ?? 0}/100`, "Factor"]}
            />
            <Bar {...barMotion} dataKey="score" radius={[0, 6, 6, 0]}>
              {factors.map((entry) => (
                <Cell
                  key={entry.factor}
                  fill={entry.highlight ? CHART_HOTSPOT : CHART_COLORS[1]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  if (moduleId === 3) {
    return (
      <ChartShell
        variant={variant}
        title="Follow-up fit"
        subtitle="Channel match for your region - changes when you pick one"
        score={liveScore}
        pulsing={pulsing}
      >
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            key={channelsKey}
            data={channels}
            margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_MUTED} vertical={false} />
            <XAxis
              dataKey="channel"
              tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={42}
            />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              {...chartTooltipStyle}
              formatter={(value) => [`${value ?? 0}%`, "Match"]}
            />
            <Bar {...barMotion} dataKey="fit" radius={[6, 6, 0, 0]}>
              {channels.map((entry) => (
                <Cell
                  key={entry.channel}
                  fill={entry.selected ? CHART_COLORS[0] : CHART_MUTED}
                  className="transition-[fill] duration-500"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      variant={variant}
      title="What matters most"
      subtitle="Your top concern vs other common worries"
      score={liveScore}
      pulsing={pulsing}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          key={concernsKey}
          data={concerns}
          margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_MUTED} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-12}
            textAnchor="end"
            height={48}
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip {...chartTooltipStyle} formatter={(value) => [value ?? 0, "Focus"]} />
          <Bar {...barMotion} dataKey="weight" radius={[6, 6, 0, 0]}>
            {concerns.map((entry) => (
              <Cell
                key={entry.id}
                fill={entry.id === input.primaryConcern ? CHART_HOTSPOT : CHART_COLORS[3]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
