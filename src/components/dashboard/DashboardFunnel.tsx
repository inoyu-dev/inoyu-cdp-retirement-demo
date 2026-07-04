"use client";

import { Loader2, Sparkles, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FunnelAreaChart, FunnelBarChart } from "@/components/charts/FunnelCharts";
import { useDashboardFunnel } from "@/hooks/useDashboardFunnel";
import { cn } from "@/lib/utils";

export default function DashboardFunnel() {
  const { aggregate, analysis, loading } = useDashboardFunnel();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Quiz funnel
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Where visitors enter, stall, or abandon — AI highlights likely friction points.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <TrendingDown className="size-5 text-amber-500" aria-hidden />
              Step traffic
            </h2>
          </div>
          {loading ? (
            <Badge variant="outline" className="gap-1.5">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Analyzing…
            </Badge>
          ) : null}
        </div>

        {aggregate && aggregate.totalVisitors > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,22rem)]">
            <Card className="border-border/60 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Step traffic</CardTitle>
                <CardDescription>
                  {aggregate.completed} completed · {aggregate.inProgress} in progress ·{" "}
                  {aggregate.abandoned} abandoned · {Math.round(aggregate.completionRate * 100)}% completion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FunnelBarChart aggregate={aggregate} />
                <FunnelAreaChart aggregate={aggregate} />
                <div className="space-y-3 border-t border-border/60 pt-4">
                  {aggregate.steps.map((stepStats) => {
                    const isHotspot = aggregate.hotspotStep === stepStats.step;
                    const barWidth =
                      aggregate.totalVisitors > 0
                        ? Math.max(8, Math.round((stepStats.entered / aggregate.totalVisitors) * 100))
                        : 0;
                    return (
                      <div key={stepStats.step} className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className={cn("font-medium", isHotspot && "text-amber-600 dark:text-amber-400")}>
                            {stepStats.step}. {stepStats.title}
                            {isHotspot ? " · hotspot" : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {stepStats.entered} entered
                            {stepStats.activeNow > 0 ? ` · ${stepStats.activeNow} active` : ""}
                            {stepStats.abandoned > 0 ? ` · ${stepStats.abandoned} left` : ""}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              isHotspot ? "bg-amber-500" : "bg-primary/70",
                            )}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {stepStats.hint}
                          {stepStats.avgDurationSeconds !== null ? ` · avg ${stepStats.avgDurationSeconds}s` : ""}
                          {stepStats.dropOffRate > 0
                            ? ` · ${Math.round(stepStats.dropOffRate * 100)}% drop-off`
                            : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-amber-600" aria-hidden />
                  AI friction analysis
                </CardTitle>
                <CardDescription>{analysis?.confidence ?? "low"} confidence</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {analysis ? (
                  <>
                    <p className="font-medium leading-snug">{analysis.headline}</p>
                    <p className="leading-relaxed text-muted-foreground">{analysis.summary}</p>
                    {analysis.hypotheses.length > 0 ? (
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Why visitors may stall
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                          {analysis.hypotheses.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {analysis.recommendations.length > 0 ? (
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          What to test
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                          {analysis.recommendations.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">Waiting for funnel data…</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-dashed border-border/60">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No quiz sessions yet — step drop-offs and AI insights will appear once visitors start the quiz.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
