"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatCard from "@/components/dashboard/StatCard";
import MarketingOverviewCharts from "@/components/charts/MarketingOverviewCharts";
import { useDashboardProfiles } from "@/hooks/useDashboardProfiles";
import { DASHBOARD_NAV } from "@/lib/dashboard-nav";

export default function DashboardOverview() {
  const { profiles } = useDashboardProfiles();

  const completed = profiles.filter((p) => p.quiz?.completedAt).length;
  const converted = profiles.filter((p) => p.converted).length;
  const avgLeadScore = profiles.length
    ? Math.round(profiles.reduce((sum, p) => sum + (p.leadScore ?? 0), 0) / profiles.length)
    : 0;
  const recent = [...profiles]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const quickLinks = DASHBOARD_NAV.filter((item) => item.href !== "/dashboard");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Overview
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Live session counts and traffic mix — drill into visitors, funnel, or AI tools when you need detail.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active sessions" value={profiles.length} />
        <StatCard label="Completed quizzes" value={completed} />
        <StatCard label="Avg lead score" value={profiles.length ? avgLeadScore : "—"} />
        <StatCard label="Converted" value={converted} />
      </div>

      <MarketingOverviewCharts profiles={profiles} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block">
              <Card className="h-full border-border/60 bg-card/50 transition-colors hover:border-primary/40 hover:bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="size-4 text-primary" aria-hidden />
                    {item.label}
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recent visitors</h2>
            <p className="text-sm text-muted-foreground">
              Latest activity — open a profile for the full brief and timeline.
            </p>
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard/visitors" />}>
            View all
          </Button>
        </div>
        {recent.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No visitors yet — share the quiz landing page to see live sessions here.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-2">
            {recent.map((p) => (
              <li key={p.profileId}>
                <Link
                  href={`/dashboard/visitors?profileId=${encodeURIComponent(p.profileId)}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-card/80"
                >
                  <span className="font-medium">{p.quiz?.firstName ?? "Anonymous"}</span>
                  <span className="text-sm text-muted-foreground">
                    {p.trafficSource} · score {p.leadScore || "—"}
                    {p.quiz?.completedAt ? " · completed" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
