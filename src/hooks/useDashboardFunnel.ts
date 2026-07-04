"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizFunnelAggregate, QuizFunnelAnalysis } from "@/lib/types";

export function useDashboardFunnel(pollMs = 15000) {
  const [aggregate, setAggregate] = useState<QuizFunnelAggregate | null>(null);
  const [analysis, setAnalysis] = useState<QuizFunnelAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/funnel", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as {
        aggregate: QuizFunnelAggregate;
        analysis: QuizFunnelAnalysis;
      };
      setAggregate(data.aggregate);
      setAnalysis(data.analysis);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    if (pollMs <= 0) return;
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [pollMs, refresh]);

  return { aggregate, analysis, loading, refresh };
}
