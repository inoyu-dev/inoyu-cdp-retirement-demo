#!/usr/bin/env node
import { randomUUID } from "crypto";

import { UNOMI_SOURCE_VISITOR, resolveUnomiScope } from "./app-identity.mjs";
const args = process.argv.slice(2);
const shouldRegisterSchemas = args.includes("--register-schemas");
const unomiBase = (process.env.UNOMI_BASE_URL || "").replace(/\/+$/, "");
const scope = resolveUnomiScope();
const user = process.env.UNOMI_USERNAME || "karaf";
const adminPass = process.env.UNOMI_PASSWORD || "karaf";
const results = [];

function okLine(label, detail) {
  results.push({ ok: true, label, detail });
  console.log("OK " + label + (detail ? " - " + detail : ""));
}
function warnLine(label, detail) {
  results.push({ ok: "warn", label, detail });
  console.warn("WARN " + label + (detail ? " - " + detail : ""));
}
function failLine(label, detail) {
  results.push({ ok: false, label, detail });
  console.error("FAIL " + label + (detail ? " - " + detail : ""));
}

function headers() {
  const h = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: "Basic " + Buffer.from(user + ":" + adminPass).toString("base64"),
  };
  if (process.env.UNOMI_TENANT_PUBLIC_TOKEN) h["X-Unomi-Api-Key"] = process.env.UNOMI_TENANT_PUBLIC_TOKEN;
  return h;
}

function buildSchema(name, props = {}) {
  return {
    $id: "https://inoyu.dev/schemas/json/events/" + name + "/1-0-0",
    $schema: "https://json-schema.org/draft/2019-09/schema",
    self: { vendor: "dev.inoyu", target: "events", name, format: "jsonschema", version: "1-0-0" },
    title: name + "Event",
    type: "object",
    allOf: [{ $ref: "https://unomi.apache.org/schemas/json/event/1-0-0" }],
    properties: {
      source: { $ref: "https://unomi.apache.org/schemas/json/item/1-0-0" },
      properties: {
        type: "object",
        properties: Object.fromEntries(Object.entries(props).map(([k, t]) => [k, { type: ["null", t] }])),
        additionalProperties: true,
      },
    },
    unevaluatedProperties: false,
  };
}


const DEMO_EVENT_TYPES = [
  ["demoLogin", { username: "string", loginCount: "number", returnVisit: "object" }],
  ["demoLogout", {}],
  ["demoSessionStart", { browserSessionId: "string", path: "string" }],
  ["demoPageView", { path: "string", browserSessionId: "string" }],
  ["demoPageDwell", { path: "string", seconds: "number", scrollDepthPct: "number" }],
  ["demoMouseActivity", { path: "string", moveCount: "number", clickCount: "number" }],
  ["demoSessionHeartbeat", { path: "string", activeSeconds: "number" }],
  ["demoQuizSessionLinked", { visitorProfileId: "string", visitorSessionId: "string" }],
  ["demoQuizCompleted", { visitorProfileId: "string", score: "number", contactChannel: "string" }],
];

const APP_EVENT_TYPES = [
  ["view", { page: "string", trafficSource: "string" }],
  ["quizVariantAssigned", { variantId: "string" }],
  ["contentEngagement", { topic: "string", dwellSeconds: "number" }],
  ["quizStepView", { step: "number" }],
  ["quizStepEngagement", { step: "number", durationSeconds: "number" }],
  ["quizEngagementSummary", { rollup: "object" }],
  ["quizCompleted", { score: "number" }],
  ["quizChatOpened", { step: "number", mode: "string", channel: "string" }],
  ["humanChatRequested", { step: "number", channel: "string" }],
  ["quizChatMessage", { role: "string", step: "number", mode: "string", channel: "string", bodyPreview: "string" }],
  ["smsStarted", { messageId: "string", channel: "string" }],
  ["smsChatMessage", { role: "string", channel: "string", bodyPreview: "string" }],
  ["smsReply", { leadMessage: "string", channel: "string" }],
  ["conversion", { conversionType: "string" }],
  ["dashboardAgentMessage", { role: "string", channel: "string", bodyPreview: "string" }],
];

async function sendContext(sessionId, profileId, events, sourceItemId = UNOMI_SOURCE_VISITOR) {
  const res = await fetch(unomiBase + "/cxs/context.json?sessionId=" + encodeURIComponent(sessionId), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      profileId,
      source: { itemId: sourceItemId, itemType: "page", scope },
      requiredProfileProperties: ["*"],
      requireSegments: true,
      requireScores: true,
      events: events.map((event) => ({ ...event, scope, source: { itemId: sourceItemId, itemType: "page", scope } })),
    }),
  });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }
  return { ok: res.ok, status: res.status, data, raw: text.slice(0, 200) };
}

async function checkConnectivity() {
  if (!unomiBase) { failLine("Unomi configured", "UNOMI_BASE_URL not set"); return false; }
  const admin = await fetch(unomiBase + "/cxs/profiles/count", { headers: headers() });
  if (!admin.ok) { failLine("Unomi admin API", "HTTP " + admin.status); return false; }
  okLine("Unomi admin API", "/cxs/profiles/count");
  const ctx = await sendContext("connectivity-" + Date.now(), undefined, []);
  if (!ctx.ok) { failLine("Unomi context API", "HTTP " + ctx.status + " " + ctx.raw); return false; }
  okLine("Unomi context API", "scope=" + scope);
  return true;
}

async function registerEventSchemas() {
  let ok = 0;
  for (const [name, props] of [...APP_EVENT_TYPES, ...DEMO_EVENT_TYPES]) {
    const res = await fetch(unomiBase + "/cxs/jsonSchema", { method: "POST", headers: headers(), body: JSON.stringify(buildSchema(name, props)) });
    if (res.ok) ok += 1; else failLine("Register schema " + name, "HTTP " + res.status);
  }
  const totalTypes = APP_EVENT_TYPES.length + DEMO_EVENT_TYPES.length;
  if (ok === totalTypes) okLine("Event JSON schemas", ok + " registered");
}

async function verifyEventIngestion() {
  const sessionId = "verify-events-" + Date.now();
  const appProfileId = randomUUID();
  let unomiProfileId = null, processedTotal = 0, httpFailures = 0;
  for (const [type, props] of [...APP_EVENT_TYPES, ...DEMO_EVENT_TYPES]) {
    const properties = {};
    for (const [k, t] of Object.entries(props)) {
      if (t === "string") properties[k] = "integration-test";
      else if (t === "number") properties[k] = 1;
      else if (t === "object") properties[k] = { test: true };
    }
    const ctx = await sendContext(sessionId, appProfileId, [{ eventType: type, properties }]);
    if (!ctx.ok) { httpFailures += 1; failLine("HTTP accept " + type, "HTTP " + ctx.status); continue; }
    unomiProfileId = ctx.data.profileId ?? unomiProfileId;
    processedTotal += Array.isArray(ctx.data.processedEvents) ? ctx.data.processedEvents.length : Number(ctx.data.processedEvents) || 0;
  }
  const totalTypes = APP_EVENT_TYPES.length + DEMO_EVENT_TYPES.length;
  if (httpFailures === 0) okLine("Context HTTP acceptance", totalTypes + " event types returned 200");
  else warnLine("Context HTTP acceptance", httpFailures + " types failed");
  if (processedTotal > 0) okLine("Event processing", processedTotal + " events processed by Unomi");
  else warnLine("Event processing", "processedEvents=0 for all types - events not persisted on Unomi server");
  return { unomiProfileId, processedTotal };
}

async function verifyRetrieval({ unomiProfileId, processedTotal }) {
  if (!unomiProfileId) { warnLine("Profile retrieval", "No profileId returned from context"); return; }
  const prof = await fetch(unomiBase + "/cxs/profiles/" + encodeURIComponent(unomiProfileId), { headers: headers() });
  if (prof.ok) okLine("Profile GET", unomiProfileId); else failLine("Profile GET", "HTTP " + prof.status);
  const search = await fetch(unomiBase + "/cxs/profiles/search", { method: "POST", headers: headers(), body: JSON.stringify({ text: "", offset: 0, limit: 3, condition: { type: "matchAllCondition" } }) });
  if (search.ok) okLine("Profile search", (await search.json()).totalSize + " profiles indexed");
  else failLine("Profile search", "HTTP " + search.status);
  const events = await fetch(unomiBase + "/cxs/events/search", { method: "POST", headers: headers(), body: JSON.stringify({ offset: 0, limit: 20, sortby: "timeStamp:desc", condition: { type: "eventPropertyCondition", parameterValues: { propertyName: "profileId", comparisonOperator: "equals", propertyValue: unomiProfileId } } }) });
  if (!events.ok) { failLine("Event search", "HTTP " + events.status); return; }
  const total = (await events.json()).totalSize ?? 0;
  if (processedTotal > 0 && total > 0) okLine("Event search", total + " events for profile");
  else if (processedTotal === 0 && total === 0) warnLine("Event search", "0 events - Unomi is not storing/indexing events yet");
  else if (processedTotal > 0 && total === 0) failLine("Event search", "Events processed but not searchable");
  else okLine("Event search", String(total) + " events");
}

console.log("Unomi integration verification -> " + (unomiBase || "(not configured)") + "\n");
if (!(await checkConnectivity())) process.exit(1);
if (shouldRegisterSchemas) { console.log("\nRegistering JSON schemas..."); await registerEventSchemas(); }
console.log("\nTesting event ingestion...");
const ingest = await verifyEventIngestion();
console.log("\nTesting retrieval...");
await verifyRetrieval(ingest);
const hardFails = results.filter((r) => r.ok === false).length;
const warnings = results.filter((r) => r.ok === "warn").length;
console.log("\nSummary: " + (results.length - hardFails - warnings) + " passed, " + warnings + " warnings, " + hardFails + " failed");
process.exit(hardFails > 0 ? 1 : 0);
