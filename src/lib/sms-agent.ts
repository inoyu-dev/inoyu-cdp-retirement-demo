import { randomUUID } from "crypto";
import { isOpenAiConfigured, openAiChatCompletionText } from "./openai-config";
import { sanitizeSmsReply } from "./sms-safeguards";
import type { AiSummary, SmsMessage, VisitorProfile } from "./types";
import { CONCERN_LABELS } from "./quiz";

const SMS_SYSTEM_PROMPT = `You are a warm, empathetic retirement guide texting a pre-retiree (50s–60s).

Voice:
- Personal: use their first name
- Validate feelings before giving advice ("That makes sense…", "A lot of people worry about…")
- Never shame their score or pressure them
- Under 320 characters per message
- End with ONE gentle question or clear soft CTA (reply YES, CALL, or ask what they prefer)
- Goal: keep the conversation going and move toward sending a guide or scheduling a call — only when they seem ready

Forbidden: hype, urgency ("act now"), jargon, multiple questions in one message, sounding like a bot, investment picks, guaranteed outcomes, URLs.`;

export type SmsReplySource = "ai" | "template";

export interface SmsReplyResult {
  body: string;
  source: SmsReplySource;
  safeguarded: boolean;
  fallbackReasons?: string[];
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function pickFollowUp(profile: VisitorProfile, userMessage: string): string {
  const quiz = profile.quiz;
  const firstName = quiz?.firstName ?? "there";
  const msg = normalize(userMessage);

  if (msg.includes("call") || msg === "call") {
    return `Thank you, ${firstName} — I appreciate you reaching out. We'll find a time that feels comfortable. Do mornings or afternoons usually work better for you?`;
  }

  if (msg.includes("send") || msg.includes("breakdown") || msg.includes("yes") || msg.includes("sure")) {
    return `Absolutely, ${firstName}. I'm putting together your ${quiz?.retireYears ?? 6}-year summary now — plain language, no fluff. If anything's unclear after you read it, just reply here. No pressure at all.`;
  }

  if (msg.includes("social security") || msg.includes("ss")) {
    return `That's a very common worry, ${firstName} — you're not alone. I can send a short guide on claiming ages, or we can talk it through on a quick call. Whatever feels easier for you?`;
  }

  if (msg.includes("401") || msg.includes("rollover") || msg.includes("fees")) {
    return `Good question, ${firstName}. Fees really do add up over time. I can send a simple checklist to compare your options — or reply CALL if you'd rather talk it through. Your call.`;
  }

  if (msg.includes("worried") || msg.includes("scared") || msg.includes("stress") || msg.includes("anxious")) {
    return `I hear you, ${firstName} — retirement decisions can feel heavy. You're already taking a smart step by looking into this. Would a short written guide help first, or would a quick conversation feel better?`;
  }

  const concern = quiz?.primaryConcern
    ? CONCERN_LABELS[quiz.primaryConcern].toLowerCase()
    : "retirement";
  return `Thanks for sharing that, ${firstName}. ${concern.charAt(0).toUpperCase() + concern.slice(1)} came up on your quiz too — so you're thinking about the right things. Would a short guide help, or would you rather chat with someone on our team?`;
}

function finalizeReply(raw: string, source: SmsReplySource): SmsReplyResult {
  const check = sanitizeSmsReply(raw);
  if (check.ok) {
    return { body: check.text, source, safeguarded: false, fallbackReasons: check.truncated ? ["truncated to 320 chars"] : undefined };
  }
  return {
    body: check.text || raw.slice(0, 320),
    source,
    safeguarded: true,
    fallbackReasons: check.reasons,
  };
}

function safeTemplateReply(profile: VisitorProfile, userMessage: string): SmsReplyResult {
  const template = pickFollowUp(profile, userMessage);
  const check = sanitizeSmsReply(template);
  return {
    body: check.text,
    source: "template",
    safeguarded: !check.ok,
    fallbackReasons: check.ok ? undefined : check.reasons,
  };
}

export function buildInitialSms(summary: AiSummary): SmsMessage {
  const check = sanitizeSmsReply(summary.suggestedOpener);
  return {
    id: randomUUID(),
    role: "agent",
    body: check.text || summary.suggestedOpener.slice(0, 320),
    timestamp: new Date().toISOString(),
  };
}

export async function generateAgentReply(
  profile: VisitorProfile,
  summary: AiSummary,
  userMessage: string,
  options?: { useAi?: boolean },
): Promise<SmsReplyResult> {
  const useAi = options?.useAi === true && isOpenAiConfigured();
  if (!useAi) return safeTemplateReply(profile, userMessage);

  const quiz = profile.quiz;
  const firstName = quiz?.firstName ?? "the visitor";
  const history = profile.smsThread
    .slice(-6)
    .map((m) => `${m.role === "agent" ? "Agent" : "Lead"}: ${m.body}`)
    .join("\n");

  const contextBlock = [
    `Name: ${firstName}`,
    quiz?.score !== null && quiz?.score !== undefined ? `Score: ${quiz.score}/100` : null,
    quiz?.primaryConcern ? `Top concern: ${CONCERN_LABELS[quiz.primaryConcern]}` : null,
    `Empathetic framing: ${summary.empatheticResponse}`,
    `Agent approach: ${summary.recommendedApproach}`,
  ]
    .filter(Boolean)
    .join("\n");

  const reply = await openAiChatCompletionText({
    messages: [
      { role: "system", content: `${SMS_SYSTEM_PROMPT}\n\nVisitor context:\n${contextBlock}` },
      {
        role: "user",
        content: `Conversation:\n${history}\n\nLead just wrote: ${userMessage}\n\nWrite the next agent message:`,
      },
    ],
    temperature: 0.5,
    max_tokens: 180,
  }, { feature: "sms-agent" });
  if (!reply) return safeTemplateReply(profile, userMessage);

  const finalized = finalizeReply(reply, "ai");
  if (finalized.safeguarded) {
    return safeTemplateReply(profile, userMessage);
  }
  return finalized;
}

export function detectConversion(message: string): VisitorProfile["conversionType"] | null {
  const msg = normalize(message);
  if (msg === "call" || msg.includes("schedule") || msg.includes("book a call")) {
    return "call_scheduled";
  }
  if (msg.includes("send") || msg.includes("breakdown") || msg.includes("guide")) {
    return "content_request";
  }
  return null;
}

export const SMS_SCENARIO_PRESETS = [
  { id: "call", label: "Book a call", message: "I'd like to schedule a call please" },
  { id: "guide", label: "Send guide", message: "Yes please send my breakdown" },
  { id: "ss", label: "Social Security worry", message: "I'm really worried about social security timing" },
  { id: "401k", label: "401(k) fees", message: "What about 401k rollover fees?" },
  { id: "anxious", label: "Feeling anxious", message: "Honestly I'm anxious I won't have enough" },
] as const;
