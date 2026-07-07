import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { generateQuizVariantProposal } from "@/lib/ai-quiz-variant-proposal";
import { buildTemplateAnalysis, generateAiFunnelAnalysis } from "@/lib/ai-funnel-analysis";
import { computeQuizFunnelAggregate } from "@/lib/quiz-funnel";
import { savePendingProposal } from "@/lib/quiz-variant-store";
import { isOpenAiConfigured } from "@/lib/openai-config";
import { listProfiles } from "@/lib/unomi-client";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { useAi?: boolean };
    const wantAi = body.useAi === true && isOpenAiConfigured();

    const store = await import("@/lib/quiz-variant-store").then((m) => m.getQuizExperimentStore());
    if (store.pendingProposal) {
      return NextResponse.json({
        proposal: store.pendingProposal,
        message: "A proposal is already pending marketer review.",
      });
    }

    const profiles = await listProfiles();
    const aggregate = computeQuizFunnelAggregate(profiles);
    if (aggregate.totalVisitors === 0) {
      return NextResponse.json({ error: "Not enough funnel data yet" }, { status: 400 });
    }

    let analysis = buildTemplateAnalysis(aggregate, profiles);
    if (wantAi) {
      analysis = await generateAiFunnelAnalysis(aggregate, profiles);
    }

    const proposal = await generateQuizVariantProposal(aggregate, analysis, { useAi: wantAi });
    if (!proposal) {
      return NextResponse.json({ error: "No actionable hotspot to optimize" }, { status: 400 });
    }

    await savePendingProposal(proposal);
    return NextResponse.json({ proposal, source: wantAi ? "ai" : "template" });
  } catch (error) {
    return apiErrorResponse("propose", "Failed to generate variant proposal", error);
  }
}
