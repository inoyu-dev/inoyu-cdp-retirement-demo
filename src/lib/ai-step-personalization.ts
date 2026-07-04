import { QUIZ_STEPS } from "./quiz-flow";
import { CONCERN_LABELS, SAVINGS_LABELS } from "./quiz";
import { willingnessLabel, type StepWillingness, type StepWillingnessSnapshot } from "./step-willingness";
import type { AppLocale } from "./i18n/types";
import type { QuizPartialAnswers, StepPersonalization, VisitorProfile } from "./types";
import { isOpenAiConfigured, openAiChatCompletionJson } from "./openai-config";

const LOCALE_AI_NAMES: Record<AppLocale, string> = {
  en: "English",
  es: "Spanish",
  zh: "Simplified Chinese",
  fr: "French",
  ja: "Japanese",
};

function stepTitle(step: number): string {
  return QUIZ_STEPS.find((s) => s.id === step)?.title ?? `Step ${step}`;
}

function buildTemplatePersonalization(
  step: number,
  partial: QuizPartialAnswers | undefined,
  snapshot: StepWillingnessSnapshot,
): StepPersonalization {
  const name = partial?.firstName?.trim() || "there";
  const willingness = snapshot.willingness;

  let tone: StepPersonalization["tone"] = "encourage";
  let nudge = "";

  if (willingness === "eager") {
    tone = "celebrate";
    nudge = `Nice momentum, ${name}! You're almost through ${stepTitle(step).toLowerCase()} — your free score is just ahead.`;
  } else if (willingness === "stalled") {
    tone = "reassure";
    nudge = `No rush, ${name}. Even a rough estimate on this step unlocks a score tailored to your timeline — most people finish in under a minute from here.`;
  } else if (willingness === "hesitant") {
    tone = "reassure";
    if (step === 1) {
      nudge = `${name}, the savings band is a range, not an exact number — pick what feels closest. Your score gets more useful with each field you fill.`;
    } else if (step === 2) {
      nudge = `There is no wrong concern to pick, ${name}. Choosing one helps us personalize your score — you can always read the optional topics first.`;
    } else if (step === 3) {
      nudge = `You're in control, ${name}. Pick how we follow up (or skip messages entirely) and we'll show your score next.`;
    } else {
      nudge = `Your score is a starting point, ${name} — not a grade. Take a breath and see what stands out; many people adjust one small thing and feel better.`;
    }
  } else {
    tone = "encourage";
    if (partial?.primaryConcern) {
      nudge = `You're doing great, ${name}. Next up: a score shaped around ${CONCERN_LABELS[partial.primaryConcern].toLowerCase()}.`;
    } else if (partial?.currentSavings) {
      nudge = `Keep going, ${name} — we'll factor in your ${SAVINGS_LABELS[partial.currentSavings].toLowerCase()} band when we calculate your readiness.`;
    } else {
      nudge = `You're on track, ${name}. A few more taps and your personalized retirement score is ready.`;
    }
  }

  return { nudge, tone, willingness };
}

function normalizePersonalization(
  raw: Partial<StepPersonalization>,
  fallback: StepPersonalization,
): StepPersonalization {
  const tone =
    raw.tone === "encourage" || raw.tone === "reassure" || raw.tone === "celebrate"
      ? raw.tone
      : fallback.tone;
  const willingness =
    raw.willingness === "eager" ||
    raw.willingness === "steady" ||
    raw.willingness === "hesitant" ||
    raw.willingness === "stalled"
      ? raw.willingness
      : fallback.willingness;

  return {
    nudge: typeof raw.nudge === "string" && raw.nudge.trim().length > 0 ? raw.nudge.trim() : fallback.nudge,
    tone,
    willingness,
  };
}

export async function generateStepPersonalization(
  profile: VisitorProfile,
  step: number,
  partial: QuizPartialAnswers | undefined,
  snapshot: StepWillingnessSnapshot,
): Promise<StepPersonalization> {
  const fallback = buildTemplatePersonalization(step, partial, snapshot);
  if (!isOpenAiConfigured()) return fallback;

  const lang = profile.preferredLanguage ?? "en";
  const langName = LOCALE_AI_NAMES[lang] ?? "English";

  const prompt = `Write a single short nudge (max 220 chars) to keep a pre-retiree moving through a retirement quiz step.

Visitor pace signal: ${willingnessLabel(snapshot.willingness)} (${snapshot.willingness})
- eager: affirm momentum, tease what's next
- steady: gentle encouragement tied to their answers
- hesitant: validate slowness, reduce friction, no pressure
- stalled: warm re-engagement, remind score is free and close

Write in ${langName}. Use their first name if known. No sales pitch.

Return JSON: { "nudge": string, "tone": "encourage"|"reassure"|"celebrate", "willingness": "${snapshot.willingness}" }

Step: ${step} — ${stepTitle(step)}
Partial answers: ${JSON.stringify(partial ?? {})}
Engagement: ${JSON.stringify({
    stepSeconds: snapshot.stepSeconds,
    idleSeconds: snapshot.idleSeconds,
    avgTypingIntervalMs: snapshot.avgTypingIntervalMs,
    backspaceRate: snapshot.backspaceRate,
    fieldsTouched: snapshot.fieldsTouched,
    engagementScore: snapshot.engagementScore,
  })}`;

  const parsed = await openAiChatCompletionJson<Partial<StepPersonalization>>({
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write empathetic micro-copy for older adults completing a retirement quiz. Plain language only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 120,
  }, { feature: "ai-step-personalization" });
  if (!parsed) return fallback;
  return normalizePersonalization(parsed, fallback);
}

export { buildTemplatePersonalization };
