import { NextResponse } from "next/server";
import { buildTemplateAnalysis, generateAiFunnelAnalysis } from "@/lib/ai-funnel-analysis";
import { computeQuizFunnelAggregate } from "@/lib/quiz-funnel";
import type { QuizFunnelAnalysis } from "@/lib/types";
import { listProfiles } from "@/lib/unomi-client";

const AI_CACHE_MS = 45_000;

let aiCache: {
  fingerprint: string;
  expiresAt: number;
  analysis: QuizFunnelAnalysis;
} | null = null;

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
    const skipAi = searchParams.get("ai") === "0";
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

    let analysis = buildTemplateAnalysis(aggregate, profiles);

    if (!skipAi && aggregate.totalVisitors > 0) {
      const now = Date.now();
      if (aiCache && aiCache.fingerprint === fingerprint && aiCache.expiresAt > now) {
        analysis = aiCache.analysis;
      } else {
        analysis = await generateAiFunnelAnalysis(aggregate, profiles);
        aiCache = {
          fingerprint,
          expiresAt: now + AI_CACHE_MS,
          analysis,
        };
      }
    }

    return NextResponse.json({ aggregate, analysis });
  } catch {
    return NextResponse.json({ error: "Failed to analyze quiz funnel" }, { status: 500 });
  }
}
