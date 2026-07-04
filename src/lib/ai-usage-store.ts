import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  estimateAiUsageCostUsd,
  getAiUsageCostRates,
  type AiUsageFeature,
  type AiUsageRecord,
  type AiUsageSnapshot,
  type AiUsageTotals,
} from "./ai-usage-types";
import { getOpenAiModel, getOpenAiProviderLabel } from "./openai-config";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "ai-usage.json");

export type { AiUsageFeature, AiUsageRecord, AiUsageSnapshot, AiUsageTotals } from "./ai-usage-types";
export { AI_USAGE_FEATURE_LABELS } from "./ai-usage-types";

interface AiUsageStore {
  records: AiUsageRecord[];
}

const EMPTY_TOTALS: AiUsageTotals = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  requestCount: 0,
};

async function readStore(): Promise<AiUsageStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(STORE_FILE, "utf8")) as AiUsageStore;
  } catch {
    return { records: [] };
  }
}

async function writeStore(store: AiUsageStore): Promise<void> {
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2));
}

function addTotals(base: AiUsageTotals, record: AiUsageRecord): AiUsageTotals {
  return {
    promptTokens: base.promptTokens + record.promptTokens,
    completionTokens: base.completionTokens + record.completionTokens,
    totalTokens: base.totalTokens + record.totalTokens,
    requestCount: base.requestCount + 1,
  };
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export async function recordAiUsage(input: {
  feature: AiUsageFeature;
  model?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
}): Promise<void> {
  const promptTokens = Math.max(0, Math.floor(input.promptTokens));
  const completionTokens = Math.max(0, Math.floor(input.completionTokens));
  const totalTokens = Math.max(
    0,
    Math.floor(input.totalTokens ?? promptTokens + completionTokens),
  );

  if (promptTokens === 0 && completionTokens === 0 && totalTokens === 0) {
    return;
  }

  const record: AiUsageRecord = {
    id: randomUUID(),
    feature: input.feature,
    model: input.model?.trim() || getOpenAiModel(),
    promptTokens,
    completionTokens,
    totalTokens,
    timestamp: new Date().toISOString(),
  };

  const store = await readStore();
  store.records.unshift(record);
  store.records = store.records.slice(0, 500);
  await writeStore(store);
}

export async function getAiUsageSnapshot(): Promise<AiUsageSnapshot> {
  const store = await readStore();
  const rates = getAiUsageCostRates();
  let totals = { ...EMPTY_TOTALS };
  let today = { ...EMPTY_TOTALS };
  const byFeature: AiUsageSnapshot["byFeature"] = {};

  for (const record of store.records) {
    totals = addTotals(totals, record);
    if (isToday(record.timestamp)) {
      today = addTotals(today, record);
    }
    const featureTotals = byFeature[record.feature] ?? { ...EMPTY_TOTALS };
    byFeature[record.feature] = addTotals(featureTotals, record);
  }

  return {
    totals,
    today,
    byFeature,
    recentCalls: store.records.slice(0, 20),
    estimatedCostUsd: estimateAiUsageCostUsd(totals.promptTokens, totals.completionTokens, rates),
    estimatedCostTodayUsd: estimateAiUsageCostUsd(today.promptTokens, today.completionTokens, rates),
    costRates: rates,
    model: getOpenAiModel(),
    provider: getOpenAiProviderLabel(),
    updatedAt: new Date().toISOString(),
  };
}
