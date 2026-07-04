import { NextResponse } from "next/server";
import { generateQuizVariantProposal } from "@/lib/ai-quiz-variant-proposal";
import { buildTemplateAnalysis, generateAiFunnelAnalysis } from "@/lib/ai-funnel-analysis";
import { computeQuizFunnelAggregate } from "@/lib/quiz-funnel";
import { getQuizExperimentStore, savePendingProposal } from "@/lib/quiz-variant-store";
import { isOpenAiConfigured } from "@/lib/openai-config";
import { listProfiles } from "@/lib/unomi-client";

export async function POST() {
  try {
    const store = await getQuizExperimentStore();
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
    if (isOpenAiConfigured()) {
      analysis = await generateAiFunnelAnalysis(aggregate, profiles);
    }

    const proposal = await generateQuizVariantProposal(aggregate, analysis);
    if (!proposal) {
      return NextResponse.json({ error: "No actionable hotspot to optimize" }, { status: 400 });
    }

    await savePendingProposal(proposal);
    return NextResponse.json({ proposal });
  } catch {
    return NextResponse.json({ error: "Failed to generate variant proposal" }, { status: 500 });
  }
}
