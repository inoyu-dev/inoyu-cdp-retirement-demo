import { QUIZ_STEPS } from "./quiz-flow";
import {
  buildFunnelEvidenceSnippets,
  profilesAtStep,
} from "./quiz-funnel";
import type { QuizFunnelAggregate, QuizFunnelAnalysis, VisitorProfile } from "./types";
import { isOpenAiConfigured, openAiChatCompletionJson } from "./openai-config";

function stepContext(step: number): string {
  const meta = QUIZ_STEPS.find((s) => s.id === step);
  if (!meta) return `Step ${step}`;
  return `Step ${step}: ${meta.title} — ${meta.hint}`;
}

export function buildTemplateAnalysis(
  aggregate: QuizFunnelAggregate,
  profiles: VisitorProfile[],
): QuizFunnelAnalysis {
  const hotspot = aggregate.hotspotStep;
  const hotspotStats = hotspot ? aggregate.steps.find((s) => s.step === hotspot) : null;
  const evidence =
    hotspot !== null ? buildFunnelEvidenceSnippets(profiles, hotspot) : [];

  if (aggregate.totalVisitors === 0) {
    return {
      headline: "No quiz traffic yet",
      summary: "Once visitors start the quiz, step drop-offs and stall points will appear here with AI suggestions.",
      hotspotStep: null,
      hypotheses: [],
      recommendations: ["Share the quiz landing page and watch this panel during your demo."],
      confidence: "low",
      evidence: [],
    };
  }

  if (hotspot === null || !hotspotStats) {
    return {
      headline: "Funnel looks healthy so far",
      summary: `${aggregate.completed} of ${aggregate.totalVisitors} visitors finished the quiz (${Math.round(aggregate.completionRate * 100)}% completion). No step stands out as a friction hotspot yet.`,
      hotspotStep: null,
      hypotheses: ["Sample size is still small — patterns may shift as more visitors arrive."],
      recommendations: [
        "Keep monitoring active visitors per step during live campaigns.",
        "Compare completion rate by traffic source once you have 10+ sessions.",
      ],
      confidence: "low",
      evidence,
    };
  }

  const hypotheses: string[] = [];
  const recommendations: string[] = [];

  if (hotspot === 1) {
    hypotheses.push("Personal questions (name, age, savings band) may feel invasive before trust is established.");
    recommendations.push("Add a one-line reassurance above the form about privacy and why you ask.");
    recommendations.push("Consider moving the savings dropdown after they see value on step 2.");
  }

  if (hotspot === 2) {
    hypotheses.push("Choosing a primary concern may feel like a high-stakes decision without enough context.");
    hypotheses.push("Optional reading accordion might distract instead of helping some visitors move forward.");
    recommendations.push("Shorten concern labels or add a 'Not sure yet' option.");
    recommendations.push("Surface one educational snippet inline instead of hiding both topics in accordion.");
  }

  if (hotspot === 3) {
    hypotheses.push("Region override plus channel choice creates multiple decisions on one screen.");
    hypotheses.push("Email + phone + channel opt-in can feel like a lead form wall before they see their score.");
    recommendations.push("Split region confirmation from contact channel, or default channel from region.");
    recommendations.push("Show a preview of the score they'll unlock on the next step.");
  }

  if (hotspotStats.avgDurationSeconds !== null && hotspotStats.avgDurationSeconds > 90) {
    hypotheses.push(
      `Visitors spend ~${hotspotStats.avgDurationSeconds}s here — possible confusion or comparison shopping.`,
    );
  }

  if (hotspotStats.activeNow >= 2) {
    hypotheses.push(
      `${hotspotStats.activeNow} visitors are on this step right now — they may be stuck, not just slow.`,
    );
  }

  const abandoned = profilesAtStep(profiles, hotspot, "abandoned");
  const lowComfort = abandoned.filter(
    (p) =>
      p.quizEngagement?.stepSummaries.find((s) => s.step === hotspot)?.technicalComfort ===
        "low" ||
      p.quizEngagement?.stepSummaries.find((s) => s.step === hotspot)?.pointerComfort === "low",
  ).length;

  if (lowComfort >= 1 && abandoned.length >= 1) {
    hypotheses.push("Pointer or typing comfort signals suggest UI may be hard to use on this step.");
    recommendations.push("Increase tap targets and simplify inputs on this step for older audiences.");
  }

  if (hotspotStats.dropOffRate >= 0.3) {
    hypotheses.push(
      `${Math.round(hotspotStats.dropOffRate * 100)}% drop-off at this step — well above typical quiz friction.`,
    );
  }

  return {
    headline: `Friction hotspot: ${aggregate.hotspotLabel ?? `step ${hotspot}`}`,
    summary: `${hotspotStats.entered} visitors reached ${stepContext(hotspot)}. ${hotspotStats.activeNow} active now, ${hotspotStats.abandoned} abandoned here. Completion rate overall is ${Math.round(aggregate.completionRate * 100)}%.`,
    hotspotStep: hotspot,
    hypotheses: hypotheses.slice(0, 4),
    recommendations: recommendations.slice(0, 4),
    confidence: aggregate.totalVisitors >= 5 ? "medium" : "low",
    evidence,
  };
}

function normalizeAnalysis(
  raw: Partial<QuizFunnelAnalysis>,
  fallback: QuizFunnelAnalysis,
): QuizFunnelAnalysis {
  const pickList = (value: unknown, fb: string[]): string[] => {
    if (!Array.isArray(value)) return fb;
    const cleaned = value.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
    return cleaned.length > 0 ? cleaned.slice(0, 5) : fb;
  };

  const confidence =
    raw.confidence === "high" || raw.confidence === "medium" || raw.confidence === "low"
      ? raw.confidence
      : fallback.confidence;

  return {
    headline: typeof raw.headline === "string" ? raw.headline : fallback.headline,
    summary: typeof raw.summary === "string" ? raw.summary : fallback.summary,
    hotspotStep:
      typeof raw.hotspotStep === "number" && raw.hotspotStep >= 1 && raw.hotspotStep <= 4
        ? raw.hotspotStep
        : fallback.hotspotStep,
    hypotheses: pickList(raw.hypotheses, fallback.hypotheses),
    recommendations: pickList(raw.recommendations, fallback.recommendations),
    confidence,
    evidence: pickList(raw.evidence, fallback.evidence),
  };
}

export async function generateAiFunnelAnalysis(
  aggregate: QuizFunnelAggregate,
  profiles: VisitorProfile[],
): Promise<QuizFunnelAnalysis> {
  const fallback = buildTemplateAnalysis(aggregate, profiles);
  if (!isOpenAiConfigured() || aggregate.totalVisitors === 0) {
    return fallback;
  }

  const hotspot = aggregate.hotspotStep;
  const hotspotStats = hotspot ? aggregate.steps.find((s) => s.step === hotspot) : null;
  const evidence = hotspot !== null ? buildFunnelEvidenceSnippets(profiles, hotspot) : [];

  const stalledProfiles = hotspot
    ? profilesAtStep(profiles, hotspot, "abandoned")
        .concat(profilesAtStep(profiles, hotspot, "active"))
        .slice(0, 8)
        .map((p) => ({
          trafficSource: p.trafficSource,
          preferredLanguage: p.preferredLanguage,
          detectedRegion: p.detectedRegion,
          partialQuiz: p.quiz
            ? {
                firstName: p.quiz.firstName,
                age: p.quiz.age,
                primaryConcern: p.quiz.primaryConcern,
              }
            : null,
          stepEngagement: p.quizEngagement?.stepSummaries.find((s) => s.step === hotspot),
          funnel: p.quizFunnel,
        }))
    : [];

  const prompt = `You are a conversion analyst for a retirement readiness quiz (4 steps).

Analyze funnel aggregate data and visitor behavior to explain WHY visitors stall or abandon at a step.

Return JSON only with:
- headline (string, for marketing dashboard)
- summary (string, 2-3 sentences)
- hotspotStep (number 1-4 or null)
- hypotheses (array of 3-5 strings): plausible UX/copy/trust reasons for friction at the hotspot
- recommendations (array of 3-5 strings): concrete changes to test
- confidence ("high" | "medium" | "low")
- evidence (array of short strings citing patterns from the data)

Funnel aggregate:
${JSON.stringify(aggregate, null, 2)}

Hotspot step context:
${hotspot ? stepContext(hotspot) : "none detected"}

Behavior snippets:
${JSON.stringify(evidence, null, 2)}

Sample stalled visitor profiles at hotspot:
${JSON.stringify(stalledProfiles, null, 2)}`;

  const parsed = await openAiChatCompletionJson<Partial<QuizFunnelAnalysis>>({
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You diagnose quiz funnel friction for pre-retiree audiences. Be specific, empathetic to older users, and actionable for marketers. No jargon.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
  }, { feature: "ai-funnel-analysis" });
  if (!parsed) return fallback;
  return normalizeAnalysis(parsed, fallback);
}
