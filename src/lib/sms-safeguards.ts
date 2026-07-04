const MAX_SMS_LENGTH = 320;

const FORBIDDEN_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /guaranteed|guarantee/i, reason: "guarantee language" },
  { pattern: /risk[\s-]?free/i, reason: "risk-free claim" },
  { pattern: /act now|limited time|expires today|don't miss/i, reason: "urgency pressure" },
  { pattern: /\b(buy|sell)\s+(now|today|immediately)\b/i, reason: "trading directive" },
  { pattern: /you should invest in|put your money in/i, reason: "specific investment advice" },
  { pattern: /double your money|get rich/i, reason: "hype promise" },
  { pattern: /prescription|diagnose|medical advice/i, reason: "medical claim" },
  { pattern: /https?:\/\//i, reason: "raw URL" },
  { pattern: /\b(SSN|social security number)\b/i, reason: "sensitive identifier" },
];

export interface SmsSafeguardResult {
  ok: boolean;
  text: string;
  reasons: string[];
  truncated: boolean;
}

export function sanitizeSmsReply(raw: string): SmsSafeguardResult {
  const reasons: string[] = [];
  let text = raw
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return { ok: false, text: "", reasons: ["empty response"], truncated: false };
  }

  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) reasons.push(reason);
  }

  const questionMarks = (text.match(/\?/g) ?? []).length;
  if (questionMarks > 1) reasons.push("multiple questions");

  let truncated = false;
  if (text.length > MAX_SMS_LENGTH) {
    text = `${text.slice(0, MAX_SMS_LENGTH - 1).trim()}…`;
    truncated = true;
  }

  return { ok: reasons.length === 0, text, reasons, truncated };
}
