import type { DemoSession } from "./demo-auth";
import { getUnomiScope, isUnomiConfigured, sendUnomiContextRequest } from "./unomi-config";
import { logUnomiFailure } from "./logger";

const SCOPE = getUnomiScope();
export const DEMO_PLATFORM_SOURCE = "demo_platform";

export type DemoUnomiIdentity = Pick<DemoSession, "demoUserId" | "username">;

function demoProfileProperties(identity: DemoUnomiIdentity): Record<string, unknown> {
  return {
    demoUserId: identity.demoUserId,
    demoUsername: identity.username,
    profileKind: "demo_tester",
    lastDemoActivityAt: new Date().toISOString(),
  };
}

export async function sendDemoEventToUnomi(
  identity: DemoUnomiIdentity,
  eventType: string,
  properties: Record<string, unknown>,
): Promise<{ ok: boolean; profileId?: string; processedEvents?: number }> {
  if (!isUnomiConfigured()) return { ok: false };

  const result = await sendUnomiContextRequest(
    identity.demoUserId,
    identity.demoUserId,
    [
      {
        eventType,
        scope: SCOPE,
        timeStamp: new Date().toISOString(),
        properties: {
          ...properties,
          demoUserId: identity.demoUserId,
          demoUsername: identity.username,
          analyticsChannel: "demo_usage",
        },
      },
    ],
    DEMO_PLATFORM_SOURCE,
    demoProfileProperties(identity),
  );

  if (!result.ok) {
    logUnomiFailure("demo telemetry", {
      operation: "demo event",
      eventType,
      demoUserId: identity.demoUserId,
      status: result.status,
      error: result.error,
    });
  }

  return {
    ok: result.ok,
    profileId: result.profileId,
    processedEvents: result.processedEvents,
  };
}

export async function searchDemoTesterProfiles(limit = 50): Promise<{
  ok: boolean;
  profiles: Array<Record<string, unknown>>;
  totalSize: number;
  source: "unomi" | "local";
}> {
  if (!isUnomiConfigured()) {
    return { ok: true, profiles: [], totalSize: 0, source: "local" };
  }

  const { unomiAdminFetch } = await import("./unomi-config");
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
          propertyValue: "demo_tester",
        },
      },
    }),
  });

  if (!res?.ok) {
    return { ok: false, profiles: [], totalSize: 0, source: "unomi" };
  }

  const data = (await res.json()) as {
    list?: Array<Record<string, unknown>>;
    totalSize?: number;
  };

  return {
    ok: true,
    profiles: data.list ?? [],
    totalSize: data.totalSize ?? 0,
    source: "unomi",
  };
}
