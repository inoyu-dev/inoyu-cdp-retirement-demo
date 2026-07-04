#!/usr/bin/env node
/**
 * Verify OpenAI-compatible LLM + remote Unomi before a live demo.
 * Usage: cp .env.example .env.local  # fill values, then:
 *        node --env-file=.env.local scripts/verify-integrations.mjs
 */

const unomiBase = (process.env.UNOMI_BASE_URL || "").replace(/\/+$/, "");
const infomaniakProductId = (process.env.INFOMANIAK_AI_PRODUCT_ID || "").trim();
const openaiKey = (process.env.INFOMANIAK_API_TOKEN || process.env.OPENAI_API_KEY || "").trim();
function resolveLlmBaseUrl() {
  const explicit = (process.env.OPENAI_BASE_URL || "").replace(/\/+$/, "");
  if (explicit) return explicit;
  if (infomaniakProductId) {
    return `https://api.infomaniak.com/2/ai/${encodeURIComponent(infomaniakProductId)}/openai/v1`;
  }
  return "https://api.openai.com/v1";
}
const openaiBase = resolveLlmBaseUrl();
const openaiModel = process.env.OPENAI_MODEL || (infomaniakProductId ? "qwen3" : "gpt-4o-mini");
const scope = process.env.UNOMI_SCOPE || "itstoday";
const user = process.env.UNOMI_USERNAME || "karaf";
const pass = process.env.UNOMI_PASSWORD || "karaf";

function basicAuth(u, p) {
  return "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
}

function llmHeaders() {
  const headers = { Accept: "application/json" };
  const scheme = (process.env.OPENAI_AUTH_SCHEME || "Bearer").trim();
  if (scheme.toLowerCase() === "api-key") {
    headers["api-key"] = openaiKey;
  } else {
    headers.Authorization = `${scheme} ${openaiKey}`;
  }
  return headers;
}

function llmUrl(path) {
  const version = process.env.OPENAI_API_VERSION?.trim();
  const url = `${openaiBase}${path.startsWith("/") ? path : `/${path}`}`;
  if (!version) return url;
  return `${url}${url.includes("?") ? "&" : "?"}api-version=${encodeURIComponent(version)}`;
}

async function checkLlm() {
  if (!openaiKey) {
    console.log("LLM: SKIP (no API token set — INFOMANIAK_API_TOKEN or OPENAI_API_KEY)");
    return false;
  }
  const res = await fetch(llmUrl("/models"), { headers: llmHeaders() });
  if (res.ok) {
    console.log(`LLM: OK (${openaiBase}, model target: ${openaiModel})`);
    return true;
  }
  if (res.status === 404) {
    console.log(`LLM: OK (${openaiBase} configured — no /models endpoint)`);
    return true;
  }
  console.error(`LLM: FAIL (${res.status}) at ${openaiBase}`);
  return false;
}

async function checkUnomi() {
  if (!unomiBase) {
    console.log("Unomi: SKIP (UNOMI_BASE_URL not set)");
    return false;
  }
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: basicAuth(user, pass),
  };
  if (process.env.UNOMI_TENANT_PUBLIC_TOKEN) {
    headers["X-Unomi-Api-Key"] = process.env.UNOMI_TENANT_PUBLIC_TOKEN;
  }

  const admin = await fetch(`${unomiBase}/cxs/profiles/count`, { headers });
  if (!admin.ok) {
    console.error(`Unomi admin: FAIL (${admin.status}) — check UNOMI_USERNAME/PASSWORD`);
    return false;
  }
  console.log("Unomi admin: OK (/cxs/profiles/count)");

  const ctx = await fetch(`${unomiBase}/cxs/context.json?sessionId=verify-probe`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: { itemId: "integration_probe", itemType: "page", scope },
      events: [],
    }),
  });
  if (!ctx.ok) {
    console.error(`Unomi context: FAIL (${ctx.status}) — check scope "${scope}" and auth`);
    return false;
  }
  console.log(`Unomi context: OK (scope: ${scope})`);
  return true;
}

const llmOk = await checkLlm();
const unomiOk = await checkUnomi();

if (llmOk && unomiOk) {
  console.log("\nReady for live showcase.");
  process.exit(0);
}
console.log("\nFix the failures above or run in local-fallback mode.");
process.exit(llmOk || unomiOk ? 0 : 1);
