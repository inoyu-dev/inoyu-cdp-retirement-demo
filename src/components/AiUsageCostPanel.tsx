"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, Loader2, Sparkles } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AI_USAGE_FEATURE_LABELS,
  type AiUsageFeature,
  type AiUsageSnapshot,
} from "@/lib/ai-usage-types";
import { CHART_COLORS, chartTooltipStyle } from "@/components/charts/chart-theme";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatUsd(n: number): string {
  if (n < 0.01 && n > 0) return "< $0.01";
  return `$${n.toFixed(n >= 1 ? 2 : 3)}`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function AiUsageCostPanel() {
  const [usage, setUsage] = useState<AiUsageSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      const res = await fetch("/api/ai-usage", { cache: "no-store" });
      if (res.ok) setUsage((await res.json()) as AiUsageSnapshot);
      setLoading(false);
    };
    void refresh();
    const id = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(id);
  }, []);

  const chartData = useMemo(() => {
    if (!usage) return [];
    return (Object.entries(usage.byFeature) as Array<[AiUsageFeature, typeof usage.totals]>)
      .filter(([, totals]) => totals.requestCount > 0)
      .map(([feature, totals], index) => ({
        feature,
        label: AI_USAGE_FEATURE_LABELS[feature],
        tokens: totals.totalTokens,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.tokens - a.tokens);
  }, [usage]);

  if (loading && !usage) {
    return (
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading AI usage…
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!usage) return null;

  const costHint = usage.costRates.configured
    ? `Rates: $${usage.costRates.inputPerMillionUsd}/M input · $${usage.costRates.outputPerMillionUsd}/M output`
    : "Estimated using default model pricing.";

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden />
            AI token usage & cost estimate
          </CardTitle>
          <Badge variant="outline" className="gap-1.5">
            <Coins className="size-3.5" aria-hidden />
            {usage.provider} · {usage.model}
          </Badge>
        </div>
        <CardDescription>
          Live counter of LLM tokens consumed across dashboard and visitor AI features. {costHint}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Total tokens"
            value={formatTokens(usage.totals.totalTokens)}
            hint={`${usage.totals.requestCount} API calls`}
          />
          <Stat
            label="Today"
            value={formatTokens(usage.today.totalTokens)}
            hint={`${usage.today.requestCount} calls today`}
          />
          <Stat
            label="Est. total cost"
            value={formatUsd(usage.estimatedCostUsd)}
            hint={`In ${formatTokens(usage.totals.promptTokens)} · out ${formatTokens(usage.totals.completionTokens)}`}
          />
          <Stat
            label="Est. today"
            value={formatUsd(usage.estimatedCostTodayUsd)}
            hint={`In ${formatTokens(usage.today.promptTokens)} · out ${formatTokens(usage.today.completionTokens)}`}
          />
        </div>

        {chartData.length > 0 ? (
          <div className="rounded-xl border border-border/60 bg-background/30 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tokens by feature
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(1 0 0 / 8%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatTokens(Number(v))} />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  {...chartTooltipStyle}
                  formatter={(value) => [formatTokens(Number(value ?? 0)), "Tokens"]}
                />
                <Bar dataKey="tokens" radius={[0, 6, 6, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No AI calls recorded yet. Token counts appear here when summaries, funnel analysis, chat, or SMS AI run.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
