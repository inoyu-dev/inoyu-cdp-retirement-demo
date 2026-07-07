import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { buildTemplateAnalysis, generateAiFunnelAnalysis } from "@/lib/ai-funnel-analysis";
import { isOpenAiConfigured } from "@/lib/openai-config";
import { computeQuizFunnelAggregate } from "@/lib/quiz-funnel";
import {
  getCachedFunnelAnalysis,
  saveCachedFunnelAnalysis,
} from "@/lib/quiz-variant-store";
import type { QuizFunnelAnalysis } from "@/lib/types";
import { listProfiles } from "@/lib/unomi-client";

function funnelFingerprint(
  totalVisitors: number,
  hotspotStep: number | null,
  completed: number,
  abandoned: number,
  activeByStep: string,
): string {
  return `${totalVisitors}:${hotspotStep}:${completed}:${abandoned}:${activeByStep}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const useAi = searchParams.get("ai") === "1";
    const profiles = await listProfiles();
    const aggregate = computeQuizFunnelAggregate(profiles);
    const activeByStep = aggregate.steps.map((s) => `${s.step}:${s.activeNow}`).join(",");
    const fingerprint = funnelFingerprint(
      aggregate.totalVisitors,
      aggregate.hotspotStep,
      aggregate.completed,
      aggregate.abandoned,
      activeByStep,
    );

    const aiAvailable = isOpenAiConfigured();
    let analysis: QuizFunnelAnalysis = buildTemplateAnalysis(aggregate, profiles);
    let source: "template" | "ai" = "template";

    const cached = await getCachedFunnelAnalysis(fingerprint);
    if (cached && !useAi) {
      analysis = cached;
      source = "ai";
    } else if (useAi && aiAvailable && aggregate.totalVisitors > 0) {
      analysis = await generateAiFunnelAnalysis(aggregate, profiles);
      source = "ai";
      await saveCachedFunnelAnalysis(fingerprint, analysis);
    }

    return NextResponse.json({ aggregate, analysis, source, aiAvailable });
  } catch (error) {
    return apiErrorResponse("funnel", "Failed to analyze quiz funnel", error);
  }
}
