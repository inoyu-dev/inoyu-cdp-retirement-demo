import type {
  QuizFunnelAggregate,
  QuizFunnelAnalysis,
  QuizVariantProposal,
  QuizVariantTweaks,
} from "./types";
import type { QuizStepId } from "./quiz-flow";
import { DEFAULT_STEP_ORDER, formatStepOrder } from "./quiz-variants";
import { isOpenAiConfigured, openAiChatCompletionJson } from "./openai-config";

function proposalId(): string {
  return `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function reorderForHotspot(
  hotspot: QuizStepId,
): [QuizStepId, QuizStepId, QuizStepId, QuizStepId] {
  switch (hotspot) {
    case 1:
      return [2, 1, 3, 4];
    case 2:
      return [1, 3, 2, 4];
    case 3:
      return [1, 2, 3, 4];
    case 4:
      return [1, 2, 3, 4];
    default: {
      const _exhaustive: never = hotspot;
      return _exhaustive;
    }
  }
}

function tweaksForHotspot(hotspot: QuizStepId): QuizVariantTweaks {
  switch (hotspot) {
    case 1:
      return {};
    case 2:
      return { inlineConcernEducation: true };
    case 3:
      return { showScoreTeaserOnContact: true };
    case 4:
      return { showScoreTeaserOnContact: true };
    default: {
      const _exhaustive: never = hotspot;
      return _exhaustive;
    }
  }
}

function templateProposal(
  aggregate: QuizFunnelAggregate,
  analysis: QuizFunnelAnalysis,
): QuizVariantProposal | null {
  const hotspot = analysis.hotspotStep ?? aggregate.hotspotStep;
  if (!hotspot || hotspot === 4) return null;

  const stepOrder = reorderForHotspot(hotspot);
  const tweaks = tweaksForHotspot(hotspot);
  const hasReorder = stepOrder.join(",") !== DEFAULT_STEP_ORDER.join(",");

  const name = hasReorder
    ? `Lead with step ${stepOrder[0]} (${formatStepOrder(stepOrder)})`
    : `Optimize step ${hotspot} in-place`;

  const descriptions: Record<QuizStepId, string> = {
    1: "Visitors hesitate on personal info. Show concerns first to build trust before asking for age and savings.",
    2: "Concern selection stalls. Move contact earlier and surface inline education on the top friction concern.",
    3: "Contact form drop-off. Keep order but tease the retirement score before the final submit.",
    4: "Score step friction. Tease score value earlier in the flow.",
  };

  return {
    id: proposalId(),
    status: "pending",
    createdAt: new Date().toISOString(),
    rationale: [
      analysis.headline,
      analysis.summary,
      ...analysis.recommendations.slice(0, 2),
    ].join(" "),
    expectedLift: hotspot === 1 ? "8–15% completion lift" : "5–12% completion lift",
    confidence: analysis.confidence,
    hotspotStep: hotspot,
    controlStepOrder: DEFAULT_STEP_ORDER,
    proposed: {
      name,
      description: descriptions[hotspot],
      stepOrder,
      tweaks: Object.keys(tweaks).length > 0 ? tweaks : undefined,
    },
    analysisHeadline: analysis.headline,
  };
}

async function openAiProposal(
  aggregate: QuizFunnelAggregate,
  analysis: QuizFunnelAnalysis,
): Promise<QuizVariantProposal | null> {
  if (!isOpenAiConfigured()) return templateProposal(aggregate, analysis);

  const prompt = `You are a conversion-rate optimization expert for a retirement quiz funnel.

Funnel data:
${JSON.stringify(aggregate, null, 2)}

AI friction analysis:
${JSON.stringify(analysis, null, 2)}

Propose ONE quiz variant to test against control. Control order is modules 1→2→3→4 (About, Concerns, Contact, Score). Module 4 must stay last.

Return JSON only:
{
  "name": "short variant name",
  "description": "why this helps conversion",
  "stepOrder": [1,2,3,4] permutation with 4 last,
  "tweaks": { "showScoreTeaserOnContact": boolean?, "inlineConcernEducation": boolean? },
  "rationale": "2-3 sentences for marketer",
  "expectedLift": "e.g. 5-10% completion lift",
  "confidence": "high"|"medium"|"low"
}`;

  try {
    const parsed = await openAiChatCompletionJson<{
      name: string;
      description: string;
      stepOrder: number[];
      tweaks?: QuizVariantTweaks;
      rationale: string;
      expectedLift: string;
      confidence: "high" | "medium" | "low";
    }>({
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: prompt },
      ],
    }, { feature: "quiz-variant-proposal" });
    if (!parsed) return templateProposal(aggregate, analysis);

    const order = parsed.stepOrder;
    if (
      order.length !== 4 ||
      order[3] !== 4 ||
      new Set(order).size !== 4 ||
      !order.every((n) => n >= 1 && n <= 4)
    ) {
      return templateProposal(aggregate, analysis);
    }

    return {
      id: proposalId(),
      status: "pending",
      createdAt: new Date().toISOString(),
      rationale: parsed.rationale,
      expectedLift: parsed.expectedLift,
      confidence: parsed.confidence,
      hotspotStep: analysis.hotspotStep,
      controlStepOrder: DEFAULT_STEP_ORDER,
      proposed: {
        name: parsed.name,
        description: parsed.description,
        stepOrder: order as [QuizStepId, QuizStepId, QuizStepId, QuizStepId],
        tweaks: parsed.tweaks,
      },
      analysisHeadline: analysis.headline,
    };
  } catch {
    return templateProposal(aggregate, analysis);
  }
}

export async function generateQuizVariantProposal(
  aggregate: QuizFunnelAggregate,
  analysis: QuizFunnelAnalysis,
  options?: { useAi?: boolean },
): Promise<QuizVariantProposal | null> {
  if (!aggregate.hotspotStep && !analysis.hotspotStep) return null;
  if (options?.useAi === true && isOpenAiConfigured()) {
    return openAiProposal(aggregate, analysis);
  }
  return templateProposal(aggregate, analysis);
}
