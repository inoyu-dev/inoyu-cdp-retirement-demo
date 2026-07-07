/**
 * Durable visitor profile storage on Apache Unomi for serverless (Vercel).
 * Local JSON / in-memory stores are per-instance; Unomi admin POST persists across requests.
 */
import { isUnomiConfigured, unomiAdminFetch } from "./unomi-config";
import { logId, logUnomiFailure } from "./logger";
import type { VisitorProfile } from "./types";
import { UNOMI_PROFILE_JSON_KEY } from "./app-identity";
import { dedupeVisitorProfiles, mergeVisitorProfiles } from "./visitor-profile-merge";

export const VISITOR_PROFILE_KIND = "visitor_session";
const PROFILE_JSON_KEY = UNOMI_PROFILE_JSON_KEY;

function remoteProfileId(profile: VisitorProfile): string {
  return profile.profileId;
}

function parseStoredProfile(raw: unknown): VisitorProfile | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as VisitorProfile;
    if (typeof parsed.profileId !== "string" || typeof parsed.sessionId !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function summarizeForIndex(profile: VisitorProfile): Record<string, unknown> {
  return {
    profileKind: VISITOR_PROFILE_KIND,
    [PROFILE_JSON_KEY]: JSON.stringify(profile),
    visitorProfileId: profile.profileId,
    visitorSessionId: profile.sessionId,
    firstName: profile.quiz?.firstName ?? null,
    leadScore: profile.leadScore ?? 0,
    quizCompleted: Boolean(profile.quiz?.completedAt),
    quizScore: profile.quiz?.score ?? null,
    trafficSource: profile.trafficSource,
    updatedAt: profile.updatedAt,
  };
}

async function parseUnomiJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function syncVisitorProfileToUnomi(profile: VisitorProfile): Promise<boolean> {
  if (!isUnomiConfigured()) return false;

  const remote = await getVisitorProfileFromUnomi(profile.profileId);
  const merged = remote ? mergeVisitorProfiles(remote, profile) : profile;
  const itemId = remoteProfileId(merged);

  const res = await unomiAdminFetch("/cxs/profiles", {
    method: "POST",
    body: JSON.stringify({
      itemId,
      itemType: "profile",
      properties: summarizeForIndex(merged),
    }),
  });

  if (!res?.ok) {
    const body = res ? await res.text().catch(() => "") : "";
    logUnomiFailure("profile sync", {
      operation: "POST /cxs/profiles",
      profileId: logId(profile.profileId),
      sessionId: logId(profile.sessionId),
      itemId: logId(itemId),
      status: res?.status,
      error: body.slice(0, 200) || (res ? res.statusText : "no response"),
    });
  }

  return Boolean(res?.ok);
}

async function readRemoteProfileRow(
  row: { properties?: Record<string, unknown> } | null | undefined,
): Promise<VisitorProfile | null> {
  return parseStoredProfile(row?.properties?.[PROFILE_JSON_KEY]);
}

export async function getVisitorProfileFromUnomi(profileId: string): Promise<VisitorProfile | null> {
  if (!isUnomiConfigured()) return null;

  const direct = await unomiAdminFetch(`/cxs/profiles/${encodeURIComponent(profileId)}`);
  if (direct?.ok && direct.status !== 204) {
    const row = await parseUnomiJson<{ properties?: Record<string, unknown> }>(direct);
    const parsed = await readRemoteProfileRow(row);
    if (parsed) return parsed;
  }

  const search = await unomiAdminFetch("/cxs/profiles/search", {
    method: "POST",
    body: JSON.stringify({
      offset: 0,
      limit: 1,
      condition: {
        type: "profilePropertyCondition",
        parameterValues: {
          propertyName: "properties.visitorProfileId",
          comparisonOperator: "equals",
          propertyValue: profileId,
        },
      },
    }),
  });
  if (!search?.ok) return null;
  const data = await parseUnomiJson<{ list?: Array<{ properties?: Record<string, unknown> }> }>(search);
  return readRemoteProfileRow(data?.list?.[0]);
}

export async function getVisitorProfileBySessionFromUnomi(
  sessionId: string,
): Promise<VisitorProfile | null> {
  if (!isUnomiConfigured() || !sessionId.trim()) return null;

  const res = await unomiAdminFetch("/cxs/profiles/search", {
    method: "POST",
    body: JSON.stringify({
      offset: 0,
      limit: 10,
      condition: {
        type: "profilePropertyCondition",
        parameterValues: {
          propertyName: "properties.visitorSessionId",
          comparisonOperator: "equals",
          propertyValue: sessionId,
        },
      },
    }),
  });
  if (!res?.ok) return null;

  const data = await parseUnomiJson<{
    list?: Array<{ properties?: Record<string, unknown> }>;
  }>(res);
  const parsed = (data?.list ?? [])
    .map((row) => parseStoredProfile(row.properties?.[PROFILE_JSON_KEY]))
    .filter((row): row is VisitorProfile => row !== null);

  return dedupeVisitorProfiles(parsed)[0] ?? null;
}

export async function listVisitorProfilesFromUnomi(limit = 200): Promise<VisitorProfile[]> {
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
          propertyValue: VISITOR_PROFILE_KIND,
        },
      },
    }),
  });

  if (!res?.ok) return [];

  const data = await parseUnomiJson<{
    list?: Array<{ properties?: Record<string, unknown> }>;
  }>(res);

  const profiles: VisitorProfile[] = [];
  for (const row of data?.list ?? []) {
    const parsed = parseStoredProfile(row.properties?.[PROFILE_JSON_KEY]);
    if (parsed) profiles.push(parsed);
  }

  return dedupeVisitorProfiles(profiles);
}
