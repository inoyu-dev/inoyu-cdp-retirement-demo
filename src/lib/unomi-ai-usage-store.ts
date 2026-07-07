/**
 * Durable AI usage records on Apache Unomi for serverless (Vercel).
 */
import { UNOMI_AI_USAGE_JSON_KEY } from "./app-identity";
import type { AiUsageRecord } from "./ai-usage-types";
import { logId, logUnomiFailure } from "./logger";
import { isUnomiConfigured, unomiAdminFetch } from "./unomi-config";

export const AI_USAGE_RECORD_KIND = "ai_usage_record";
const RECORD_JSON_KEY = UNOMI_AI_USAGE_JSON_KEY;

function parseStoredRecord(raw: unknown): AiUsageRecord | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as AiUsageRecord;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.feature !== "string" ||
      typeof parsed.timestamp !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function syncAiUsageRecordToUnomi(record: AiUsageRecord): Promise<boolean> {
  if (!isUnomiConfigured()) return false;

  const res = await unomiAdminFetch("/cxs/profiles", {
    method: "POST",
    body: JSON.stringify({
      itemId: record.id,
      itemType: "profile",
      properties: {
        profileKind: AI_USAGE_RECORD_KIND,
        [RECORD_JSON_KEY]: JSON.stringify(record),
        feature: record.feature,
        model: record.model,
        totalTokens: record.totalTokens,
        timestamp: record.timestamp,
      },
    }),
  });

  if (!res?.ok) {
    logUnomiFailure("ai usage sync", {
      operation: "POST /cxs/profiles",
      recordId: logId(record.id),
      feature: record.feature,
      status: res?.status,
    });
  }
  return Boolean(res?.ok);
}

export async function listAiUsageRecordsFromUnomi(limit = 500): Promise<AiUsageRecord[]> {
  if (!isUnomiConfigured()) return [];

  const res = await unomiAdminFetch("/cxs/profiles/search", {
    method: "POST",
    body: JSON.stringify({
      offset: 0,
      limit,
      sortby: "lastVisit:desc",
      condition: {
        type: "profilePropertyCondition",
        parameterValues: {
          propertyName: "properties.profileKind",
          comparisonOperator: "equals",
          propertyValue: AI_USAGE_RECORD_KIND,
        },
      },
    }),
  });

  if (!res?.ok) return [];

  const data = (await res.json()) as {
    list?: Array<{ properties?: Record<string, unknown> }>;
  };

  const records: AiUsageRecord[] = [];
  for (const row of data.list ?? []) {
    const parsed = parseStoredRecord(row.properties?.[RECORD_JSON_KEY]);
    if (parsed) records.push(parsed);
  }

  return records.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
