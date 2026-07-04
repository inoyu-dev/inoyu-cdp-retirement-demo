"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CdpMockNotice from "@/components/dashboard/CdpMockNotice";
import IntegrationStatusBar from "@/components/IntegrationStatusBar";
import { DASHBOARD_NAV, isDashboardNavActive } from "@/lib/dashboard-nav";
import { cn } from "@/lib/utils";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground dark">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <Activity className="mr-1.5 size-3.5" aria-hidden />
                Marketing dashboard
              </Badge>
              <IntegrationStatusBar />
            </div>
            <Badge
              variant="outline"
              className="gap-1.5 self-start rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              <Radio className="size-3 animate-pulse" aria-hidden />
              Polling · 2s
            </Badge>
          </div>

          <nav aria-label="Dashboard sections" className="flex flex-wrap gap-2 border-b border-border/60 pb-4">
            {DASHBOARD_NAV.map((item) => {
              const active = isDashboardNavActive(pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <CdpMockNotice />

        {children}
      </div>
    </div>
  );
}
