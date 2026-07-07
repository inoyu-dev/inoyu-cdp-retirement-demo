"use client";

import { useMemo } from "react";
import { Activity, Gauge, MousePointer2, Type } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS, CHART_MUTED, chartTooltipStyle } from "@/components/charts/chart-theme";
import { pointerComfortLabel, technicalComfortLabel } from "@/lib/quiz-engagement";
import type { VisitorProfile } from "@/lib/types";
function ComfortGauge({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  const pct =
    value.toLowerCase().includes("high") ? 88 : value.toLowerCase().includes("moderate") ? 58 : value.toLowerCase().includes("low") ? 28 : 12;

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <p className="mb-2 text-lg font-semibold">{value}</p>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-chart-4 via-chart-2 to-chart-3"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type Props = { profile: VisitorProfile };

export default function ProfileEngagementPanel({ profile }: Props) {
  const engagement = profile.quizEngagement;
  const chartData = useMemo(
    () =>
      engagement?.stepSummaries.map((step, index) => ({
        step: `Step ${step.step}`,
        active: step.activeSeconds,
        idle: Math.max(0, step.durationSeconds - step.activeSeconds),
        engagement: step.engagementScore,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      })) ?? [],
    [engagement?.stepSummaries],
  );

  if (!engagement || engagement.stepSummaries.length === 0) return null;

  return (
    <Card className="overflow-hidden border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="size-5 text-primary" aria-hidden />
          Quiz behavior analytics
        </CardTitle>
        <CardDescription>
          Step timing, activity intensity, typing pace, and pointer precision — privacy-safe signals only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Type className="size-3.5" aria-hidden />
            {technicalComfortLabel(engagement.overallTechnicalComfort)}
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <MousePointer2 className="size-3.5" aria-hidden />
            {pointerComfortLabel(engagement.overallPointerComfort ?? "unknown")}
          </Badge>
          <Badge variant="outline">{engagement.totalDurationSeconds}s total time</Badge>
          <Badge variant="outline">Engagement {engagement.avgEngagementScore}/100</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Active vs idle seconds per step
            </p>
            <div className="h-[200px] w-full min-w-0 sm:h-[220px]"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" vertical={false} />
                <XAxis dataKey="step" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="active" stackId="time" radius={[0, 0, 0, 0]} fill={CHART_COLORS[1]} name="Active" />
                <Bar dataKey="idle" stackId="time" radius={[6, 6, 0, 0]} fill={CHART_MUTED} name="Idle" />
              </BarChart>
            </ResponsiveContainer></div>
          </div>

          <div className="space-y-3">
            <ComfortGauge
              label="Typing comfort"
              value={technicalComfortLabel(engagement.overallTechnicalComfort)}
              icon={<Type className="size-4 text-primary" aria-hidden />}
            />
            <ComfortGauge
              label="Pointer precision"
              value={pointerComfortLabel(engagement.overallPointerComfort ?? "unknown")}
              icon={<MousePointer2 className="size-4 text-chart-2" aria-hidden />}
            />
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Gauge className="size-4 text-chart-3" aria-hidden />
                Avg engagement
              </div>
              <p className="text-3xl font-semibold tabular-nums">{engagement.avgEngagementScore}</p>
              <p className="text-xs text-muted-foreground">Composite score across completed steps</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {engagement.stepSummaries.map((step, index) => (
            <div
              key={step.step}
              className="rounded-xl border border-border/60 bg-card/50 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-medium">Step {step.step}</p>
                <Badge variant="outline" className="tabular-nums">
                  {step.engagementScore}/100
                </Badge>
              </div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${step.engagementScore}%`,
                    background: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <div>
                  <dt className="inline">Duration </dt>
                  <dd className="inline font-medium text-foreground">{step.durationSeconds}s</dd>
                </div>
                <div>
                  <dt className="inline">Active </dt>
                  <dd className="inline font-medium text-foreground">{step.activeSeconds}s</dd>
                </div>
                <div>
                  <dt className="inline">Moves </dt>
                  <dd className="inline font-medium text-foreground">{step.mouseMovements}</dd>
                </div>
                {step.avgTypingIntervalMs ? (
                  <div>
                    <dt className="inline">Typing </dt>
                    <dd className="inline font-medium text-foreground">~{step.avgTypingIntervalMs}ms</dd>
                  </div>
                ) : null}
                {step.impreciseClicks ? (
                  <div className="col-span-2">
                    <dt className="inline">Miss-clicks </dt>
                    <dd className="inline font-medium text-foreground">{step.impreciseClicks}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

