export type AiUsageFeature =
  | "ai-summary"
  | "ai-funnel-analysis"
  | "quiz-chat"
  | "sms-agent"
  | "quiz-variant-proposal"
  | "dashboard-agent";

export const AI_USAGE_FEATURE_LABELS: Record<AiUsageFeature, string> = {
  "ai-summary": "Visitor summaries",
  "ai-funnel-analysis": "Funnel analysis",
  "quiz-chat": "Quiz chat",
  "sms-agent": "SMS replies",
  "quiz-variant-proposal": "Quiz variant proposals",
  "dashboard-agent": "Dashboard agent",
};

export interface AiUsageRecord {
  id: string;
  feature: AiUsageFeature;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: string;
}

export interface AiUsageTotals {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface AiUsageCostRates {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  configured: boolean;
}

export interface AiUsageSnapshot {
  totals: AiUsageTotals;
  today: AiUsageTotals;
  byFeature: Partial<Record<AiUsageFeature, AiUsageTotals>>;
  recentCalls: AiUsageRecord[];
  estimatedCostUsd: number;
  estimatedCostTodayUsd: number;
  costRates: AiUsageCostRates;
  model: string;
  provider: string;
  updatedAt: string;
}

export function getAiUsageCostRates(): AiUsageCostRates {
  const inputRaw = process.env.OPENAI_COST_INPUT_PER_MTOK?.trim();
  const outputRaw = process.env.OPENAI_COST_OUTPUT_PER_MTOK?.trim();
  if (inputRaw && outputRaw) {
    const inputPerMillionUsd = Number(inputRaw);
    const outputPerMillionUsd = Number(outputRaw);
    if (Number.isFinite(inputPerMillionUsd) && Number.isFinite(outputPerMillionUsd)) {
      return { inputPerMillionUsd, outputPerMillionUsd, configured: true };
    }
  }
  return { inputPerMillionUsd: 0.15, outputPerMillionUsd: 0.6, configured: false };
}

export function estimateAiUsageCostUsd(
  promptTokens: number,
  completionTokens: number,
  rates: AiUsageCostRates = getAiUsageCostRates(),
): number {
  const inputCost = (promptTokens / 1_000_000) * rates.inputPerMillionUsd;
  const outputCost = (completionTokens / 1_000_000) * rates.outputPerMillionUsd;
  return inputCost + outputCost;
}
