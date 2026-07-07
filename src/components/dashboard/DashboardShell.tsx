"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Menu, Radio, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CdpMockNotice from "@/components/dashboard/CdpMockNotice";
import IntegrationStatusBar from "@/components/IntegrationStatusBar";
import { DASHBOARD_NAV, isDashboardNavActive } from "@/lib/dashboard-nav";
import { cn } from "@/lib/utils";

function DashboardNavLinks({
  pathname,
  onNavigate,
  className,
  linkClassName,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
  linkClassName?: string;
}) {
  return (
    <div className={className}>
      {DASHBOARD_NAV.map((item) => {
        const active = isDashboardNavActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/40 hover:text-foreground",
              linkClassName,
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex flex-col items-start gap-0.5">
              <span>{item.label}</span>
              {linkClassName?.includes("w-full") ? (
                <span className="text-xs font-normal text-muted-foreground">{item.description}</span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeItem = DASHBOARD_NAV.find((item) => isDashboardNavActive(pathname, item));

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground dark">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="relative space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <Activity className="mr-1.5 size-3.5" aria-hidden />
                Marketing dashboard
              </Badge>
              <div className="hidden sm:block">
                <IntegrationStatusBar />
              </div>
              {activeItem ? (
                <p className="truncate text-sm text-muted-foreground md:hidden">{activeItem.label}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant="outline"
                className="hidden gap-1.5 rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-700 sm:inline-flex dark:text-emerald-300"
              >
                <Radio className="size-3 animate-pulse" aria-hidden />
                Polling · 2s
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-expanded={menuOpen}
                aria-controls="dashboard-mobile-nav"
                aria-label={menuOpen ? "Close dashboard menu" : "Open dashboard menu"}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
              </Button>
            </div>
          </div>

          <nav
            aria-label="Dashboard sections"
            className="hidden gap-2 border-b border-border/60 pb-4 md:flex md:flex-wrap"
          >
            <DashboardNavLinks pathname={pathname} className="flex flex-wrap gap-2" />
          </nav>

          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/20 md:hidden"
                aria-label="Close dashboard menu"
                onClick={() => setMenuOpen(false)}
              />
              <nav
                id="dashboard-mobile-nav"
                className="absolute inset-x-0 top-full z-50 mt-2 rounded-xl border border-border/60 bg-background px-3 py-3 shadow-lg md:hidden"
                aria-label="Dashboard sections"
              >
                <DashboardNavLinks
                  pathname={pathname}
                  onNavigate={() => setMenuOpen(false)}
                  className="flex flex-col gap-1"
                  linkClassName="w-full"
                />
              </nav>
            </>
          ) : null}
        </header>

        <div className="sm:hidden">
          <IntegrationStatusBar />
        </div>

        <CdpMockNotice />

        {children}
      </div>
    </div>
  );
}
