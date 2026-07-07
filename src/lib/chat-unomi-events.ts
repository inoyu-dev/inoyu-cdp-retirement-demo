import type { QuizChatMessage, SmsMessage } from "./types";

export const CHAT_BODY_PREVIEW_MAX = 480;

export function chatBodyPreview(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= CHAT_BODY_PREVIEW_MAX) return trimmed;
  return `${trimmed.slice(0, CHAT_BODY_PREVIEW_MAX)}…`;
}

export function quizChatMessageProperties(message: QuizChatMessage): Record<string, unknown> {
  return {
    messageId: message.id,
    role: message.role,
    step: message.step,
    mode: message.mode,
    channel: "quiz",
    bodyPreview: chatBodyPreview(message.body),
    bodyLength: message.body.length,
    timestamp: message.timestamp,
  };
}

export function smsChatMessageProperties(
  message: SmsMessage,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    messageId: message.id,
    role: message.role,
    channel: "sms",
    bodyPreview: chatBodyPreview(message.body),
    bodyLength: message.body.length,
    timestamp: message.timestamp,
    ...extra,
  };
}

export function dashboardAgentMessageProperties(
  role: "user" | "assistant",
  content: string,
  meta?: {
    toolsUsed?: string[];
    dataSource?: string;
    focusProfileId?: string | null;
  },
): Record<string, unknown> {
  return {
    role,
    channel: "dashboard_agent",
    bodyPreview: chatBodyPreview(content),
    bodyLength: content.length,
    timestamp: new Date().toISOString(),
    focusProfileId: meta?.focusProfileId ?? null,
    toolsUsed: meta?.toolsUsed,
    dataSource: meta?.dataSource,
  };
}
