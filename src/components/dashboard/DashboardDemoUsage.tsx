"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, ExternalLink, RefreshCw, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/dashboard/StatCard";
import { showcaseModeLabel } from "@/lib/integrations-health";

type DemoUserRow = {
  demoUserId: string;
  username: string;
  firstSeenAt: string;
  lastSeenAt: string;
  loginCount: number;
  sessionCount: number;
  returnVisitCount: number;
  totalPageViews: number;
  totalDwellSeconds: number;
  lastPath?: string;
  pagesVisited: Record<string, number>;
  events: Array<{ id: string; eventType: string; timestamp: string; properties: Record<string, unknown> }>;
};

type DemoAnalyticsPayload = {
  checkedAt: string;
  unomiConfigured: boolean;
  unomiConnected: boolean;
  showcaseMode: string;
  users: DemoUserRow[];
  unomiDemoProfileCount: number;
  unomiSearchOk: boolean;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.round(mins / 60)}h ${mins % 60}m`;
}

export default function DashboardDemoUsage() {
  const [payload, setPayload] = useState<DemoAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/demo-analytics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPayload((await res.json()) as DemoAnalyticsPayload);
      setError(null);
    } catch {
      setError("Could not load demo usage data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const users = payload?.users ?? [];
  const activeToday = users.filter((user) => Date.now() - new Date(user.lastSeenAt).getTime() < 86400000).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Demo usage</h1>
          <p className="max-w-2xl text-muted-foreground">
            Who signed into the demo, what they opened, and how long they stayed. When Unomi is connected,
            the same activity is mirrored under source <code className="rounded bg-muted px-1.5 py-0.5 text-sm">demo_platform</code>.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 size-4" aria-hidden />
          Refresh
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Demo testers tracked" value={users.length} />
        <StatCard label="Active in last 24h" value={activeToday} />
        <StatCard label="Total logins" value={users.reduce((sum, user) => sum + user.loginCount, 0)} />
        <StatCard label="Unomi demo profiles" value={payload?.unomiConfigured ? (payload.unomiConnected ? payload.unomiDemoProfileCount : "offline") : "mock only"} />
      </div>
      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><UserCheck className="size-5 text-primary" aria-hidden />Unomi lookup</CardTitle>
          <CardDescription>
            Search Unomi for profiles where <code className="rounded bg-muted px-1 py-0.5 text-xs">properties.profileKind</code> equals
            <code className="rounded bg-muted px-1 py-0.5 text-xs"> demo_tester</code>, or filter events by source
            <code className="rounded bg-muted px-1 py-0.5 text-xs"> demo_platform</code>. Quiz activity from signed-in testers also carries
            <code className="rounded bg-muted px-1 py-0.5 text-xs"> demoTesterId</code> on <code className="rounded bg-muted px-1 py-0.5 text-xs">inoyu_cdp_retirement</code> events.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant={payload?.unomiConnected ? "default" : "secondary"}>
            Unomi {payload?.unomiConnected ? "connected" : payload?.unomiConfigured ? "error" : "not configured"}
          </Badge>
          <Badge variant="outline">Integration mode: {showcaseModeLabel(payload?.showcaseMode)}</Badge>
          {payload?.unomiConfigured ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <ExternalLink className="size-3.5" aria-hidden />
              Register schemas: <code className="text-xs">npm run verify:unomi:schemas</code>
            </span>
          ) : null}
        </CardContent>
      </Card>
      <section className="space-y-4">
        <div className="flex items-center gap-2"><Users className="size-5 text-primary" aria-hidden /><h2 className="text-lg font-semibold">Tester sessions</h2></div>
        {loading && !payload ? (
          <p className="text-sm text-muted-foreground">Loading demo usage…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No demo logins recorded yet. Share the login URL and password with your prospect — activity appears here after the first sign-in.</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => {
              const topPages = Object.entries(user.pagesVisited).sort((a, b) => b[1] - a[1]).slice(0, 4);
              const recentEvents = user.events.slice(0, 6);
              return (
                <Card key={user.demoUserId} className="border-border/60 bg-card/50">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{user.username}</CardTitle>
                        <CardDescription className="font-mono text-xs">{user.demoUserId}</CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{user.loginCount} logins</Badge>
                        {user.returnVisitCount > 0 ? <Badge variant="outline">{user.returnVisitCount} return visits</Badge> : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div><p className="text-xs uppercase tracking-wide text-muted-foreground">First seen</p><p>{formatWhen(user.firstSeenAt)}</p></div>
                      <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Last seen</p><p className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{formatWhen(user.lastSeenAt)}</p></div>
                      <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Page views</p><p>{user.totalPageViews}</p></div>
                      <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Time on site</p><p>{formatDuration(user.totalDwellSeconds)}</p></div>
                    </div>
                    {user.lastPath ? <p className="text-muted-foreground">Last page: <span className="text-foreground">{user.lastPath}</span></p> : null}
                    {topPages.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Top pages</p>
                        <div className="flex flex-wrap gap-2">{topPages.map(([path, count]) => (<Badge key={path} variant="outline">{path} · {count}</Badge>))}</div>
                      </div>
                    ) : null}
                    {recentEvents.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Recent activity</p>
                        <ul className="space-y-1 font-mono text-xs text-muted-foreground">
                          {recentEvents.map((event) => (
                            <li key={event.id}>
                              {formatWhen(event.timestamp)} · {event.eventType}
                              {typeof event.properties.path === "string" ? ` · ${event.properties.path}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
