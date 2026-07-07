"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiContentSource } from "@/components/AiGenerateButton";
import type { QuizFunnelAggregate, QuizFunnelAnalysis } from "@/lib/types";

export function useDashboardFunnel(pollMs = 15000) {
  const [aggregate, setAggregate] = useState<QuizFunnelAggregate | null>(null);
  const [analysis, setAnalysis] = useState<QuizFunnelAnalysis | null>(null);
  const [analysisSource, setAnalysisSource] = useState<AiContentSource>("template");
  const [aiAvailable, setAiAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const refresh = useCallback(async (withAi = false) => {
    if (withAi) setGeneratingAi(true);
    else setLoading(true);

    const url = withAi ? "/api/funnel?ai=1" : "/api/funnel";
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as {
        aggregate: QuizFunnelAggregate;
        analysis: QuizFunnelAnalysis;
        source?: AiContentSource;
        aiAvailable?: boolean;
      };
      setAggregate(data.aggregate);
      setAnalysis(data.analysis);
      setAnalysisSource(data.source ?? (withAi ? "ai" : "template"));
      setAiAvailable(Boolean(data.aiAvailable));
    }

    setLoading(false);
    setGeneratingAi(false);
  }, []);

  const generateAiAnalysis = useCallback(async () => {
    await refresh(true);
  }, [refresh]);

  useEffect(() => {
    void refresh(false);
    if (pollMs <= 0) return;
    const id = setInterval(() => void refresh(false), pollMs);
    return () => clearInterval(id);
  }, [pollMs, refresh]);

  return {
    aggregate,
    analysis,
    analysisSource,
    aiAvailable,
    loading,
    generatingAi,
    refresh: () => refresh(false),
    generateAiAnalysis,
  };
}
