import { randomUUID } from "crypto";
import { UNOMI_SOURCE_VISITOR, resolveUnomiScope } from "../../../scripts/app-identity.mjs";

export function getUnomiConfig() {
  return {
    baseUrl: (process.env.UNOMI_BASE_URL || "").replace(/\/+$/, ""),
    scope: resolveUnomiScope(),
    username: process.env.UNOMI_USERNAME || "karaf",
    password: process.env.UNOMI_PASSWORD || "karaf",
    tenantToken: process.env.UNOMI_TENANT_PUBLIC_TOKEN || "",
  };
}

export function unomiHeaders(config = getUnomiConfig()) {
  const h = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization:
      "Basic " + Buffer.from(config.username + ":" + config.password).toString("base64"),
  };
  if (config.tenantToken) h["X-Unomi-Api-Key"] = config.tenantToken;
  return h;
}

export const SAMPLE_EVENT_TYPES = [
  ["view", { page: "integration-test", trafficSource: "direct" }],
  ["quizStepView", { step: 1 }],
  ["quizChatMessage", { role: "visitor", channel: "quiz", bodyPreview: "integration test" }],
];

export async function sendUnomiContext(sessionId, profileId, events, sourceItemId = UNOMI_SOURCE_VISITOR) {
  const config = getUnomiConfig();
  const res = await fetch(
    config.baseUrl + "/cxs/context.json?sessionId=" + encodeURIComponent(sessionId),
    {
      method: "POST",
      headers: unomiHeaders(config),
      body: JSON.stringify({
        profileId,
        source: { itemId: sourceItemId, itemType: "page", scope: config.scope },
        requiredProfileProperties: ["*"],
        requireSegments: true,
        requireScores: true,
        events: events.map((event) => ({
          ...event,
          scope: config.scope,
          source: { itemId: sourceItemId, itemType: "page", scope: config.scope },
        })),
      }),
    },
  );
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, data };
}

export async function checkUnomiAdmin() {
  const config = getUnomiConfig();
  const res = await fetch(config.baseUrl + "/cxs/profiles/count", {
    headers: unomiHeaders(config),
  });
  return { ok: res.ok, status: res.status };
}

export async function checkUnomiContextEmpty() {
  const config = getUnomiConfig();
  const res = await fetch(
    config.baseUrl + "/cxs/context.json?sessionId=" + encodeURIComponent("integration-probe-" + Date.now()),
    {
      method: "POST",
      headers: unomiHeaders(config),
      body: JSON.stringify({
        source: { itemId: "integration_probe", itemType: "page", scope: config.scope },
        events: [],
      }),
    },
  );
  return { ok: res.ok, status: res.status };
}

export async function getUnomiProfile(profileId) {
  const config = getUnomiConfig();
  const res = await fetch(config.baseUrl + "/cxs/profiles/" + encodeURIComponent(profileId), {
    headers: unomiHeaders(config),
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null };
}

export async function searchUnomiProfiles(limit = 3) {
  const config = getUnomiConfig();
  const res = await fetch(config.baseUrl + "/cxs/profiles/search", {
    method: "POST",
    headers: unomiHeaders(config),
    body: JSON.stringify({
      text: "",
      offset: 0,
      limit,
      condition: { type: "matchAllCondition" },
    }),
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null };
}

export async function searchUnomiEvents(profileId, limit = 10) {
  const config = getUnomiConfig();
  const res = await fetch(config.baseUrl + "/cxs/events/search", {
    method: "POST",
    headers: unomiHeaders(config),
    body: JSON.stringify({
      offset: 0,
      limit,
      sortby: "timeStamp:desc",
      condition: {
        type: "eventPropertyCondition",
        parameterValues: {
          propertyName: "profileId",
          comparisonOperator: "equals",
          propertyValue: profileId,
        },
      },
    }),
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null };
}

export async function ingestSampleEvents() {
  const sessionId = "integration-" + Date.now();
  const localProfileId = randomUUID();
  let unomiProfileId = null;
  let processedTotal = 0;
  const failures = [];

  for (const [type, properties] of SAMPLE_EVENT_TYPES) {
    const result = await sendUnomiContext(sessionId, localProfileId, [
      { eventType: type, properties },
    ]);
    if (!result.ok) failures.push({ type, status: result.status });
    unomiProfileId = result.data.profileId ?? unomiProfileId;
    processedTotal += Array.isArray(result.data.processedEvents)
      ? result.data.processedEvents.length
      : Number(result.data.processedEvents) || 0;
  }

  return { sessionId, localProfileId, unomiProfileId, processedTotal, failures };
}
