"use client";

import { useEffect, useState } from "react";
import type { IntegrationsHealthPayload } from "@/lib/integrations-health";

export function useIntegrationsHealth(pollMs = 60_000) {
  const [health, setHealth] = useState<IntegrationsHealthPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      const res = await fetch("/api/integrations/health", { cache: "no-store" });
      if (res.ok) setHealth((await res.json()) as IntegrationsHealthPayload);
      setLoading(false);
    };
    void refresh();
    if (pollMs <= 0) return;
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { health, loading };
}
