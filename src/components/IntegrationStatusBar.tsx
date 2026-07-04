"use client";

import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIntegrationsHealth } from "@/hooks/useIntegrationsHealth";
import { cn } from "@/lib/utils";

export default function IntegrationStatusBar() {
  const { health, loading } = useIntegrationsHealth();

  if (loading && !health) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Checking integrations…
      </Badge>
    );
  }

  if (!health) return null;

  const { showcaseMode, cdpMode } = health;
  const showcaseLive = showcaseMode === "full-live" || showcaseMode === "demo-live";

  const showcaseLabel =
    showcaseMode === "full-live"
      ? "Live showcase"
      : showcaseMode === "demo-live"
        ? "Contest demo"
        : "Local fallback";

  const unomiLabel =
    cdpMode === "unomi-live"
      ? "connected"
      : cdpMode === "unomi-mock"
        ? "mocked locally"
        : health.unomi.configured
          ? "error"
          : "mocked locally";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant={showcaseLive ? "default" : "secondary"}
        className={cn("gap-1.5", showcaseLive && "bg-emerald-600 hover:bg-emerald-600")}
      >
        {showcaseLive ? <Cloud className="size-3.5" aria-hidden /> : <CloudOff className="size-3.5" aria-hidden />}
        {showcaseLabel}
      </Badge>
      <Badge
        variant="outline"
        className={health.openai.ok ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300" : ""}
      >
        LLM {health.openai.ok ? "connected" : "templates"}
      </Badge>
      <Badge
        variant="outline"
        className={
          cdpMode === "unomi-live"
            ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
            : cdpMode === "unomi-mock"
              ? "border-amber-500/40 text-amber-800 dark:text-amber-300"
              : ""
        }
      >
        Unomi {unomiLabel}
      </Badge>
    </div>
  );
}
