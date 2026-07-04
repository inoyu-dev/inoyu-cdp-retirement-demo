import { randomUUID } from "crypto";
import { QUIZ_STEPS, type QuizStepId } from "./quiz-flow";
import type { AppLocale } from "./i18n/types";
import { CONCERN_LABELS } from "./quiz";
import { isOpenAiConfigured, openAiChatCompletionText } from "./openai-config";
import type {
  QuizChatMessage,
  QuizChatMode,
  QuizPartialAnswers,
  VisitorProfile,
} from "./types";

const QUIZ_AI_SYSTEM = `You are a warm AI retirement guide helping someone complete a 4-step readiness quiz.

Rules:
- They may not have finished the quiz yet — never ask for info the form already collects unless clarifying
- Answer in plain language for adults in their 50s–60s
- Validate worries before advising
- Keep replies under 420 characters
- Help them understand the current step, not sell products
- If they want a person, encourage the "Talk to a human" option in the chat panel
- End with at most ONE gentle follow-up question`;

function stepMeta(step: QuizStepId) {
  return QUIZ_STEPS.find((s) => s.id === step) ?? QUIZ_STEPS[0];
}

function displayName(partial: QuizPartialAnswers | undefined): string {
  const name = partial?.firstName?.trim();
  return name && name.length > 0 ? name : "there";
}

export function buildQuizChatWelcome(
  mode: QuizChatMode,
  step: QuizStepId,
  partial: QuizPartialAnswers | undefined,
): QuizChatMessage {
  const meta = stepMeta(step);
  const name = displayName(partial);

  const body =
    mode === "ai"
      ? `Hi ${name}! I'm your AI retirement guide. You're on step ${step} (${meta.title.toLowerCase()}). Ask me anything about this step or retirement planning — no pressure to rush.`
      : `Hi ${name} — you're connected to our team. A retirement specialist will reply in this chat, usually within a few minutes. What would you like help with on step ${step}?`;

  return {
    id: randomUUID(),
    role: mode === "ai" ? "ai" : "human",
    body,
    timestamp: new Date().toISOString(),
    step,
    mode,
  };
}

export function buildHumanAcknowledgment(
  step: QuizStepId,
  partial: QuizPartialAnswers | undefined,
): QuizChatMessage {
  const name = displayName(partial);
  return {
    id: randomUUID(),
    role: "human",
    body: `Thanks, ${name} — I've shared this with a specialist. They'll reply here as soon as they're available.`,
    timestamp: new Date().toISOString(),
    step,
    mode: "human",
  };
}

function pickQuizAiFallback(
  step: QuizStepId,
  partial: QuizPartialAnswers | undefined,
  userMessage: string,
): string {
  const name = displayName(partial);
  const msg = userMessage.trim().toLowerCase();
  const meta = stepMeta(step);

  if (msg.includes("human") || msg.includes("person") || msg.includes("someone")) {
    return `Absolutely, ${name}. Tap "Talk to a human" above and a specialist can pick up from here.`;
  }

  if (step === 1) {
    if (msg.includes("savings") || msg.includes("money")) {
      return `The savings bands are rough ranges — no exact balance needed, ${name}. Pick what feels closest; you can always talk through details later.`;
    }
    return `Step 1 is about you — name, age, timeline, and a savings range. It helps personalize your score, ${name}. What part feels unclear?`;
  }

  if (step === 2) {
    if (msg.includes("social security") || msg.includes("ss")) {
      return `Social Security timing is one of the biggest levers, ${name}. The optional reading above is a quick primer — want the short version here?`;
    }
    return `Step 2 is picking what worries you most, ${name}. There's no wrong answer — it helps us tailor your score and follow-up.`;
  }

  if (step === 3) {
    return `Step 3 sets your region and how we follow up, ${name}. You stay in control — choose email, messaging, or results on this page only.`;
  }

  if (step === 4) {
    return `Your score is a starting point, not a verdict, ${name}. Ask about any line on the results — or tap human chat if you'd like a person to walk through it.`;
  }

  return `Happy to help on ${meta.title.toLowerCase()}, ${name}. What feels most confusing right now?`;
}

export async function generateQuizAiReply(
  profile: VisitorProfile,
  step: QuizStepId,
  userMessage: string,
  partial: QuizPartialAnswers | undefined,
  history: QuizChatMessage[],
): Promise<string> {
  const fallback = pickQuizAiFallback(step, partial, userMessage);
  if (!isOpenAiConfigured()) return fallback;

  const meta = stepMeta(step);
  const name = displayName(partial);
  const thread = history
    .filter((m) => m.mode === "ai")
    .slice(-8)
    .map((m) => {
      const label = m.role === "visitor" ? "Visitor" : "AI guide";
      return `${label}: ${m.body}`;
    })
    .join("\n");

  const contextLines = [
    `Current quiz step: ${step} — ${meta.title} (${meta.hint})`,
    `Visitor name: ${name}`,
    partial?.age ? `Age: ${partial.age}` : null,
    partial?.retireYears ? `Years to retirement: ${partial.retireYears}` : null,
    partial?.primaryConcern
      ? `Concern so far: ${CONCERN_LABELS[partial.primaryConcern]}`
      : null,
    profile.preferredLanguage ? `UI language: ${profile.preferredLanguage}` : null,
    profile.detectedRegion ? `Detected region: ${profile.detectedRegion}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const langHint = profile.preferredLanguage ?? "en";
  const localeNames: Record<AppLocale, string> = {
    en: "English",
    es: "Spanish",
    zh: "Simplified Chinese",
    fr: "French",
    ja: "Japanese",
  };

  const reply = await openAiChatCompletionText({
    messages: [
      {
        role: "system",
        content: `${QUIZ_AI_SYSTEM}\n\nReply in ${localeNames[langHint] ?? "English"}.\n\nContext:\n${contextLines}`,
      },
      {
        role: "user",
        content: `Conversation:\n${thread}\n\nVisitor just wrote: ${userMessage}\n\nWrite the next AI guide reply:`,
      },
    ],
    temperature: 0.55,
    max_tokens: 200,
  }, { feature: "quiz-chat" });
  if (!reply || reply.length > 500) return fallback;
  return reply;
}
